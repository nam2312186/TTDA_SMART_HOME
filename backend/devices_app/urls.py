from django.urls import path
from .views import (
    DeviceListView, DeviceDetailView, RoomDeviceListView,
    DeviceTurnOnView, DeviceTurnOffView, DeviceToggleView, DeviceBrightnessView,
    DeviceTypeListView,
)

urlpatterns = [
    # Device Types
    path("device-types/", DeviceTypeListView.as_view()),

    # Devices CRUD
    path("devices/", DeviceListView.as_view()),
    path("devices/<int:pk>/", DeviceDetailView.as_view()),
    path("rooms/<int:room_id>/devices/", RoomDeviceListView.as_view()),

    # Device Control
    path("devices/<int:pk>/on/", DeviceTurnOnView.as_view()),
    path("devices/<int:pk>/off/", DeviceTurnOffView.as_view()),
    path("devices/<int:pk>/toggle/", DeviceToggleView.as_view()),
    path("devices/<int:pk>/brightness/", DeviceBrightnessView.as_view()),
]
