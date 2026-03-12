"""
MQTT Client cho Smart Home IoT
================================
Kết nối với MQTT Broker (Mosquitto / HiveMQ / EMQX...).
Thiết bị IoT publish lên các topic:
  smarthome/device/{device_id}/sensor/{sensor_id}   → {"value": 25.5, "unit": "°C"}
  smarthome/device/{device_id}/status               → {"status": true/false}

Chạy: python manage.py mqtt_listen
"""

import json
import logging
import os
import django

logger = logging.getLogger('iot_app.mqtt')

# Topic patterns
TOPIC_SENSOR = 'smarthome/device/+/sensor/+'   # wildcard MQTT
TOPIC_STATUS = 'smarthome/device/+/status'


def _handle_sensor_data(device_id: int, sensor_id: int, payload: dict):
    """Lưu dữ liệu cảm biến vào DB và kiểm tra threshold."""
    from monitoring_app.models import SensorData, Threshold, Alert
    from devices_app.models import Sensor

    value = payload.get('value')
    unit = payload.get('unit', '')

    if value is None:
        logger.warning(f'MQTT: payload thiếu value — {payload}')
        return

    try:
        sensor = Sensor.objects.get(pk=sensor_id, device_id=device_id)
    except Sensor.DoesNotExist:
        logger.warning(f'MQTT: sensor_id={sensor_id} không thuộc device_id={device_id}')
        return

    data = SensorData.objects.create(sensor=sensor, value=float(value), unit=unit)
    logger.info(f'MQTT: Lưu data_id={data.data_id} sensor={sensor_id} value={value}{unit}')

    # Kiểm tra threshold → tạo alert
    try:
        threshold = Threshold.objects.get(sensor=sensor)
        msg = None
        if float(value) < threshold.min_value:
            msg = f'[{sensor.sensor_type}] Giá trị {value} thấp hơn ngưỡng tối thiểu {threshold.min_value}'
        elif float(value) > threshold.max_value:
            msg = f'[{sensor.sensor_type}] Giá trị {value} cao hơn ngưỡng tối đa {threshold.max_value}'
        if msg:
            Alert.objects.create(sensor=sensor, message=msg)
            logger.warning(f'MQTT ALERT: {msg}')
    except Threshold.DoesNotExist:
        pass


def _handle_device_status(device_id: int, payload: dict):
    """Cập nhật trạng thái thiết bị từ MQTT."""
    from devices_app.models import Device
    try:
        device = Device.objects.get(pk=device_id)
        device.status = bool(payload.get('status', device.status))
        device.save(update_fields=['status'])
        logger.info(f'MQTT: Device {device_id} status → {device.status}')
    except Device.DoesNotExist:
        logger.warning(f'MQTT: device_id={device_id} không tồn tại')


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
    # Topic: smarthome/device/{device_id}/sensor/{sensor_id}
    if len(parts) == 5 and parts[3] == 'sensor':
        try:
            device_id = int(parts[2])
            sensor_id = int(parts[4])
            _handle_sensor_data(device_id, sensor_id, payload)
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
