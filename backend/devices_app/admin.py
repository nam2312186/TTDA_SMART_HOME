from django.contrib import admin
from .models import Device, DeviceType


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('device_id', 'device_name', 'type', 'room', 'status', 'created_at')
    list_filter = ('type', 'status', 'room__floor')
    search_fields = ('device_name', 'room__room_name')
    list_editable = ('status',)
    ordering = ('room', 'device_name')


@admin.register(DeviceType)
class DeviceTypeAdmin(admin.ModelAdmin):
    list_display = ('type_id', 'name_type')
