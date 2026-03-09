from django.db import models
from devices_app.models import Sensor


class SensorData(models.Model):
    data_id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='data')
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.sensor} = {self.value} at {self.recorded_at}"


class Threshold(models.Model):
    threshold_id = models.AutoField(primary_key=True)
    sensor = models.OneToOneField(Sensor, on_delete=models.CASCADE, related_name='threshold')
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"Threshold [{self.sensor}]: {self.min_value} ~ {self.max_value}"


class Alert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message
