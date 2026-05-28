from django.urls import path
from . import views

urlpatterns = [
    # Upload
    path('uploads/', views.upload_file, name='upload-file'),
    path('uploads/list/', views.list_batches, name='list-batches'),
    path('uploads/<uuid:batch_id>/', views.batch_detail, name='batch-detail'),

    # Review Queue
    path('records/', views.review_queue, name='review-queue'),
    path('records/<uuid:record_id>/', views.update_record, name='update-record'),
    path('records/approve/', views.bulk_approve, name='bulk-approve'),
    path('records/reject/', views.bulk_reject, name='bulk-reject'),

    # Flags
    path('flags/resolve/', views.resolve_flags, name='resolve-flags'),

    # Audit
    path('audit-logs/', views.audit_logs, name='audit-logs'),

    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]
