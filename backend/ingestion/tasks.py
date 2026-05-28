import io
import pandas as pd
from datetime import datetime
from celery import shared_task
from django.db import transaction

from .models import UploadBatch, RawRecord, NormalizedRecord, ReviewFlag, AuditLog


# ──────────────────────────────────────────────
# Source-type → scope/activity mapping helpers
# ──────────────────────────────────────────────

SOURCE_SCOPE_MAP = {
    'SAP': {
        'default_scope': NormalizedRecord.Scope.SCOPE_1,
        'activity_key': 'fuel_type',
        'value_key': 'quantity',
        'unit_key': 'unit',
        'date_key': 'date',
    },
    'UTILITY': {
        'default_scope': NormalizedRecord.Scope.SCOPE_2,
        'activity_key': 'meter_type',
        'value_key': 'consumption',
        'unit_key': 'unit',
        'date_key': 'billing_date',
    },
    'TRAVEL': {
        'default_scope': NormalizedRecord.Scope.SCOPE_3,
        'activity_key': 'booking_type',
        'value_key': 'expense_amount',
        'unit_key': 'currency',
        'date_key': 'departure_date',
    },
}


def _parse_date(value):
    """Attempt to parse a date from various formats."""
    if pd.isna(value) or value is None or str(value).strip() == '':
        return None
    value = str(value).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    # Try pandas parser as fallback
    try:
        return pd.to_datetime(value).date()
    except Exception:
        return None


def _parse_float(value):
    """Parse a numeric value, return None on failure."""
    if pd.isna(value) or value is None:
        return None
    try:
        return float(str(value).replace(',', '').strip())
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────────────
# Main ingestion task
# ──────────────────────────────────────────────

