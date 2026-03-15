from django.urls import path
from .views import (
    SensorDataListView, SensorDataLatestView, SensorDataBySensorView,
    ThresholdListView, ThresholdDetailView,
    AlertListView, AlertUnreadListView, AlertDetailView, AlertMarkReadView,
)

urlpatterns = [
    # Sensor Data
    path("sensor-data/", SensorDataListView.as_view()),
    path("sensor-data/latest/", SensorDataLatestView.as_view()),
    path("sensor-data/<int:sensor_id>/", SensorDataBySensorView.as_view()),

    # Thresholds
    path("thresholds/", ThresholdListView.as_view()),
    path("thresholds/<int:pk>/", ThresholdDetailView.as_view()),

    # Alerts
    path("alerts/", AlertListView.as_view()),
    path("alerts/unread/", AlertUnreadListView.as_view()),
    path("alerts/<int:pk>/", AlertDetailView.as_view()),
    path("alerts/<int:pk>/read/", AlertMarkReadView.as_view()),
    path("alerts/<int:pk>/mark-read/", AlertMarkReadView.as_view()),
]
