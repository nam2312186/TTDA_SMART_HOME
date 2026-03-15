from django.db import models


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
    device_subtype = models.CharField(max_length=50, default='unknown')
    room = models.ForeignKey(
        'building_app.Room',
        on_delete=models.CASCADE,
        related_name='devices'
    )
    status = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=20, blank=True, null=True)
    current_value = models.FloatField(blank=True, null=True)
    last_reading_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.device_name


class Sensor(models.Model):
    sensor_id = models.AutoField(primary_key=True)
    sensor_type = models.CharField(max_length=50)
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='sensors'
    )

    def __str__(self):
        return f"{self.device.device_name} ({self.sensor_type})"
