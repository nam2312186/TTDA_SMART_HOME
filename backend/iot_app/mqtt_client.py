"""
MQTT Client cho Smart Home IoT
================================
Kết nối với MQTT Broker (Mosquitto / HiveMQ / EMQX...).
Thiết bị IoT publish lên các topic:
    smarthome/device/{device_id}/sensor               → {"value": 25.5, "unit": "°C", "metric": "temperature"}
  smarthome/device/{device_id}/status               → {"status": true/false}

Chạy: python manage.py mqtt_listen

Ghi chú cấu hình:
- MQTT host/port/user/pass điền trong file /.env (không hard-code ở đây).
- WiFi/token/URL gửi dữ liệu được điền ở firmware thiết bị.
"""

import json
import logging
import os
import django

logger = logging.getLogger('iot_app.mqtt')

# Topic patterns
TOPIC_SENSOR = 'smarthome/device/+/sensor/+'   # wildcard MQTT
TOPIC_STATUS = 'smarthome/device/+/status'


def _handle_sensor_data(device_id: int, payload: dict):
    """Lưu dữ liệu cảm biến vào DB và kiểm tra threshold."""
    from monitoring_app.models import SensorData
    from monitoring_app.views import _check_threshold
    from devices_app.models import Device
    from iot_app.broadcast import broadcast_sensor_update
    from logs_app.utils import create_activity_log

    value = payload.get('value')
    unit = payload.get('unit', '')
    metric = payload.get('metric', '')

    if value is None:
        logger.warning(f'MQTT: payload thiếu value — {payload}')
        return

    try:
        device = Device.objects.get(pk=device_id)
    except Device.DoesNotExist:
        logger.warning(f'MQTT: device_id={device_id} không tồn tại')
        return

    metric = metric or (device.type.name_type if device.type else 'sensor')
    data = SensorData.objects.create(device=device, value=float(value), unit=unit)
    logger.info(f'MQTT: Lưu data_id={data.data_id} device={device_id} value={value}{unit}')
    create_activity_log(
        device=device,
        action='mqtt_sensor_data_received',
        details=f'MQTT {metric}: {value}{unit}',
    )
    broadcast_sensor_update(device.device_id, float(value), unit, device.device_id, metric)

    alert = _check_threshold(data, source='device')
    if alert:
        logger.warning(f'MQTT ALERT: {alert.message}')


def _handle_device_status(device_id: int, payload: dict):
    """Cập nhật trạng thái thiết bị từ MQTT."""
    from devices_app.models import Device
    from iot_app.broadcast import broadcast_device_status
    from logs_app.utils import create_activity_log
    try:
        device = Device.objects.get(pk=device_id)
        device.status = bool(payload.get('status', device.status))
        device.save(update_fields=['status'])
        create_activity_log(
            device=device,
            action='mqtt_device_status_updated',
            details=f'Device "{device.device_name}" status -> {device.status}',
        )
        broadcast_device_status(device.device_id, device.status, device.device_name)
        logger.info(f'MQTT: Device {device_id} status → {device.status}')
    except Device.DoesNotExist:
        logger.warning(f'MQTT: device_id={device_id} không tồn tại')


def publish_device_control(client, device_id: int, brightness: int):
    """
    Công bố giá trị điều khiển đèn LED lên broker.
    Topic: smarthome/device/{device_id}/control
    Payload: brightness value (0-255)
    """
    from devices_app.models import Device
    from logs_app.utils import create_activity_log
    
    try:
        device = Device.objects.get(pk=device_id)
        brightness = max(0, min(255, int(brightness)))  # Clamp to 0-255
        
        payload = json.dumps({'value': brightness})
        topic = f'smarthome/device/{device_id}/control'
        
        # Publish to broker
        client.publish(topic, payload, qos=1)
        logger.info(f'MQTT: Published brightness={brightness} to {topic}')
        
        # Update device brightness in DB
        device.brightness = brightness
        device.save(update_fields=['brightness'])
        
        # Log activity
        create_activity_log(
            device=device,
            action='mqtt_device_brightness_set',
            details=f'LED brightness set to {brightness}/255',
        )
    except Device.DoesNotExist:
        logger.warning(f'MQTT: device_id={device_id} không tồn tại')
    except Exception as e:
        logger.error(f'MQTT: Error publishing control: {e}')


def publish_initial_light_states(client):
    """
    Reset all light actuators to 0 on backend startup and publish initial state.
    This keeps FE/BE/device state consistent after server restarts.
    """
    from devices_app.models import Device

    lights = Device.objects.select_related('type').filter(
        type__name_type='light',
        threshold__isnull=True,
    )

    for light in lights:
        try:
            light.brightness = 0
            light.status = False
            light.save(update_fields=['brightness', 'status'])
            payload = json.dumps({'value': 0})
            topic = f'smarthome/device/{light.device_id}/control'
            client.publish(topic, payload, qos=1)
            logger.info(f'MQTT init: reset {light.device_id} -> 0')
        except Exception as e:
            logger.warning(f'MQTT init: cannot reset device {light.device_id}: {e}')


def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        logger.info('MQTT: Đã kết nối broker thành công')
        client.subscribe(TOPIC_SENSOR)
        client.subscribe(TOPIC_STATUS)
        logger.info(f'MQTT: Subscribed → {TOPIC_SENSOR}')
        logger.info(f'MQTT: Subscribed → {TOPIC_STATUS}')
    else:
        logger.error(f'MQTT: Kết nối thất bại, reason_code={reason_code}')


def on_message(client, userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
    except json.JSONDecodeError:
        logger.warning(f'MQTT: Payload không phải JSON — topic={topic}')
        return

    parts = topic.split('/')
    # Topic: smarthome/device/{device_id}/sensor/{metric?}
    if len(parts) >= 4 and parts[3] == 'sensor':
        try:
            device_id = int(parts[2])
            if len(parts) >= 5 and not payload.get('metric'):
                payload['metric'] = parts[4]
            _handle_sensor_data(device_id, payload)
        except ValueError:
            logger.warning(f'MQTT: Topic sai format — {topic}')

    # Topic: smarthome/device/{device_id}/status
    elif len(parts) == 4 and parts[3] == 'status':
        try:
            device_id = int(parts[2])
            _handle_device_status(device_id, payload)
        except ValueError:
            logger.warning(f'MQTT: Topic sai format — {topic}')


def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    logger.warning(f'MQTT: Ngắt kết nối, reason_code={reason_code}')


def create_mqtt_client():
    """Tạo và cấu hình MQTT client từ settings."""
    import paho.mqtt.client as mqtt
    from django.conf import settings

    broker = getattr(settings, 'MQTT_BROKER', 'localhost')
    port = getattr(settings, 'MQTT_PORT', 1883)
    username = getattr(settings, 'MQTT_USERNAME', None)
    password = getattr(settings, 'MQTT_PASSWORD', None)
    client_id = getattr(settings, 'MQTT_CLIENT_ID', 'smarthome-django')

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)

    if username:
        client.username_pw_set(username, password)

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    return client, broker, port
