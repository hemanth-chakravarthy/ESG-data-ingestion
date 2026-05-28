from django.contrib import admin
from .models import UploadBatch, RawRecord, NormalizedRecord, ReviewFlag, AuditLog


@admin.register(UploadBatch)
class UploadBatchAdmin(admin.ModelAdmin):
    list_display = ['id', 'source_type', 'status', 'total_rows', 'uploaded_by', 'created_at']
    list_filter = ['status', 'source_type']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(RawRecord)
class RawRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'batch', 'row_number', 'status', 'created_at']
    list_filter = ['status']


@admin.register(NormalizedRecord)
class NormalizedRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'scope', 'activity_type', 'consumption_value', 'unit', 'date', 'review_status', 'locked']
    list_filter = ['review_status', 'scope', 'locked']


@admin.register(ReviewFlag)
class ReviewFlagAdmin(admin.ModelAdmin):
    list_display = ['id', 'record', 'flag_type', 'severity', 'resolved', 'created_at']
    list_filter = ['flag_type', 'severity', 'resolved']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'action', 'actor', 'timestamp']
    list_filter = ['action']
