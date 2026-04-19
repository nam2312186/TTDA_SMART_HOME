from django.db import models
from django.conf import settings


class Floor(models.Model):
    floor_id = models.AutoField(primary_key=True)
    floor_name = models.CharField(max_length=255)

    class Meta:
        db_table = 'floors'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.floor_name


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_name = models.CharField(max_length=255)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms', db_column='floor_id')

    class Meta:
        db_table = 'rooms'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.room_name


class RoomManagement(models.Model):
    user = models.ForeignKey(
        'users_app.User',
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='room_managements',
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        db_column='room_id',
        related_name='room_managements',
    )

    class Meta:
        db_table = 'room_managements'
        managed = settings.MANAGED_DB_TABLES
        unique_together = [['user', 'room']]

    def __str__(self):
        return f'{self.user_id} - {self.room_id}'
