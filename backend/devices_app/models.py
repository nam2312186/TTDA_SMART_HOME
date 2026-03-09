from django.db import models


class Device(models.Model):
    device_id = models.AutoField(primary_key=True)
    device_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=50)
    room = models.ForeignKey(
        'building_app.Room',
        on_delete=models.CASCADE,
        related_name='devices'
    )
    status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

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