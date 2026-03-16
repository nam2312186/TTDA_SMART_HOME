from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('log_id', 'user', 'device', 'action', 'action_time')
    list_filter = ('action',)
    search_fields = ('user__username', 'device__device_name', 'action')
    ordering = ('-action_time',)
    readonly_fields = ('action_time',)
