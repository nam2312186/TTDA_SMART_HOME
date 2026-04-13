# Smart Home IoT — Database Schema (Current)

> Generated: 13/04/2026  
> Project: TTDA Smart Home (FE + BE + CoreIoT)

---

```dbml
// ─── ROLES ────────────────────────────────────────────────────────────────────
Table roles {
  role_id   integer [primary key]
  role_name varchar
}

// ─── USERS ────────────────────────────────────────────────────────────────────
Table users {
  user_id    integer  [primary key]
  username   varchar
  password   varchar
  email      varchar
  created_at datetime
  role_id    integer
}

Ref: users.role_id > roles.role_id

// ─── FLOORS ───────────────────────────────────────────────────────────────────
// Note: user_id removed — ownership tracked via room_managements
Table floors {
  floor_id   integer [primary key]
  floor_name varchar
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────
// Note: user_id removed — per-user room access tracked via room_managements
Table rooms {
  room_id   integer [primary key]
  room_name varchar
  floor_id  integer
}

Ref: rooms.floor_id > floors.floor_id

// ─── ROOM MANAGEMENTS (User ↔ Room permissions) ───────────────────────────────
Table room_managements {
  id      integer [primary key]
  room_id integer
  user_id integer
}

Ref: room_managements.room_id > rooms.room_id
Ref: room_managements.user_id > users.user_id

// ─── DEVICE TYPE ──────────────────────────────────────────────────────────────
// Replaces device_type varchar inside devices.
// Values: temperature, humidity, light, motion, fan, actuator, sensor, ...
Table device_type {
  type_id   integer [primary key]
  name_type varchar
}

// ─── DEVICES ──────────────────────────────────────────────────────────────────
// Sensors and actuators are unified in one table (no separate sensors table).
// brightness stores PWM value (0–255) for both light and fan actuators.
Table devices {
  device_id    integer [primary key]
  device_name  varchar
  type_id      integer
  room_id      integer
  status       boolean
  brightness   integer   // 0–255: light brightness OR fan speed
  threshold_id integer   // nullable — only set for sensor devices
  created_at   datetime
}

Ref: devices.type_id      > device_type.type_id
Ref: devices.room_id      > rooms.room_id
Ref: devices.threshold_id > thresholds.threshold_id

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────
// Linked directly from devices (no intermediate sensors table).
// require_motion: if true, automation only triggers when motion is detected.
Table thresholds {
  threshold_id   integer [primary key]
  min_value      float
  max_value      float
  require_motion boolean   // default: true
}

// ─── SENSOR DATA ──────────────────────────────────────────────────────────────
// References device_id directly (sensors merged into devices table).
Table sensor_data {
  data_id     integer  [primary key]
  device_id   integer
  value       float
  unit        varchar
  recorded_at datetime
}

Ref: sensor_data.device_id > devices.device_id

// ─── ALERTS ───────────────────────────────────────────────────────────────────
// Triggered when sensor value crosses threshold.
// threshold_id replaces sensor_id; is_read removed.
Table alerts {
  alert_id     integer  [primary key]
  threshold_id integer
  value        float
  message      text
  created_at   datetime
}

Ref: alerts.threshold_id > thresholds.threshold_id

// ─── AUTOMATION RULES ─────────────────────────────────────────────────────────
// Defines what action to take when a threshold fires.
Table automation_rules {
  rule_id      integer [primary key]
  threshold_id integer
  action       varchar   // e.g., 'turn_on', 'turn_off', 'toggle'
  status       boolean
}

Ref: automation_rules.threshold_id > thresholds.threshold_id

// ─── IS_MONITOR (Monitor Mode) ────────────────────────────────────────────────
// Maps a device to an automation rule in monitor mode.
// Monitor mode = automation triggers even without motion presence.
Table is_monitor {
  id        integer [primary key]
  device_id integer
  rule_id   integer
}

Ref: is_monitor.device_id > devices.device_id
Ref: is_monitor.rule_id   > automation_rules.rule_id

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
// Note: now linked to room_id (not device_id like original schema).
Table schedule {
  schedule_id   integer [primary key]
  room_id       integer
  action        varchar   // 'on', 'off', 'toggle'
  schedule_time time
  repeat_type   varchar   // 'daily', 'weekly', 'once', etc.
  status        boolean
}

Ref: schedule.room_id > rooms.room_id

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
Table activity_log {
  log_id      integer  [primary key]
  user_id     integer
  device_id   integer
  action      varchar
  action_time datetime
}

Ref: activity_log.user_id   > users.user_id
Ref: activity_log.device_id > devices.device_id

// ─── IOT TOKENS ───────────────────────────────────────────────────────────────
// API tokens for IoT hardware authentication.
Table iot_tokens {
  id         integer  [primary key]
  device_id  integer
  token      varchar
  label      varchar
  is_active  boolean
  last_seen  datetime
  created_at datetime
}

Ref: iot_tokens.device_id > devices.device_id
```

---

## Tóm tắt thay đổi so với schema gốc

| # | Thay đổi |
|---|---|
| 1 | ❌ Bảng `sensors` bị **xoá** — gộp vào `devices` |
| 2 | `devices.device_type varchar` → thay bằng `type_id` FK → bảng `device_type` |
| 3 | `devices` thêm `brightness` (0–255) và `threshold_id` |
| 4 | `sensor_data.sensor_id` → đổi thành `device_id` |
| 5 | `thresholds.sensor_id` → xoá, thêm `require_motion` |
| 6 | `alerts.sensor_id` + `is_read` → thay bằng `threshold_id` + `value` |
| 7 | `schedule.device_id` → đổi thành `room_id` |
| 8 | `rooms.user_id` + `floors.user_id` → xoá, chuyển sang `room_managements` |
| 9 | ✅ Thêm bảng mới: `device_type`, `room_managements`, `automation_rules`, `is_monitor`, `iot_tokens` |
