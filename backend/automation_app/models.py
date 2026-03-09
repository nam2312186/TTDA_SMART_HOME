from django.db import models
from devices_app.models import Device


class Schedule(models.Model):
    REPEAT_CHOICES = [
        ('ONCE', 'Một lần'),
        ('DAILY', 'Hàng ngày'),
        ('WEEKLY', 'Hàng tuần'),
        ('MONTHLY', 'Hàng tháng'),
    ]
    
    schedule_id = models.AutoField(primary_key=True)
    device_id = models.ForeignKey(Device, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    schedule_time = models.TimeField()
    repeat_type = models.CharField(max_length=20, choices=REPEAT_CHOICES)
    status = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'schedule'
    
    def __str__(self):
        return f"{self.device_id.device_name} - {self.action} - {self.schedule_time}"
