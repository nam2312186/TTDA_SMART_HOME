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
        return False

    client = CoreIoTClient()
    telemetry_entries = client.fetch_latest_telemetry_entries(coreiot_device_id)
    if not telemetry_entries:
        return False
    telemetry = {key: entry.get("value") for key, entry in telemetry_entries.items()}

    # Mapping keys from settings
    brightness_key = getattr(settings, "COREIOT_BRIGHTNESS_KEY", "brightness")
    fan_speed_key = getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed")
    temperature_key = getattr(settings, "COREIOT_TEMPERATURE_KEY", "temperature")
    humidity_key = getattr(settings, "COREIOT_HUMIDITY_KEY", "humidity")
    light_key = getattr(settings, "COREIOT_LIGHT_KEY", "light")

    # Mapping device IDs from settings
    light_actuator_id = getattr(settings, "COREIOT_LOCAL_LIGHT_ACTUATOR_ID", "")
    fan_actuator_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_ID", "")
    temp_sensor_id = getattr(settings, "COREIOT_LOCAL_TEMPERATURE_SENSOR_ID", "")
    humidity_sensor_id = getattr(settings, "COREIOT_LOCAL_HUMIDITY_SENSOR_ID", "")
    light_sensor_id = getattr(settings, "COREIOT_LOCAL_LIGHT_SENSOR_ID", "")

    # Sync Light Actuator
    if brightness_key in telemetry:
        val = _to_int(telemetry.get(brightness_key))
        actuator = _get_device(light_actuator_id)
        if val is not None and actuator is not None:
                actuator_type = (getattr(actuator.type, "name_type", "") or "").lower()
                if actuator_type not in ["light", "actuator"]:
                    logger.warning("Skip brightness sync: mapped light actuator is type=%s (device=%s)", actuator_type, actuator.device_name)
                else:
                    # Protection: Skip if a command was recently sent manually or via schedule
                    now_ts = time.time()
                    last_cmd = _last_actuator_command_times.get(str(actuator.device_id), 0)
                    stale_limit = int(getattr(settings, "COREIOT_ACTUATOR_STALE_SECONDS", 15))
                    
                    if now_ts - last_cmd < stale_limit:
                        # logger.debug("Skipping telemetry sync for %s (protection window)", actuator.device_name)
                        pass
                    else:
                        normalized = _normalize_percent(val)
                        status = normalized > 0
                        if actuator.brightness != normalized or actuator.status != status:
                            actuator.brightness = normalized
                            actuator.status = status
                            actuator.save(update_fields=["brightness", "status"])
                            broadcast_device_status(actuator.device_id, status, actuator.device_name, normalized)


    # Sync Fan Actuator
    if fan_speed_key in telemetry:
        val = _to_int(telemetry.get(fan_speed_key))
        fan = _get_device(fan_actuator_id)
        if val is not None and fan is not None:
                fan_type = (getattr(fan.type, "name_type", "") or "").lower()
                if fan_type != "fan":
                    logger.warning("Skip fan sync: mapped fan actuator is type=%s (device=%s)", fan_type, fan.device_name)
                else:
                    # Protection: Skip if a command was recently sent
                    now_ts = time.time()
                    last_cmd = _last_actuator_command_times.get(str(fan.device_id), 0)
                    stale_limit = int(getattr(settings, "COREIOT_ACTUATOR_STALE_SECONDS", 15))

                    if now_ts - last_cmd < stale_limit:
                        pass
                    else:
                        normalized = _normalize_percent(val)
                        status = normalized > 0
                        if fan.brightness != normalized or fan.status != status:
                            fan.brightness = normalized
                            fan.status = status
                            fan.save(update_fields=["brightness", "status"])
                            broadcast_device_status(fan.device_id, status, fan.device_name, normalized)


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
                success = client.set_value(coreiot_device_id, target_value)
            else:
                success = client.set_brightness(coreiot_device_id, target_value)

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
