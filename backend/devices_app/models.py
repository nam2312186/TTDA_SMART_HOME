from django.db import models
from django.conf import settings


class Device(models.Model):
    TYPE_SENSOR = 'sensor'
    TYPE_ACTUATOR = 'actuator'
    TYPE_CHOICES = [
        (TYPE_SENSOR, 'Sensor'),
        (TYPE_ACTUATOR, 'Actuator'),
    ]

    device_id = models.AutoField(primary_key=True)
    device_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    room = models.ForeignKey(
        'building_app.Room',
        on_delete=models.CASCADE,
        related_name='devices',
        db_column='room_id'
    )
    status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'devices'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.device_name


class Sensor(models.Model):
    sensor_id = models.AutoField(primary_key=True)
    sensor_type = models.CharField(max_length=50)
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='sensors',
        db_column='device_id'
    )

    class Meta:
        db_table = 'sensors'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return f"{self.device.device_name} ({self.sensor_type})"
