"""
Utility: broadcast sự kiện realtime qua WebSocket channel layer.
Dùng ở bất kỳ đâu trong BE (views, signals, MQTT handler).

Ví dụ:
    from iot_app.broadcast import broadcast_sensor_update
    broadcast_sensor_update(sensor_id=1, value=25.5, unit='°C')
"""

import asyncio
import logging

logger = logging.getLogger('iot_app.broadcast')


def _get_channel_layer():
    try:
        from channels.layers import get_channel_layer
        return get_channel_layer()
    except Exception:
        return None


def _send(group: str, message: dict):
    """Gửi message đến channel layer group (thread-safe)."""
    channel_layer = _get_channel_layer()
    if channel_layer is None:
        return
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        loop.run_until_complete(channel_layer.group_send(group, message))
    except Exception as e:
        logger.warning(f'Broadcast thất bại: {e}')


def broadcast_sensor_update(sensor_id: int, value: float, unit: str, device_id: int = None):
    """Broadcast dữ liệu cảm biến mới về tất cả FE clients."""
    _send('sensor_updates', {
        'type': 'sensor_update',
        'data': {
            'event': 'sensor_data',
            'sensor_id': sensor_id,
            'device_id': device_id,
            'value': value,
            'unit': unit,
        }
    })


def broadcast_alert(alert_id: int, sensor_id: int, message: str):
    """Broadcast alert mới về FE."""
    _send('sensor_updates', {
        'type': 'alert_created',
        'data': {
            'event': 'alert',
            'alert_id': alert_id,
            'sensor_id': sensor_id,
            'message': message,
        }
    })


def broadcast_device_status(device_id: int, status: bool, device_name: str = ''):
    """Broadcast khi thiết bị thay đổi trạng thái."""
    _send('sensor_updates', {
        'type': 'device_status',
        'data': {
            'event': 'device_status',
            'device_id': device_id,
            'device_name': device_name,
            'status': status,
        }
    })
