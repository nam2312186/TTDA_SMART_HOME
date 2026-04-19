from django.db import models

class Threshold(models.Model):
    threshold_id = models.AutoField(primary_key=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    require_motion = models.BooleanField(default=False)

    class Meta:
        db_table = "thresholds"
        managed = True

    def __str__(self):
        return f"Threshold {self.threshold_id}: Min={self.min_value}, Max={self.max_value}, Motion={self.require_motion}"

class SensorData(models.Model):
    data_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(
        'devices_app.Device',
        on_delete=models.CASCADE,
        related_name='sensor_data',
        db_column='device_id'
    )
    value = models.FloatField()
    unit = models.CharField(max_length=20, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sensor_data"
        ordering = ["-recorded_at"]
        managed = True

class Alert(models.Model):
    alert_id = models.AutoField(primary_key=True)
    threshold = models.ForeignKey(
        Threshold,
        on_delete=models.SET_NULL,
        related_name='alerts',
        null=True,
        blank=True,
        db_column='threshold_id'
    )
    value = models.FloatField(null=True, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "alerts"
        ordering = ["-created_at"]
        managed = True
