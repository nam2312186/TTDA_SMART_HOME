from django.db import models
from users_app.models import User
from devices_app.models import Device


class ActivityLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logs')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=255)
    action_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-action_time']

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.device.device_name}"
