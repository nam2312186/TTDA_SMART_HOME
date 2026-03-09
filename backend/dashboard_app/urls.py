from django.urls import path
from .views import (
    DashboardSummaryView,
    DashboardTemperatureView,
    DashboardHumidityView,
    DashboardDeviceStatusView,
)

urlpatterns = [
    path("dashboard/summary/", DashboardSummaryView.as_view()),
    path("dashboard/temperature/", DashboardTemperatureView.as_view()),
    path("dashboard/humidity/", DashboardHumidityView.as_view()),
    path("dashboard/device-status/", DashboardDeviceStatusView.as_view()),
]
