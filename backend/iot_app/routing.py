from django.urls import path
from .consumers import SensorDataConsumer

websocket_urlpatterns = [
    path('ws/sensors/', SensorDataConsumer.as_asgi()),
]
