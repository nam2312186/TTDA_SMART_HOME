from django.urls import path
from .views import FloorListView, FloorDetailView, RoomListView, RoomDetailView, FloorRoomsView, UserRoomPermissionView

urlpatterns = [
    path('floors/', FloorListView.as_view()),
    path('floors/<int:pk>/', FloorDetailView.as_view()),
    path('rooms/', RoomListView.as_view()),
    path('rooms/<int:pk>/', RoomDetailView.as_view()),
    path('floors/<int:floor_id>/rooms/', FloorRoomsView.as_view()),
    path('users/<int:user_id>/room-permissions/', UserRoomPermissionView.as_view()),
]
