from django.db import models
from django.conf import settings


class DeviceType(models.Model):
    type_id = models.AutoField(primary_key=True)
    name_type = models.CharField(max_length=100)

    class Meta:
        db_table = 'device_type'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.name_type


class Device(models.Model):
    device_id = models.AutoField(primary_key=True)
    device_name = models.CharField(max_length=255)
    type = models.ForeignKey(
        DeviceType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='devices',
        db_column='type_id',
    )
    room = models.ForeignKey(
        'building_app.Room',
        on_delete=models.CASCADE,
        related_name='devices',
        db_column='room_id',
    )
    status = models.BooleanField(default=False)
    brightness = models.IntegerField(default=0)  # For light actuators: 0-255
    threshold = models.ForeignKey(
        'monitoring_app.Threshold',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='devices',
        db_column='threshold_id',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'devices'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.device_name
