from django.db import models
from users_app.models import User


class Floor(models.Model):
    floor_id = models.AutoField(primary_key=True)
    floor_name = models.CharField(max_length=100)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'floors'
    
    def __str__(self):
        return self.floor_name


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_name = models.CharField(max_length=100)
    floor_id = models.ForeignKey(Floor, on_delete=models.CASCADE)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'rooms'
    
    def __str__(self):
        return f"{self.room_name} - {self.floor_id.floor_name}"
