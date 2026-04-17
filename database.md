# Smart Home IoT — Database Schema (Current)

> Generated: 17/04/2026  
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
  username   varchar  [unique]
  password   varchar
  email      varchar  [unique]
  created_at datetime
  role_id    integer
}

Ref: users.role_id > roles.role_id

// ─── FLOORS ───────────────────────────────────────────────────────────────────
Table floors {
  floor_id   integer [primary key]
  floor_name varchar
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────
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
  
  Note: "Composite Unique Index on (user_id, room_id)"
}

Ref: room_managements.room_id > rooms.room_id
Ref: room_managements.user_id > users.user_id

// ─── DEVICE TYPE ──────────────────────────────────────────────────────────────
Table device_type {
  type_id   integer [primary key]
  name_type varchar
}

// ─── DEVICES ──────────────────────────────────────────────────────────────────
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
Table thresholds {
  threshold_id   integer [primary key]
  min_value      float
  max_value      float
  require_motion boolean   // default: false
}

// ─── SENSOR DATA ──────────────────────────────────────────────────────────────
Table sensor_data {
  data_id     integer  [primary key]
  device_id   integer
  value       float
  unit        varchar
  recorded_at datetime
}

Ref: sensor_data.device_id > devices.device_id

// ─── ALERTS ───────────────────────────────────────────────────────────────────
Table alerts {
  alert_id     integer  [primary key]
  threshold_id integer
  value        float
  message      text
  created_at   datetime
}

Ref: alerts.threshold_id > thresholds.threshold_id

// ─── AUTOMATION RULES ─────────────────────────────────────────────────────────
Table automation_rules {
  rule_id      integer [primary key]
  threshold_id integer
  action       varchar   // e.g., 'turn_on_fan', 'turn_on_light', 'turn_off'
  status       boolean
}

Ref: automation_rules.threshold_id > thresholds.threshold_id

// ─── IS_MONITOR (Monitor Mode) ────────────────────────────────────────────────
Table is_monitor {
  id        integer [primary key]
  device_id integer
  rule_id   integer
  
  Note: "Composite Unique Index on (device_id, rule_id)"
}

Ref: is_monitor.device_id > devices.device_id
Ref: is_monitor.rule_id   > automation_rules.rule_id

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
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
Table iot_app_iottoken {
  id         integer  [primary key]
  device_id  integer  [unique]
  token      varchar  [unique]
  label      varchar
  is_active  boolean
  last_seen  datetime
  created_at datetime
}

Ref: iot_app_iottoken.device_id - devices.device_id
```

---

## Tóm tắt thay đổi so với bản nháp trước

| # | Thay đổi | Chi tiết |
|---|---|---|
| 1 | **IoT Token Relation** | Chuyển quan hệ `iot_app_iottoken` <-> `devices` thành **1-to-1** (`-`) thay vì Many-to-One (`>`). |
| 2 | **Table Name Sync** | Đổi tên bảng `iot_tokens` thành `iot_app_iottoken` để khớp 100% với tên bảng Django sinh ra. |
| 3 | **Threshold Default** | Sửa mặc định `thresholds.require_motion` thành `false` (khớp `default=False` trong code). |
| 4 | **Uniqueness Records** | Thêm ghi chú `unique` và `Composite Index` cho các bảng trung gian như `room_managements` và `is_monitor`. |
| 5 | **Field Integrity** | Đảm bảo `users.username` và `users.email` có nhãn `[unique]`. |
| 6 | **Automation Action** | Cập nhật ví dụ action trong `automation_rules` khớp với logic hiện tại. |
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
