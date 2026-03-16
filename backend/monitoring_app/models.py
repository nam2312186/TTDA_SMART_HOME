from django.db import models
from django.conf import settings
from devices_app.models import Sensor


class SensorData(models.Model):
    data_id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='sensor_data', db_column='sensor_id', null=True, blank=True)
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sensor_data'
        managed = settings.MANAGED_DB_TABLES
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.sensor} = {self.value} at {self.recorded_at}"


class Threshold(models.Model):
    threshold_id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='thresholds', db_column='sensor_id', null=True, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'thresholds'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return f"Threshold [{self.sensor}]: {self.min_value} ~ {self.max_value}"


class Alert(models.Model):
    DIRECTION_LOW = 'low'
    DIRECTION_HIGH = 'high'

    alert_id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='alerts', db_column='sensor_id', null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alerts'
        managed = settings.MANAGED_DB_TABLES
        ordering = ['-created_at']

    def __str__(self):
        return self.message
