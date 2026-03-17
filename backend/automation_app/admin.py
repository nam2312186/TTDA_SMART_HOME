from django.contrib import admin
from .models import Schedule, AutomationRule, IsMonitor


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('schedule_id', 'room', 'action', 'schedule_time', 'repeat_type', 'status')
    list_filter = ('status', 'repeat_type')
    list_editable = ('status',)
    search_fields = ('room__room_name',)


@admin.register(AutomationRule)
class AutomationRuleAdmin(admin.ModelAdmin):
    list_display = ('rule_id', 'threshold', 'action', 'status')
    list_filter = ('status',)
    search_fields = ('action',)


@admin.register(IsMonitor)
class IsMonitorAdmin(admin.ModelAdmin):
    list_display = ('device', 'rule')
    search_fields = ('device__device_name', 'rule__action')
