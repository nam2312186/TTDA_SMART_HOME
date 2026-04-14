import logging
import threading
import time
from typing import Any

from django.conf import settings

from devices_app.models import Device
from iot_app.broadcast import broadcast_device_status, broadcast_sensor_update
from iot_app.coreiot_client import CoreIoTClient
from logs_app.utils import create_activity_log
from monitoring_app.models import SensorData
from monitoring_app.views import _check_threshold

logger = logging.getLogger("iot_app.coreiot_sync")


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _get_device(device_id: str) -> Device | None:
    if not device_id:
        return None
    try:
        return Device.objects.select_related("type").get(pk=int(device_id))
    except (ValueError, TypeError, Device.DoesNotExist):
        return None


def _upsert_sensor(device: Device, metric: str, value: float, unit: str = "") -> None:
    rounded_value = round(float(value), 2)
    latest = SensorData.objects.filter(device=device).first()
    if latest and float(latest.value) == rounded_value and str(latest.unit or "") == str(unit or ""):
        return

    entry = SensorData.objects.create(device=device, value=rounded_value, unit=unit)
    _check_threshold(entry, source="device")
    broadcast_sensor_update(device.device_id, entry.value, unit, device.device_id, metric)


def sync_once() -> bool:
    if not getattr(settings, "COREIOT_ENABLED", False):
        return False

    coreiot_device_id = getattr(settings, "COREIOT_DEVICE_ID", "").strip()
    if not coreiot_device_id:
        logger.warning("COREIOT_DEVICE_ID is empty")
        return False

    client = CoreIoTClient()
    telemetry = client.fetch_latest_telemetry(coreiot_device_id)
    if not telemetry:
        return False

    brightness_key = getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness")
    temperature_key = getattr(settings, "COREIOT_TEMPERATURE_KEY", "temperature")
    humidity_key = getattr(settings, "COREIOT_HUMIDITY_KEY", "humidity")
    light_key = getattr(settings, "COREIOT_LIGHT_KEY", "light")

    light_actuator_id = getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_ID", "")
    temp_sensor_id = getattr(settings, "COREIOT_LOCAL_TEMPERATURE_SENSOR_ID", "")
    humidity_sensor_id = getattr(settings, "COREIOT_LOCAL_HUMIDITY_SENSOR_ID", "")
    light_sensor_id = getattr(settings, "COREIOT_LOCAL_LIGHT_SENSOR_ID", "")

    # Brightness actuator sync
    if brightness_key in telemetry:
        brightness_raw = _to_int(telemetry.get(brightness_key))
        actuator = _get_device(light_actuator_id)
        if brightness_raw is not None and actuator is not None:
            # ✅ CoreIoT sends 0-255, convert to 0-100 for DB/FE
            brightness_raw = max(0, min(255, brightness_raw))
            brightness_normalized = round((brightness_raw / 255) * 100) if brightness_raw > 0 else 0
            status = brightness_normalized > 0
            
            logger.info(f'🔄 CoreIoT sync brightness: {brightness_raw}/255 → {brightness_normalized}%')
            
            if actuator.brightness != brightness_normalized or actuator.status != status:
                actuator.brightness = brightness_normalized
                actuator.status = status
                actuator.save(update_fields=["brightness", "status"])
                create_activity_log(
                    device=actuator,
                    action="coreiot_brightness_synced",
                    details=f"CoreIoT brightness -> {brightness_normalized}%",
                )
                # ✅ Broadcast normalized 0-100 value
                broadcast_device_status(actuator.device_id, status, actuator.device_name, brightness_normalized)

    # Temperature sensor sync
    if temperature_key in telemetry:
        value = _to_float(telemetry.get(temperature_key))
        device = _get_device(temp_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "temperature", value, "C")

    # Humidity sensor sync
    if humidity_key in telemetry:
        value = _to_float(telemetry.get(humidity_key))
        device = _get_device(humidity_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "humidity", value, "%")

    # Light sensor sync
    if light_key in telemetry:
        value = _to_float(telemetry.get(light_key))
        device = _get_device(light_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "light", value, "lux")

    # Motion sensor sync (NEW)
    motion_key = getattr(settings, "COREIOT_MOTION_KEY", "motion")
    motion_sensor_id = getattr(settings, "COREIOT_LOCAL_MOTION_SENSOR_ID", "")
    if motion_key in telemetry:
        value = _to_int(telemetry.get(motion_key))
        device = _get_device(motion_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "motion", float(value), "")

    # Fan speed actuator sync (NEW)
    fan_speed_key = getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed")
    fan_actuator_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_ID", "")
    if fan_speed_key in telemetry:
        fan_speed_raw = _to_int(telemetry.get(fan_speed_key))
        fan_device = _get_device(fan_actuator_id)
        if fan_speed_raw is not None and fan_device is not None:
            # ✅ CoreIoT sends 0-255, convert to 0-100 for DB/FE
            fan_speed_raw = max(0, min(255, fan_speed_raw))
            fan_speed_normalized = round((fan_speed_raw / 255) * 100) if fan_speed_raw > 0 else 0
            status = fan_speed_normalized > 0
            
            logger.info(f'🔄 CoreIoT sync fan speed: {fan_speed_raw}/255 → {fan_speed_normalized}%')
            
            if fan_device.brightness != fan_speed_normalized or fan_device.status != status:
                fan_device.brightness = fan_speed_normalized
                fan_device.status = status
                fan_device.save(update_fields=["brightness", "status"])
                
                create_activity_log(
                    device=fan_device,
                    action="coreiot_fan_speed_synced",
                    details=f"CoreIoT fan speed synced -> {fan_speed_normalized}%",
                )
                # ✅ Broadcast normalized 0-100 value
                broadcast_device_status(fan_device.device_id, status, fan_device.device_name, fan_speed_normalized)

    return True


def run_forever(stop_event: threading.Event | None = None) -> None:
    interval = max(1, int(getattr(settings, "COREIOT_SYNC_INTERVAL_SECONDS", 2)))
    logger.info("CoreIoT sync started (interval=%ss)", interval)

    while True:
        if stop_event is not None and stop_event.is_set():
            logger.info("CoreIoT sync stopped")
            return
        try:
            sync_once()
        except Exception as exc:
            logger.warning("CoreIoT sync loop error: %s", exc)
        time.sleep(interval)
