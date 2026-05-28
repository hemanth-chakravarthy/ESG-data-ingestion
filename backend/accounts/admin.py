from django.contrib import admin
from .models import Organization, User


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'created_at']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'role', 'organization', 'is_staff', 'created_at']
    list_filter = ['role', 'is_staff']
