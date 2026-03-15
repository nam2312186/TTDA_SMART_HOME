from django.contrib import admin
from .models import Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('schedule_id', 'name', 'scope_type', 'device', 'room', 'action', 'schedule_time', 'repeat_type', 'status')
    list_filter = ('status', 'repeat_type', 'scope_type')
    list_editable = ('status',)
    search_fields = ('name', 'device__device_name', 'room__room_name')
