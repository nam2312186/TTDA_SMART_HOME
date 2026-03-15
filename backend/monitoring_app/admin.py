from django.contrib import admin
from .models import SensorData, Threshold, Alert


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ('data_id', 'device', 'metric', 'value', 'unit', 'recorded_at')
    list_filter = ('metric', 'device__room')
    search_fields = ('device__device_name',)
    ordering = ('-recorded_at',)
    readonly_fields = ('recorded_at',)


@admin.register(Threshold)
class ThresholdAdmin(admin.ModelAdmin):
    list_display = ('threshold_id', 'device', 'min_value', 'max_value', 'trigger_action', 'target_device')
    search_fields = ('device__device_name',)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'device', 'metric', 'actual_value', 'threshold_value', 'triggered_action', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('message', 'device__device_name')
    list_editable = ('is_read',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
