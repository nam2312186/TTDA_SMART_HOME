import logging
import threading
import time
from typing import Any
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone
from devices_app.models import Device
from automation_app.models import Schedule
from iot_app.broadcast import broadcast_device_status, broadcast_sensor_update
from iot_app.coreiot_client import CoreIoTClient
from logs_app.utils import create_activity_log
from monitoring_app.models import SensorData
from monitoring_app.views import _check_threshold

logger = logging.getLogger("iot_app.coreiot_sync")
_last_schedule_check_slot: str = ""
_last_actuator_command_times: dict[str, float] = {}  # device_id -> timestamp


def record_actuator_command(device_id: int | str) -> None:
    """Record that a command was sent to an actuator to trigger the protection window."""
    _last_actuator_command_times[str(device_id)] = time.time()



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
    """Simple normalization: treat 0-255 as 0-100%."""
    try:
        numeric = float(raw_value)
    except (TypeError, ValueError):
        return 0
    numeric = max(0.0, min(255.0, numeric))
    if numeric <= 100.0:
        return int(round(numeric))
    return int(round((numeric / 255.0) * 100.0))


def _get_device(device_id: str) -> Device | None:
    if not device_id:
        return None
    try:
        return Device.objects.select_related("type").get(pk=int(device_id))
    except (ValueError, TypeError, Device.DoesNotExist):
        return None


