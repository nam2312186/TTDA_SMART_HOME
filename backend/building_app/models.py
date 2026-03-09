from django.db import models
from users_app.models import User


class Floor(models.Model):
    floor_id = models.AutoField(primary_key=True)
    floor_name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='floors')

    def __str__(self):
        return self.floor_name


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_name = models.CharField(max_length=255)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms')

    def __str__(self):
        return self.room_name
