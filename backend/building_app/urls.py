from django.urls import path
from .views import FloorListView, FloorDetailView, FloorRoomsView, RoomListView, RoomDetailView

urlpatterns = [
    path('floors/', FloorListView.as_view(), name='floor-list'),
    path('floors/<int:id>/', FloorDetailView.as_view(), name='floor-detail'),
    path('floors/<int:id>/rooms/', FloorRoomsView.as_view(), name='floor-rooms'),
    path('rooms/', RoomListView.as_view(), name='room-list'),
    path('rooms/<int:id>/', RoomDetailView.as_view(), name='room-detail'),
]
