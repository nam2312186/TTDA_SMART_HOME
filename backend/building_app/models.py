from django.db import models
from users_app.models import User


class Floor(models.Model):
    floor_id = models.AutoField(primary_key=True)
    floor_name = models.CharField(max_length=255)
    level = models.IntegerField(default=1)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='floors', null=True, blank=True)

    def __str__(self):
        return self.floor_name


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_name = models.CharField(max_length=255)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms', null=True, blank=True)

    def __str__(self):
        return self.room_name


class UserRoomPermission(models.Model):
    """Tracks which rooms a user has been granted access to by an admin."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_permissions')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='permitted_users')

    class Meta:
        unique_together = ('user', 'room')

    def __str__(self):
        return f"{self.user.username} → {self.room.room_name}"
