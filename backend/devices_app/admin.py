from django.contrib import admin
from .models import Device, Sensor


class SensorInline(admin.StackedInline):
    model = Sensor
    extra = 0
    fields = ('sensor_type',)


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('device_id', 'device_name', 'device_type', 'room', 'status', 'created_at')
    list_filter = ('device_type', 'status', 'room__floor__user')
    search_fields = ('device_name', 'room__room_name')
    list_editable = ('status',)
    ordering = ('room', 'device_name')
    inlines = [SensorInline]


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ('sensor_id', 'device', 'sensor_type')
    list_filter = ('sensor_type',)
    search_fields = ('device__device_name',)
