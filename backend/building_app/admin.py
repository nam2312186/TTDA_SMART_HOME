from django.contrib import admin
from .models import Floor, Room, RoomManagement


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('floor_id', 'floor_name')
    search_fields = ('floor_name',)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_id', 'room_name', 'floor')
    list_filter = ('floor',)
    search_fields = ('room_name',)


@admin.register(RoomManagement)
class RoomManagementAdmin(admin.ModelAdmin):
    list_display = ('user', 'room')
    search_fields = ('user__username', 'room__room_name')
