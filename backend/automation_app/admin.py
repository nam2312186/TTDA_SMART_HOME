from django.contrib import admin
from .models import Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('schedule_id', 'device', 'action', 'schedule_time', 'repeat_type', 'status')
    list_filter = ('status', 'repeat_type')
    list_editable = ('status',)
    search_fields = ('device__device_name',)