@shared_task(bind=True, max_retries=2)
def process_upload(self, batch_id: str):
    """
    Main Celery task: reads uploaded file content from the batch,
    parses rows, normalizes, and generates flags.
    """
    try:
        batch = UploadBatch.objects.get(id=batch_id)
    except UploadBatch.DoesNotExist:
        return {'error': f'Batch {batch_id} not found'}

    try:
        # ── Step 1: Read the file ──
        file_path = batch.file_url  # local path for MVP
        if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)

        # Clean column names
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

        batch.total_rows = len(df)
        batch.save(update_fields=['total_rows'])

        # ── Step 2: Create raw records ──
        raw_records = []
        for idx, row in df.iterrows():
            payload = row.where(pd.notnull(row), None).to_dict()
            # Convert numpy types to Python natives for JSON serialization
            clean_payload = {}
            for k, v in payload.items():
                if pd.isna(v):
                    clean_payload[k] = None
                elif hasattr(v, 'item'):  # numpy scalar
                    clean_payload[k] = v.item()
                else:
                    clean_payload[k] = v
            raw_records.append(RawRecord(
                batch=batch,
                row_number=idx + 1,
                payload=clean_payload,
                status=RawRecord.Status.PENDING,
            ))

        RawRecord.objects.bulk_create(raw_records)

        # ── Step 3: Normalize and flag ──
        source_config = SOURCE_SCOPE_MAP.get(batch.source_type, SOURCE_SCOPE_MAP['TRAVEL'])

        normalized_records = []
        flags_to_create = []

        for raw in RawRecord.objects.filter(batch=batch):
            payload = raw.payload
            scope = source_config['default_scope']

            # Extract fields
            activity = str(payload.get(source_config['activity_key'], '') or 'Unknown')
            raw_value = _parse_float(payload.get(source_config['value_key']))
            unit = str(payload.get(source_config['unit_key'], '') or 'Unknown')
            date = _parse_date(payload.get(source_config['date_key']))

            # Determine scope from booking_type for travel
            if batch.source_type == 'TRAVEL':
                booking = str(payload.get('booking_type', '')).lower()
                if booking in ('flight', 'air'):
                    scope = NormalizedRecord.Scope.SCOPE_3
                elif booking in ('hotel',):
                    scope = NormalizedRecord.Scope.SCOPE_3
                elif booking in ('rail', 'train'):
                    scope = NormalizedRecord.Scope.SCOPE_3
                elif booking in ('taxi', 'car', 'rideshare'):
                    scope = NormalizedRecord.Scope.SCOPE_3

            # Create normalized record
            norm = NormalizedRecord(
                raw_record=raw,
                organization=batch.organization,
                scope=scope,
                activity_type=activity,
                consumption_value=raw_value if raw_value is not None else 0.0,
                unit=unit,
                date=date if date else datetime.now().date(),
                review_status=NormalizedRecord.ReviewStatus.PENDING,
            )
            normalized_records.append(norm)

        NormalizedRecord.objects.bulk_create(normalized_records)

        # ── Step 4: Generate flags ──
        for norm in NormalizedRecord.objects.filter(raw_record__batch=batch):
            payload = norm.raw_record.payload

            # Flag: Negative value
            if norm.consumption_value < 0:
                flags_to_create.append(ReviewFlag(
                    record=norm,
                    flag_type=ReviewFlag.FlagType.NEGATIVE_VALUE,
                    severity=ReviewFlag.Severity.HIGH,
                ))

            # Flag: Missing data (zero or empty critical fields)
            if norm.consumption_value == 0.0:
                flags_to_create.append(ReviewFlag(
                    record=norm,
                    flag_type=ReviewFlag.FlagType.MISSING_DATA,
                    severity=ReviewFlag.Severity.MEDIUM,
                ))

            # Flag: Invalid/missing date
            date_raw = payload.get(source_config['date_key'])
            if not date_raw or _parse_date(date_raw) is None:
                flags_to_create.append(ReviewFlag(
                    record=norm,
                    flag_type=ReviewFlag.FlagType.INVALID_DATE,
                    severity=ReviewFlag.Severity.HIGH,
                ))

            # Flag: Missing unit
            unit_raw = payload.get(source_config['unit_key'])
            if not unit_raw or str(unit_raw).strip() == '':
                flags_to_create.append(ReviewFlag(
                    record=norm,
                    flag_type=ReviewFlag.FlagType.MISSING_DATA,
                    severity=ReviewFlag.Severity.MEDIUM,
                ))

        if flags_to_create:
            ReviewFlag.objects.bulk_create(flags_to_create)

        # ── Step 5: Check for duplicates ──
        _detect_duplicates(batch)

        # Mark raw records as normalized
        RawRecord.objects.filter(batch=batch).update(status=RawRecord.Status.NORMALIZED)

        # Mark batch as completed
        batch.status = UploadBatch.Status.COMPLETED
        batch.save(update_fields=['status'])

        # Create audit log
        AuditLog.objects.create(
            batch=batch,
            action=AuditLog.Action.UPLOAD,
            actor=batch.uploaded_by,
            details={
                'total_rows': batch.total_rows,
                'source_type': batch.source_type,
                'flags_generated': len(flags_to_create),
            },
        )

        return {
            'batch_id': str(batch.id),
            'total_rows': batch.total_rows,
            'flags': len(flags_to_create),
            'status': 'COMPLETED',
        }

    except Exception as exc:
        batch.status = UploadBatch.Status.FAILED
        batch.save(update_fields=['status'])
        raise self.retry(exc=exc, countdown=10)


def _detect_duplicates(batch):
    """
    Detect duplicate rows by comparing payload hashes within the same batch.
    """
    import hashlib
    import json

    seen = {}
    flags = []

    for norm in NormalizedRecord.objects.filter(raw_record__batch=batch).select_related('raw_record'):
        payload_str = json.dumps(norm.raw_record.payload, sort_keys=True, default=str)
        payload_hash = hashlib.md5(payload_str.encode()).hexdigest()

        if payload_hash in seen:
            flags.append(ReviewFlag(
                record=norm,
                flag_type=ReviewFlag.FlagType.OUTLIER,  # Using OUTLIER for duplicates
                severity=ReviewFlag.Severity.MEDIUM,
            ))
        else:
            seen[payload_hash] = norm.id

    if flags:
        ReviewFlag.objects.bulk_create(flags)
