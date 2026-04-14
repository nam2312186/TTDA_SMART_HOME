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
_last_nonzero_telemetry_ts: dict[str, int] = {}


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


def _normalize_percent(raw_value: Any) -> int:
    """Normalize values to 0-100, supporting legacy 0-255 telemetry."""
    try:
        numeric = float(raw_value)
    except (TypeError, ValueError):
        return 0

    numeric = max(0.0, min(255.0, numeric))
    if numeric <= 100.0:
        return int(round(numeric))
    return int(round((numeric / 255.0) * 100.0))


def _is_stale(ts_ms: Any, max_age_seconds: int) -> bool:
    if max_age_seconds <= 0:
        return False
    try:
        ts = int(ts_ms)
    except (TypeError, ValueError):
        return False
    now_ms = int(time.time() * 1000)
    return (now_ms - ts) > (max_age_seconds * 1000)


def _get_device(device_id: str) -> Device | None:
    if not device_id:
        return None
    try:
        return Device.objects.select_related("type").get(pk=int(device_id))
    except (ValueError, TypeError, Device.DoesNotExist):
        return None


def _upsert_sensor(device: Device, metric: str, value: float, unit: str) -> None:
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
    telemetry_entries = client.fetch_latest_telemetry_entries(coreiot_device_id)
    if not telemetry_entries:
        return False
    telemetry = {key: entry.get("value") for key, entry in telemetry_entries.items()}

    brightness_key = getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness")
    temperature_key = getattr(settings, "COREIOT_TEMPERATURE_KEY", "temperature")
    humidity_key = getattr(settings, "COREIOT_HUMIDITY_KEY", "humidity")
    light_key = getattr(settings, "COREIOT_LIGHT_KEY", "light")

    light_actuator_id = getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_ID", "")
    temp_sensor_id = getattr(settings, "COREIOT_LOCAL_TEMPERATURE_SENSOR_ID", "")
    humidity_sensor_id = getattr(settings, "COREIOT_LOCAL_HUMIDITY_SENSOR_ID", "")
    light_sensor_id = getattr(settings, "COREIOT_LOCAL_LIGHT_SENSOR_ID", "")
    actuator_stale_seconds = int(getattr(settings, "COREIOT_ACTUATOR_STALE_SECONDS", 15))

    if brightness_key in telemetry:
        brightness_raw = _to_int(telemetry.get(brightness_key))
        brightness_ts = telemetry_entries.get(brightness_key, {}).get("ts")
        actuator = _get_device(light_actuator_id)
        if brightness_raw is not None and actuator is not None:
            if _is_stale(brightness_ts, actuator_stale_seconds):
                logger.warning(
                    "⚠️ Skip stale brightness telemetry: device=%s ts=%s raw=%s",
                    actuator.device_name,
                    brightness_ts,
                    brightness_raw,
                )
                brightness_raw = None

        if brightness_raw is not None and actuator is not None and brightness_ts is None and actuator.status and _normalize_percent(brightness_raw) == 0:
            logger.warning(
                "⚠️ Skip untrusted zero brightness telemetry without timestamp: device=%s raw=%s",
                actuator.device_name,
                brightness_raw,
            )
            brightness_raw = None

        if brightness_raw is not None and actuator is not None:
            normalized_brightness = _normalize_percent(brightness_raw)
            status = normalized_brightness > 0

            if status and brightness_ts is not None:
                try:
                    _last_nonzero_telemetry_ts[f"light:{actuator.device_id}"] = int(brightness_ts)
                except (TypeError, ValueError):
                    pass

            if (not status) and actuator.status:
                marker_key = f"light:{actuator.device_id}"
                if marker_key not in _last_nonzero_telemetry_ts:
                    logger.warning(
                        "⚠️ Skip OFF sync without prior non-zero telemetry: device=%s ts=%s raw=%s",
                        actuator.device_name,
                        brightness_ts,
                        brightness_raw,
                    )
                    brightness_raw = None

        if brightness_raw is not None and actuator is not None:
            normalized_brightness = _normalize_percent(brightness_raw)
            status = normalized_brightness > 0

            logger.info(
                "🔄 CoreIoT sync brightness: raw=%s ts=%s -> normalized=%s%%",
                brightness_raw,
                brightness_ts,
                normalized_brightness,
            )

            if actuator.brightness != normalized_brightness or actuator.status != status:
                actuator.brightness = normalized_brightness
                actuator.status = status
                actuator.save(update_fields=["brightness", "status"])
                create_activity_log(
                    device=actuator,
                    action="coreiot_brightness_synced",
                    details=f"CoreIoT brightness -> {normalized_brightness}%",
                )
                broadcast_device_status(
                    actuator.device_id,
                    status,
                    actuator.device_name,
                    normalized_brightness,
                )

    if temperature_key in telemetry:
        value = _to_float(telemetry.get(temperature_key))
        device = _get_device(temp_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "temperature", value, "C")

    if humidity_key in telemetry:
        value = _to_float(telemetry.get(humidity_key))
        device = _get_device(humidity_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "humidity", value, "%")

    if light_key in telemetry:
        value = _to_float(telemetry.get(light_key))
        device = _get_device(light_sensor_id)
        if value is not None and device is not None:
            _upsert_sensor(device, "light", value, "lux")

    motion_key = getattr(settings, "COREIOT_MOTION_KEY", "motion")
    motion_sensor_id = getattr(settings, "COREIOT_LOCAL_MOTION_SENSOR_ID", "")

    logger.info("🔍 Checking motion: key=%s, sensor_id=%s", motion_key, motion_sensor_id)

    if motion_key in telemetry:
        value = _to_int(telemetry.get(motion_key))
        device = _get_device(motion_sensor_id)
        if value is not None and device is not None:
            logger.info("✅ Motion processed: device=%s, value=%s", device.device_name, value)
            _upsert_sensor(device, "motion", float(value), "")
        else:
            logger.error("❌ Motion sensor device not found: %s", motion_sensor_id)
    else:
        logger.warning("⚠️ Motion key not in telemetry. Available: %s", list(telemetry.keys()))

    fan_speed_key = getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed")
    fan_actuator_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_ID", "")
    if fan_speed_key in telemetry:
        fan_speed_raw = _to_int(telemetry.get(fan_speed_key))
        fan_speed_ts = telemetry_entries.get(fan_speed_key, {}).get("ts")
        fan_device = _get_device(fan_actuator_id)
        if fan_speed_raw is not None and fan_device is not None:
            if _is_stale(fan_speed_ts, actuator_stale_seconds):
                logger.warning(
                    "⚠️ Skip stale fan telemetry: device=%s ts=%s raw=%s",
                    fan_device.device_name,
                    fan_speed_ts,
                    fan_speed_raw,
                )
                fan_speed_raw = None

        if fan_speed_raw is not None and fan_device is not None and fan_speed_ts is None and fan_device.status and _normalize_percent(fan_speed_raw) == 0:
            logger.warning(
                "⚠️ Skip untrusted zero fan telemetry without timestamp: device=%s raw=%s",
                fan_device.device_name,
                fan_speed_raw,
            )
            fan_speed_raw = None

        if fan_speed_raw is not None and fan_device is not None:
            normalized_fan_speed = _normalize_percent(fan_speed_raw)
            status = normalized_fan_speed > 0

            if status and fan_speed_ts is not None:
                try:
                    _last_nonzero_telemetry_ts[f"fan:{fan_device.device_id}"] = int(fan_speed_ts)
                except (TypeError, ValueError):
                    pass

            if (not status) and fan_device.status:
                marker_key = f"fan:{fan_device.device_id}"
                if marker_key not in _last_nonzero_telemetry_ts:
                    logger.warning(
                        "⚠️ Skip OFF fan sync without prior non-zero telemetry: device=%s ts=%s raw=%s",
                        fan_device.device_name,
                        fan_speed_ts,
                        fan_speed_raw,
                    )
                    fan_speed_raw = None

        if fan_speed_raw is not None and fan_device is not None:
            normalized_fan_speed = _normalize_percent(fan_speed_raw)
            status = normalized_fan_speed > 0

            logger.info(
                "🔄 CoreIoT sync fan speed: raw=%s ts=%s -> normalized=%s%%",
                fan_speed_raw,
                fan_speed_ts,
                normalized_fan_speed,
            )

            if fan_device.brightness != normalized_fan_speed or fan_device.status != status:
                fan_device.brightness = normalized_fan_speed
                fan_device.status = status
                fan_device.save(update_fields=["brightness", "status"])

                create_activity_log(
                    device=fan_device,
                    action="coreiot_fan_speed_synced",
                    details=f"CoreIoT fan speed synced -> {normalized_fan_speed}%",
                )
                broadcast_device_status(
                    fan_device.device_id,
                    status,
                    fan_device.device_name,
                    normalized_fan_speed,
                )

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
