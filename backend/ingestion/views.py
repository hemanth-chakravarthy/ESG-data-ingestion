import os
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.db.models import Count, Q

from .models import UploadBatch, NormalizedRecord, ReviewFlag, AuditLog
from .serializers import (
    UploadBatchSerializer, UploadBatchListSerializer,
    NormalizedRecordSerializer, NormalizedRecordUpdateSerializer,
    BulkApproveSerializer, ResolveFlagSerializer,
    AuditLogSerializer,
)
from .tasks import process_upload


# ──────────────────────────────────────────────
# Upload Endpoints
# ──────────────────────────────────────────────

UPLOAD_DIR = os.path.join(settings.BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_file(request):
    """Upload a CSV/XLSX file for ingestion."""
    file = request.FILES.get('file')
    source_type = request.data.get('source_type')

    if not file:
        return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    if source_type not in ('SAP', 'UTILITY', 'TRAVEL'):
        return Response(
            {'detail': 'source_type must be one of: SAP, UTILITY, TRAVEL'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file extension
    ext = file.name.split('.')[-1].lower()
    if ext not in ('csv', 'xlsx', 'xls'):
        return Response(
            {'detail': 'File must be CSV or XLSX format.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save file locally (MVP — production would use S3)
    file_path = os.path.join(UPLOAD_DIR, f'{file.name}')
    with open(file_path, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    # Create batch record
    batch = UploadBatch.objects.create(
        organization=request.user.organization,
        uploaded_by=request.user,
        source_type=source_type,
        file_url=file_path,
        status=UploadBatch.Status.PROCESSING,
    )

    # Trigger async processing (or sync for MVP without Redis)
    try:
        process_upload.delay(str(batch.id))
    except Exception:
        # If Celery/Redis isn't running, process synchronously
        process_upload(str(batch.id))

    return Response(
        UploadBatchSerializer(batch).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_batches(request):
    """List all upload batches for the user's organization."""
    batches = UploadBatch.objects.filter(
        organization=request.user.organization
    ).order_by('-created_at')
    return Response(UploadBatchListSerializer(batches, many=True).data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def batch_detail(request, batch_id):
    """Get details for a specific batch or delete it."""
    try:
        batch = UploadBatch.objects.get(
            id=batch_id,
            organization=request.user.organization,
        )
    except UploadBatch.DoesNotExist:
        return Response({'detail': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        batch.delete()
        return Response({'detail': 'Batch deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

    data = UploadBatchSerializer(batch).data
    data['records_count'] = NormalizedRecord.objects.filter(raw_record__batch=batch).count()
    data['flags_count'] = ReviewFlag.objects.filter(record__raw_record__batch=batch, resolved=False).count()
    return Response(data)



# ──────────────────────────────────────────────
# Review Queue Endpoints
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def review_queue(request):
    """
    Get all normalized records for review.
    Supports filtering by: status, scope, batch_id, has_flags.
    """
    org = request.user.organization
    qs = NormalizedRecord.objects.filter(
        organization=org
    ).select_related('raw_record').prefetch_related('flags').order_by('-created_at')

    # Filters
    review_status = request.query_params.get('status')
    if review_status:
        qs = qs.filter(review_status=review_status.upper())

    scope = request.query_params.get('scope')
    if scope:
        qs = qs.filter(scope=scope.upper())

    batch_id = request.query_params.get('batch_id')
    if batch_id:
        qs = qs.filter(raw_record__batch_id=batch_id)

    has_flags = request.query_params.get('has_flags')
    if has_flags == 'true':
        qs = qs.filter(flags__resolved=False).distinct()

    return Response(NormalizedRecordSerializer(qs, many=True).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_record(request, record_id):
    """Edit a normalized record (only if not locked)."""
    try:
        record = NormalizedRecord.objects.get(
            id=record_id,
            organization=request.user.organization,
        )
    except NormalizedRecord.DoesNotExist:
        return Response({'detail': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if record.locked:
        return Response(
            {'detail': 'Record is locked and cannot be edited.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = NormalizedRecordUpdateSerializer(record, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)

    import datetime
    previous_data = {}
    for k in request.data.keys():
        if hasattr(record, k):
            val = getattr(record, k)
            if isinstance(val, (datetime.date, datetime.datetime)):
                previous_data[k] = val.isoformat()
            else:
                previous_data[k] = val

    # Create audit log before saving
    AuditLog.objects.create(
        record=record,
        action=AuditLog.Action.EDIT,
        actor=request.user,
        details={
            'changes': request.data,
            'previous': previous_data,
        },
    )

    serializer.save()
    return Response(NormalizedRecordSerializer(record).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_approve(request):
    """Approve multiple records at once — locks them."""
    serializer = BulkApproveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    record_ids = serializer.validated_data['record_ids']

    records = NormalizedRecord.objects.filter(
        id__in=record_ids,
        organization=request.user.organization,
        locked=False,
    )

    count = records.count()
    records.update(
        review_status=NormalizedRecord.ReviewStatus.APPROVED,
        locked=True,
    )

    # Create audit logs
    audit_logs = [
        AuditLog(
            record_id=rid,
            action=AuditLog.Action.APPROVE,
            actor=request.user,
        )
        for rid in record_ids
    ]
    AuditLog.objects.bulk_create(audit_logs)

    return Response({'approved': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_reject(request):
    """Reject multiple records."""
    serializer = BulkApproveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    record_ids = serializer.validated_data['record_ids']

    records = NormalizedRecord.objects.filter(
        id__in=record_ids,
        organization=request.user.organization,
        locked=False,
    )

    count = records.count()
    records.update(review_status=NormalizedRecord.ReviewStatus.REJECTED)

    audit_logs = [
        AuditLog(
            record_id=rid,
            action=AuditLog.Action.REJECT,
            actor=request.user,
        )
        for rid in record_ids
    ]
    AuditLog.objects.bulk_create(audit_logs)

    return Response({'rejected': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_flags(request):
    """Resolve review flags."""
    serializer = ResolveFlagSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    flag_ids = serializer.validated_data['flag_ids']

    flags = ReviewFlag.objects.filter(
        id__in=flag_ids,
        record__organization=request.user.organization,
    )

    count = flags.count()
    flags.update(resolved=True)

    # Audit logs for each resolved flag
    for flag in ReviewFlag.objects.filter(id__in=flag_ids):
        AuditLog.objects.create(
            record=flag.record,
            action=AuditLog.Action.RESOLVE_FLAG,
            actor=request.user,
            details={'flag_type': flag.flag_type, 'severity': flag.severity},
        )

    return Response({'resolved': count})


# ──────────────────────────────────────────────
# Audit Log Endpoints
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    """Get audit trail — filterable by record, batch, action."""
    org = request.user.organization
    qs = AuditLog.objects.filter(
        Q(record__organization=org) | Q(batch__organization=org)
    ).select_related('actor').order_by('-timestamp')

    record_id = request.query_params.get('record_id')
    if record_id:
        qs = qs.filter(record_id=record_id)

    batch_id = request.query_params.get('batch_id')
    if batch_id:
        qs = qs.filter(batch_id=batch_id)

    action = request.query_params.get('action')
    if action:
        qs = qs.filter(action=action.upper())

    return Response(AuditLogSerializer(qs[:100], many=True).data)


# ──────────────────────────────────────────────
# Dashboard Stats Endpoint
# ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Return aggregated stats for the dashboard."""
    org = request.user.organization
    records = NormalizedRecord.objects.filter(organization=org)
    flags = ReviewFlag.objects.filter(record__organization=org)
    batches = UploadBatch.objects.filter(organization=org)

    return Response({
        'total_batches': batches.count(),
        'total_records': records.count(),
        'pending_review': records.filter(review_status='PENDING').count(),
        'approved': records.filter(review_status='APPROVED').count(),
        'rejected': records.filter(review_status='REJECTED').count(),
        'unresolved_flags': flags.filter(resolved=False).count(),
        'resolved_flags': flags.filter(resolved=True).count(),
        'recent_batches': UploadBatchListSerializer(
            batches.order_by('-created_at')[:5], many=True
        ).data,
    })
