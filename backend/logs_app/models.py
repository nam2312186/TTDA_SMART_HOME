from django.db import models
from users_app.models import User
from devices_app.models import Device


class ActivityLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    device_id = models.ForeignKey(Device, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    action_time = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'activity_log'
    
    def __str__(self):
        return f"{self.user_id.username} - {self.action} - {self.device_id.device_name}"
