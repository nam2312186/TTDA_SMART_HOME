from django.db import models
from users_app.models import User
from devices_app.models import Device


class ActivityLog(models.Model):
    SOURCE_USER = 'user'
    SOURCE_DEVICE = 'device'
    SOURCE_SYSTEM = 'system'
    SOURCE_CHOICES = [
        (SOURCE_USER, 'User'),
        (SOURCE_DEVICE, 'Device'),
        (SOURCE_SYSTEM, 'System'),
    ]

    log_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='logs', null=True, blank=True)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, related_name='logs', null=True, blank=True)
    source = models.CharField(max_length=16, choices=SOURCE_CHOICES, default=SOURCE_SYSTEM)
    category = models.CharField(max_length=32, default='system')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    action_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-action_time']

    def __str__(self):
        actor = self.user.username if self.user else self.source
        target = self.device.device_name if self.device else 'N/A'
        return f"{actor} - {self.action} - {target}"
