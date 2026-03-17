from django.db import models
from django.conf import settings


class Schedule(models.Model):
    schedule_id = models.AutoField(primary_key=True)
    room = models.ForeignKey(
        'building_app.Room',
        on_delete=models.CASCADE,
        related_name='schedules',
        db_column='room_id',
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=50)
    schedule_time = models.TimeField()
    repeat_type = models.CharField(max_length=50)
    status = models.BooleanField(default=True)

    class Meta:
        db_table = 'schedule'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        room_name = self.room.room_name if self.room else 'N/A'
        return f"{room_name} - {self.action} at {self.schedule_time}"


class AutomationRule(models.Model):
    rule_id = models.AutoField(primary_key=True)
    status = models.BooleanField(default=True)
    action = models.CharField(max_length=50)
    threshold = models.ForeignKey(
        'monitoring_app.Threshold',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rules',
        db_column='threshold_id',
    )

    class Meta:
        db_table = 'automation_rules'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return f"Rule {self.rule_id}: {self.action}"


class IsMonitor(models.Model):
    device = models.ForeignKey(
        'devices_app.Device',
        on_delete=models.CASCADE,
        db_column='device_id',
        related_name='monitor_rules',
    )
    rule = models.ForeignKey(
        AutomationRule,
        on_delete=models.CASCADE,
        db_column='rule_id',
        related_name='monitor_devices',
    )

    class Meta:
        db_table = 'is_monitor'
        managed = settings.MANAGED_DB_TABLES
        unique_together = [['device', 'rule']]

    def __str__(self):
        return f'Device {self.device_id} monitors Rule {self.rule_id}'
