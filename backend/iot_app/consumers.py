"""
WebSocket Consumer — push dữ liệu realtime về FE.
FE kết nối: ws://localhost:8000/ws/sensors/
Khi có dữ liệu mới từ IoT, broadcast tới tất cả clients đang mở.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SensorDataConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer cho real-time sensor data.
    Group: 'sensor_updates' — mọi FE client đều nhận broadcast.
    """
    GROUP_NAME = 'sensor_updates'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'connected', 'message': 'WebSocket SmartHome connected'}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    # Nhận message từ FE (nếu cần ping/pong)
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            pass

    # Handler cho broadcast từ backend
    async def sensor_update(self, event):
        """Nhận event từ channel layer → gửi về FE."""
        await self.send(text_data=json.dumps(event['data']))

    async def alert_created(self, event):
        """Nhận alert mới → gửi về FE."""
        await self.send(text_data=json.dumps(event['data']))

    async def device_status(self, event):
        """Thiết bị đổi trạng thái → gửi về FE."""
        await self.send(text_data=json.dumps(event['data']))
