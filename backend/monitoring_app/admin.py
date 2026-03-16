from django.contrib import admin
from .models import SensorData, Threshold, Alert


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ('data_id', 'sensor', 'value', 'unit', 'recorded_at')
    list_filter = ('sensor__sensor_type', 'sensor__device__room')
    search_fields = ('sensor__device__device_name',)
    ordering = ('-recorded_at',)
    readonly_fields = ('recorded_at',)


@admin.register(Threshold)
class ThresholdAdmin(admin.ModelAdmin):
    list_display = ('threshold_id', 'sensor', 'min_value', 'max_value')
    search_fields = ('sensor__device__device_name',)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'sensor', 'message', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('message', 'sensor__device__device_name')
    list_editable = ('is_read',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