def _resolve_light_channel(device_id: int) -> dict:
    light2_id = str(getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_2_ID", "") or "").strip()
    if light2_id and str(device_id) == light2_id:
        return {
            "telemetry_key": getattr(settings, "COREIOT_BRIGHTNESS_2_KEY", "brightness_2"),
            "method": getattr(settings, "COREIOT_SETSTATE_METHOD_2", "setState2"),
            "direct_key": getattr(settings, "COREIOT_BRIGHTNESS_2_KEY", "brightness_2"),
        }
    return {
        "telemetry_key": getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness"),
        "method": getattr(settings, "COREIOT_SETSTATE_METHOD", "setState"),
        "direct_key": getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness"),
    }


def _resolve_fan_channel(device_id: int) -> dict:
    fan2_id = str(getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_2_ID", "") or "").strip()
    if fan2_id and str(device_id) == fan2_id:
        return {
            "telemetry_key": getattr(settings, "COREIOT_FAN_SPEED_2_KEY", "fan_speed_2"),
            "method": getattr(settings, "COREIOT_SETSTATE_VALUE_METHOD_2", "setValue2"),
            "direct_key": getattr(settings, "COREIOT_FAN_SPEED_2_KEY", "fan_speed_2"),
        }
    return {
        "telemetry_key": getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed"),
        "method": getattr(settings, "COREIOT_SETSTATE_VALUE_METHOD", "setValue"),
        "direct_key": getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed"),
    }


def _sync_actuator_from_telemetry(telemetry: dict[str, Any], device_id: str, expected_type: str, channel: dict, stale_limit: int) -> None:
    telemetry_key = channel.get("telemetry_key")
    if not telemetry_key or telemetry_key not in telemetry:
        return

    val = _to_int(telemetry.get(telemetry_key))
    actuator = _get_device(device_id)
    if val is None or actuator is None:
        return

    actuator_type = (getattr(actuator.type, "name_type", "") or "").lower()
    valid_types = [expected_type]
    if expected_type == "light":
        valid_types.append("actuator")
    if actuator_type not in valid_types:
        logger.warning("Skip %s sync: mapped actuator is type=%s (device=%s)", expected_type, actuator_type, actuator.device_name)
        return

    now_ts = time.time()
    last_cmd = _last_actuator_command_times.get(str(actuator.device_id), 0)
    if now_ts - last_cmd < stale_limit:
        return

    normalized = _normalize_percent(val)
    status = normalized > 0
    if actuator.brightness != normalized or actuator.status != status:
        actuator.brightness = normalized
        actuator.status = status
        actuator.save(update_fields=["brightness", "status"])
        broadcast_device_status(actuator.device_id, status, actuator.device_name, normalized)


def _upsert_sensor(device: Device, metric: str, value: float, unit: str) -> None:
    rounded_value = round(float(value), 2)
    latest = SensorData.objects.filter(device=device).first()
    if latest and float(latest.value) == rounded_value and str(latest.unit or "") == str(unit or ""):
        # Dù value không đổi, vẫn chạy threshold check để không bị "báo 1 lần rồi im".
        _check_threshold(latest, source="device")
        return

    entry = SensorData.objects.create(device=device, value=rounded_value, unit=unit)
    _check_threshold(entry, source="device")
    broadcast_sensor_update(device.device_id, entry.value, unit, device.device_id, metric)


def sync_once() -> bool:
    if not getattr(settings, "COREIOT_ENABLED", False):
        return False

    coreiot_device_id = getattr(settings, "COREIOT_DEVICE_ID", "").strip()
    if not coreiot_device_id:
        return False

    client = CoreIoTClient()
    telemetry_entries = client.fetch_latest_telemetry_entries(coreiot_device_id)
    if not telemetry_entries:
        return False
    telemetry = {key: entry.get("value") for key, entry in telemetry_entries.items()}

    # Mapping keys from settings
    temperature_key = getattr(settings, "COREIOT_TEMPERATURE_KEY", "temperature")
    humidity_key = getattr(settings, "COREIOT_HUMIDITY_KEY", "humidity")
    light_key = getattr(settings, "COREIOT_LIGHT_KEY", "light")

    # Mapping device IDs from settings
    light_actuator_id = getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_ID", "")
    fan_actuator_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_ID", "")
    light_actuator_2_id = getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_2_ID", "")
    fan_actuator_2_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_2_ID", "")
    temp_sensor_id = getattr(settings, "COREIOT_LOCAL_TEMPERATURE_SENSOR_ID", "")
    humidity_sensor_id = getattr(settings, "COREIOT_LOCAL_HUMIDITY_SENSOR_ID", "")
    light_sensor_id = getattr(settings, "COREIOT_LOCAL_LIGHT_SENSOR_ID", "")
    stale_limit = int(getattr(settings, "COREIOT_ACTUATOR_STALE_SECONDS", 15))

    # Sync Light/Fan Actuators (primary + secondary channels)
    if light_actuator_id:
        _sync_actuator_from_telemetry(
            telemetry,
            light_actuator_id,
            "light",
            _resolve_light_channel(int(light_actuator_id)),
            stale_limit,
        )
    if light_actuator_2_id:
        _sync_actuator_from_telemetry(
            telemetry,
            light_actuator_2_id,
            "light",
            _resolve_light_channel(int(light_actuator_2_id)),
            stale_limit,
        )
    if fan_actuator_id:
        _sync_actuator_from_telemetry(
            telemetry,
            fan_actuator_id,
            "fan",
            _resolve_fan_channel(int(fan_actuator_id)),
            stale_limit,
        )
    if fan_actuator_2_id:
        _sync_actuator_from_telemetry(
            telemetry,
            fan_actuator_2_id,
            "fan",
            _resolve_fan_channel(int(fan_actuator_2_id)),
            stale_limit,
        )


    # Sync Sensors
    if temperature_key in telemetry:
        val = _to_float(telemetry.get(temperature_key))
        dev = _get_device(temp_sensor_id)
        if val is not None and dev is not None:
            _upsert_sensor(dev, "temperature", val, "C")

    if humidity_key in telemetry:
        val = _to_float(telemetry.get(humidity_key))
        dev = _get_device(humidity_sensor_id)
        if val is not None and dev is not None:
            _upsert_sensor(dev, "humidity", val, "%")

    if light_key in telemetry:
        val = _to_float(telemetry.get(light_key))
        dev = _get_device(light_sensor_id)
        if val is not None and dev is not None:
            _upsert_sensor(dev, "light", val, "lux")

    return True


def _check_schedules() -> None:
    global _last_schedule_check_slot

    schedule_tz_name = getattr(settings, "COREIOT_SCHEDULE_TIMEZONE", "Asia/Ho_Chi_Minh")
    try:
        schedule_tz = ZoneInfo(schedule_tz_name)
        now = timezone.localtime(timezone.now(), schedule_tz)
    except Exception:
        now = timezone.localtime()

    current_slot = now.strftime("%Y-%m-%d %H:%M")
    if current_slot == _last_schedule_check_slot:
        return
    _last_schedule_check_slot = current_slot

    schedules = Schedule.objects.filter(
        status=True,
        schedule_time__hour=now.hour,
        schedule_time__minute=now.minute
    ).select_related("room")

    if not schedules.exists():
        return

    client = CoreIoTClient()
    coreiot_device_id = getattr(settings, "COREIOT_DEVICE_ID", "").strip()
    if not coreiot_device_id:
        return

    for s in schedules:
        should_run = False
        rt = (s.repeat_type or "").lower()
        current_day = now.strftime("%a").lower()

        if rt == "once":
            should_run = True
            s.status = False
            s.save(update_fields=["status"])
        elif rt == "daily":
            should_run = True
        elif rt == "weekday":
            should_run = current_day in ["mon", "tue", "wed", "thu", "fri"]
        elif rt == "weekend":
            should_run = current_day in ["sat", "sun"]
        elif current_day in rt:
            should_run = True

        if not should_run:
            continue

        actuators = Device.objects.filter(
            room=s.room,
            type__name_type__in=["fan", "light", "actuator"],
        ).exclude(device_name__icontains="sensor")

        target_status = s.action.lower() in ["on", "turn_on"]
        target_value = 100 if target_status else 0

        for d in actuators:
            device_type = (getattr(d.type, "name_type", "") or "").lower()
            if device_type == "fan":
                fan_channel = _resolve_fan_channel(d.device_id)
                success = client.set_value(
                    coreiot_device_id,
                    target_value,
                    method_name=fan_channel["method"],
                    direct_key=fan_channel["direct_key"],
                )
            else:
                light_channel = _resolve_light_channel(d.device_id)
                success = client.set_brightness(
                    coreiot_device_id,
                    target_value,
                    method_name=light_channel["method"],
                    direct_key=light_channel["direct_key"],
                )

            if success:
                record_actuator_command(d.device_id)
                d.status = target_status
                d.brightness = target_value
                d.save(update_fields=["status", "brightness"])
                broadcast_device_status(d.device_id, d.status, d.device_name, d.brightness)


def run_forever(stop_event: threading.Event | None = None) -> None:
    interval = max(0.2, float(getattr(settings, "COREIOT_SYNC_INTERVAL_SECONDS", 2)))

    logger.info("CoreIoT sync started (interval=%ss)", interval)

    while True:
        if stop_event is not None and stop_event.is_set():
            return
        try:
            sync_once()
            _check_schedules()
        except Exception as exc:
            logger.warning("CoreIoT sync loop error: %s", exc)
        time.sleep(interval)
