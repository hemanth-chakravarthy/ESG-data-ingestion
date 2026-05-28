from rest_framework import serializers
from .models import UploadBatch, RawRecord, NormalizedRecord, ReviewFlag, AuditLog


class UploadBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadBatch
        fields = [
            'id', 'organization', 'uploaded_by', 'status',
            'total_rows', 'file_url', 'source_type',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'organization', 'uploaded_by', 'status',
            'total_rows', 'file_url', 'created_at', 'updated_at',
        ]


class UploadBatchListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = UploadBatch
        fields = [
            'id', 'status', 'total_rows', 'source_type',
            'uploaded_by_email', 'created_at',
        ]


class ReviewFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewFlag
        fields = ['id', 'flag_type', 'severity', 'resolved', 'created_at']


class NormalizedRecordSerializer(serializers.ModelSerializer):
    flags = ReviewFlagSerializer(many=True, read_only=True)
    raw_payload = serializers.JSONField(source='raw_record.payload', read_only=True)
    raw_row_number = serializers.IntegerField(source='raw_record.row_number', read_only=True)
    batch_id = serializers.UUIDField(source='raw_record.batch_id', read_only=True)

    class Meta:
        model = NormalizedRecord
        fields = [
            'id', 'scope', 'activity_type', 'consumption_value',
            'unit', 'date', 'review_status', 'locked',
            'flags', 'raw_payload', 'raw_row_number', 'batch_id',
            'created_at', 'updated_at',
        ]


class NormalizedRecordUpdateSerializer(serializers.ModelSerializer):
    """For analyst inline edits — only editable fields."""
    class Meta:
        model = NormalizedRecord
        fields = ['consumption_value', 'unit', 'date', 'scope', 'activity_type']


class BulkApproveSerializer(serializers.Serializer):
    record_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
    )


class ResolveFlagSerializer(serializers.Serializer):
    flag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
    )


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'actor_email', 'timestamp', 'details', 'record', 'batch']
