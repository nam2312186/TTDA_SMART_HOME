import secrets
from django.db import models
from devices_app.models import Device


class IoTToken(models.Model):
    """Token xác thực cho thiết bị IoT gọi API."""
    token = models.CharField(max_length=64, unique=True, editable=False)
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name='iot_token')
    label = models.CharField(max_length=100, blank=True, help_text='Ghi chú (tên board, ESP32...)')
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.device.device_name} — {self.token[:12]}...'

    class Meta:
        verbose_name = 'IoT Token'
