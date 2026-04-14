from django.db import models
from django.conf import settings


class Threshold(models.Model):
    threshold_id = models.AutoField(primary_key=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)


    class Meta:
        db_table = 'thresholds'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return f"Threshold {self.threshold_id}: {self.min_value} ~ {self.max_value}"


class SensorData(models.Model):
    data_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(
        'devices_app.Device',
        on_delete=models.CASCADE,
        related_name='sensor_data',
        db_column='device_id',
    )
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sensor_data'
        managed = settings.MANAGED_DB_TABLES
        ordering = ['-recorded_at']

    def save(self, *args, **kwargs):
        # Normalize sensor value precision across all ingest paths.
        if self.value is not None:
            self.value = round(float(self.value), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Device {self.device_id} = {self.value} at {self.recorded_at}"


class Alert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    threshold = models.ForeignKey(
        Threshold,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
        db_column='threshold_id',
    )
    value = models.FloatField(null=True, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alerts'
        managed = settings.MANAGED_DB_TABLES
        ordering = ['-created_at']

    def __str__(self):
        return self.message
