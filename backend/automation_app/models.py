from django.db import models
from django.conf import settings
from devices_app.models import Device


class Schedule(models.Model):
    schedule_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='schedules', db_column='device_id', null=True, blank=True)
    action = models.CharField(max_length=50)
    schedule_time = models.TimeField()
    repeat_type = models.CharField(max_length=50)
    status = models.BooleanField(default=True)

    class Meta:
        db_table = 'schedule'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return f"{self.device.device_name} - {self.action} at {self.schedule_time}"
