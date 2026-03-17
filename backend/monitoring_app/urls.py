from django.urls import path
from .views import (
    SensorDataListView, SensorDataLatestView, SensorDataByDeviceView,
    ThresholdListView, ThresholdDetailView,
    AlertListView, AlertDetailView,
)

urlpatterns = [
    # Sensor Data
    path("sensor-data/", SensorDataListView.as_view()),
    path("sensor-data/latest/", SensorDataLatestView.as_view()),
    path("sensor-data/device/<int:device_id>/", SensorDataByDeviceView.as_view()),

    # Thresholds
    path("thresholds/", ThresholdListView.as_view()),
    path("thresholds/<int:pk>/", ThresholdDetailView.as_view()),

    # Alerts
    path("alerts/", AlertListView.as_view()),
    path("alerts/<int:pk>/", AlertDetailView.as_view()),
]
