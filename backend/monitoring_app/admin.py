from django.contrib import admin
from .models import SensorData, Threshold, Alert


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ('data_id', 'device', 'value', 'unit', 'recorded_at')
    list_filter = ('device__type__name_type', 'device__room')
    search_fields = ('device__device_name',)
    ordering = ('-recorded_at',)
    readonly_fields = ('recorded_at',)


@admin.register(Threshold)
class ThresholdAdmin(admin.ModelAdmin):
    list_display = ('threshold_id', 'min_value', 'max_value')


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'threshold', 'message', 'value', 'created_at')
    search_fields = ('message', 'threshold__devices__device_name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
