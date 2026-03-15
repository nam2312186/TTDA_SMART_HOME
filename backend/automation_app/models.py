from django.db import models
from django.utils import timezone
from building_app.models import Room
from devices_app.models import Device


class Schedule(models.Model):
    SCOPE_DEVICE = 'device'
    SCOPE_ROOM = 'room'
    SCOPE_CHOICES = [
        (SCOPE_DEVICE, 'Device'),
        (SCOPE_ROOM, 'Room'),
    ]

    schedule_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, blank=True, default='')
    scope_type = models.CharField(max_length=20, choices=SCOPE_CHOICES, default=SCOPE_DEVICE)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='schedules', null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='schedules', null=True, blank=True)
    action = models.CharField(max_length=50)
    schedule_time = models.TimeField()
    repeat_type = models.CharField(max_length=50)
    days_of_week = models.JSONField(default=list, blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        target = self.device.device_name if self.device else self.room.room_name if self.room else 'Unknown'
        return f"{target} - {self.action} at {self.schedule_time}"
