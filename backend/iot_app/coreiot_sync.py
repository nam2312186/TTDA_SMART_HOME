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
    latest = SensorData.objects.filter(device=device).first()
    if latest and float(latest.value) == float(value) and str(latest.unit or "") == str(unit or ""):
        return

    entry = SensorData.objects.create(device=device, value=value, unit=unit)
    _check_threshold(entry, source="device")
    broadcast_sensor_update(device.device_id, value, unit, device.device_id, metric)


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
        brightness = _to_int(telemetry.get(brightness_key))
        actuator = _get_device(light_actuator_id)
        if brightness is not None and actuator is not None:
            brightness = max(0, min(255, brightness))
            status = brightness > 0
            if actuator.brightness != brightness or actuator.status != status:
                actuator.brightness = brightness
                actuator.status = status
                actuator.save(update_fields=["brightness", "status"])
                create_activity_log(
                    device=actuator,
                    action="coreiot_brightness_synced",
                    details=f"CoreIoT brightness -> {brightness}/255",
                )
                broadcast_device_status(actuator.device_id, status, actuator.device_name, brightness)

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
