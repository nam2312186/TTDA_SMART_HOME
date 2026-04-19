from django.db import models
from django.conf import settings

# Create your models here.


class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=255)

    class Meta:
        db_table = 'roles'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.role_name

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    role_id = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, db_column='role_id')

    class Meta:
        db_table = 'users'
        managed = settings.MANAGED_DB_TABLES

    def __str__(self):
        return self.username
    
