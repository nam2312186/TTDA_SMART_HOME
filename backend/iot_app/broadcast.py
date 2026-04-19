"""
Utility: broadcast sự kiện realtime qua WebSocket channel layer.
Dùng ở bất kỳ đâu trong BE (views, signals, sync worker).

Ví dụ:
    from iot_app.broadcast import broadcast_sensor_update
    broadcast_sensor_update(sensor_id=1, value=25.5, unit='°C')
"""

import logging
from asgiref.sync import async_to_sync

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
        async_to_sync(channel_layer.group_send)(group, message)
    except Exception as e:
        logger.warning(f'Broadcast thất bại: {e}')


def broadcast_sensor_update(sensor_id: int, value: float, unit: str, device_id: int = None, metric: str = ''):
    """Broadcast dữ liệu cảm biến mới về tất cả FE clients."""
    _send('sensor_updates', {
        'type': 'sensor_update',
        'data': {
            'event': 'sensor_data',
            'sensor_id': sensor_id,
            'device_id': device_id,
            'metric': metric,
            'value': value,
            'unit': unit,
        }
    })


def broadcast_alert(alert_id: int, sensor_id: int, message: str, device_id: int = None):
    """Broadcast alert mới về FE."""
    _send('sensor_updates', {
        'type': 'alert_created',
        'data': {
            'event': 'alert',
            'alert_id': alert_id,
            'sensor_id': sensor_id,
            'device_id': device_id,
            'message': message,
        }
    })


def broadcast_device_status(device_id: int, status: bool, device_name: str = '', brightness: int | None = None):
    """Broadcast khi thiết bị thay đổi trạng thái."""
    payload = {
        'event': 'device_status',
        'device_id': device_id,
        'device_name': device_name,
        'status': status,
    }
    if brightness is not None:
        payload['brightness'] = brightness

    _send('sensor_updates', {
        'type': 'device_status',
        'data': payload,
    })
