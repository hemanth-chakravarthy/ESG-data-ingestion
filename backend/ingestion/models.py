import uuid
from django.db import models
from accounts.models import Organization, User

class UploadBatch(models.Model):
    class Status(models.TextChoices):
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        
    class SourceType(models.TextChoices):
        SAP = 'SAP', 'SAP'
        UTILITY = 'UTILITY', 'Utility'
        TRAVEL = 'TRAVEL', 'Travel'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='batches')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)
    total_rows = models.IntegerField(default=0)
    file_url = models.URLField(max_length=1000)
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class RawRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        NORMALIZED = 'NORMALIZED', 'Normalized'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='raw_records')
    row_number = models.IntegerField()
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

class NormalizedRecord(models.Model):
    class Scope(models.TextChoices):
        SCOPE_1 = 'SCOPE_1', 'Scope 1'
        SCOPE_2 = 'SCOPE_2', 'Scope 2'
        SCOPE_3 = 'SCOPE_3', 'Scope 3'
        
    class ReviewStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_record = models.OneToOneField(RawRecord, on_delete=models.CASCADE, related_name='normalized_record')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='normalized_records')
    scope = models.CharField(max_length=20, choices=Scope.choices)
    activity_type = models.CharField(max_length=255)
    consumption_value = models.FloatField()
    unit = models.CharField(max_length=50)
    date = models.DateField()
    review_status = models.CharField(max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING)
    locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ReviewFlag(models.Model):
    class FlagType(models.TextChoices):
        NEGATIVE_VALUE = 'NEGATIVE_VALUE', 'Negative Value'
        OUTLIER = 'OUTLIER', 'Outlier'
        MISSING_DATA = 'MISSING_DATA', 'Missing Data'
        INVALID_DATE = 'INVALID_DATE', 'Invalid Date'
        
    class Severity(models.TextChoices):
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name='flags')
    flag_type = models.CharField(max_length=20, choices=FlagType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class AuditLog(models.Model):
    class Action(models.TextChoices):
        UPLOAD = 'UPLOAD', 'Upload'
        APPROVE = 'APPROVE', 'Approve'
        REJECT = 'REJECT', 'Reject'
        EDIT = 'EDIT', 'Edit'
        RESOLVE_FLAG = 'RESOLVE_FLAG', 'Resolve Flag'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(null=True, blank=True)
