from django.db import models
from devices_app.models import Device


class SensorData(models.Model):
    data_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='sensor_data', null=True, blank=True)
    value = models.FloatField()
    metric = models.CharField(max_length=50, blank=True, default='')
    unit = models.CharField(max_length=20, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.device} = {self.value} at {self.recorded_at}"


class Threshold(models.Model):
    ACTION_NONE = 'none'
    ACTION_TURN_ON = 'turn_on'
    ACTION_TURN_OFF = 'turn_off'
    ACTION_TOGGLE = 'toggle'
    ACTION_CHOICES = [
        (ACTION_NONE, 'No action'),
        (ACTION_TURN_ON, 'Turn on'),
        (ACTION_TURN_OFF, 'Turn off'),
        (ACTION_TOGGLE, 'Toggle'),
    ]

    threshold_id = models.AutoField(primary_key=True)
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name='threshold', null=True, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    trigger_action = models.CharField(max_length=20, choices=ACTION_CHOICES, default=ACTION_NONE)
    target_device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trigger_thresholds'
    )

    def __str__(self):
        return f"Threshold [{self.device}]: {self.min_value} ~ {self.max_value}"


class Alert(models.Model):
    DIRECTION_LOW = 'low'
    DIRECTION_HIGH = 'high'
    DIRECTION_CHOICES = [
        (DIRECTION_LOW, 'Below minimum'),
        (DIRECTION_HIGH, 'Above maximum'),
    ]

    alert_id = models.AutoField(primary_key=True)
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='alerts',
        null=True,
        blank=True,
    )
    threshold = models.ForeignKey(Threshold, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    threshold_direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, null=True, blank=True)
    threshold_value = models.FloatField(null=True, blank=True)
    actual_value = models.FloatField(null=True, blank=True)
    metric = models.CharField(max_length=50, blank=True, default='')
    unit = models.CharField(max_length=20, blank=True, null=True)
    triggered_action = models.CharField(max_length=20, choices=Threshold.ACTION_CHOICES, default=Threshold.ACTION_NONE)
    target_device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_alerts'
    )
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message
