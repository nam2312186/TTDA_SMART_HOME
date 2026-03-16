from django.db import models
from django.conf import settings
from users_app.models import User
from devices_app.models import Device


class ActivityLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='logs', null=True, blank=True, db_column='user_id')
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, related_name='logs', null=True, blank=True, db_column='device_id')
    action = models.CharField(max_length=255)
    action_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_log'
        managed = settings.MANAGED_DB_TABLES
        ordering = ['-action_time']

    def __str__(self):
        actor = self.user.username if self.user else 'system'
        target = self.device.device_name if self.device else 'N/A'
        return f"{actor} - {self.action} - {target}"
