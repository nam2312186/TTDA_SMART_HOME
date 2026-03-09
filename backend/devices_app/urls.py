from django.urls import path
from .views import (
    DeviceListView, DeviceDetailView, RoomDeviceListView,
    DeviceTurnOnView, DeviceTurnOffView, DeviceToggleView,
    SensorListView, SensorDetailView,
)

urlpatterns = [
    # Devices CRUD
    path("devices/", DeviceListView.as_view()),
    path("devices/<int:pk>/", DeviceDetailView.as_view()),
    path("rooms/<int:room_id>/devices/", RoomDeviceListView.as_view()),

    # Device Control
    path("devices/<int:pk>/on/", DeviceTurnOnView.as_view()),
    path("devices/<int:pk>/off/", DeviceTurnOffView.as_view()),
    path("devices/<int:pk>/toggle/", DeviceToggleView.as_view()),

    # Sensors CRUD
    path("sensors/", SensorListView.as_view()),
    path("sensors/<int:pk>/", SensorDetailView.as_view()),
]
