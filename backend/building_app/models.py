from django.db import models
from django.conf import settings
from users_app.models import User


class Floor(models.Model):
    floor_id = models.AutoField(primary_key=True)
    floor_name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='floors', null=True, blank=True, db_column='user_id')

    class Meta:
        db_table = 'floors'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.floor_name


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_name = models.CharField(max_length=255)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms', db_column='floor_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms', null=True, blank=True, db_column='user_id')

    class Meta:
        db_table = 'rooms'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.room_name
