# Smart Home IoT - Lược Đồ Cơ Sở Dữ Liệu (Hiện Tại)

Cập nhật: 17/04/2026  
Nguồn đối chiếu: Django models và schema SQLite đang chạy tại backend/db.sqlite3

## 1. Lược đồ nghiệp vụ (các bảng ứng dụng)

```dbml
Table roles {
  role_id   integer [primary key]
  role_name varchar
}

Table users {
  user_id    integer  [primary key]
  username   varchar  [unique]
  email      varchar  [unique]
  password   varchar
  created_at datetime
  role_id    integer [note: "cho phép null"]
}
Ref: users.role_id > roles.role_id

Table floors {
  floor_id   integer [primary key]
  floor_name varchar
}

Table rooms {
  room_id    integer [primary key]
  room_name  varchar
  floor_id   integer
}
Ref: rooms.floor_id > floors.floor_id

Table room_managements {
  id       integer [primary key]
  user_id  integer
  room_id  integer

  Note: "unique_together(user_id, room_id)"
}
Ref: room_managements.user_id > users.user_id
Ref: room_managements.room_id > rooms.room_id

Table device_type {
  type_id    integer [primary key]
  name_type  varchar
}

Table thresholds {
  threshold_id    integer [primary key]
  min_value       float [note: "cho phép null"]
  max_value       float [note: "cho phép null"]
  require_motion  boolean [default: false]
}

Table devices {
  device_id      integer [primary key]
  device_name    varchar
  type_id        integer [note: "cho phép null"]
  room_id        integer
  status         boolean
  brightness     integer [note: "điều khiển runtime dùng thang 0-100"]
  threshold_id   integer [note: "cho phép null"]
  created_at     datetime
}
Ref: devices.type_id > device_type.type_id
Ref: devices.room_id > rooms.room_id
Ref: devices.threshold_id > thresholds.threshold_id

Table sensor_data {
  data_id       integer [primary key]
  device_id     integer
  value         float
  unit          varchar [note: "cho phép null"]
  recorded_at   datetime
}
Ref: sensor_data.device_id > devices.device_id

Table alerts {
  alert_id       integer [primary key]
  threshold_id   integer [note: "cho phép null"]
  value          float [note: "cho phép null"]
  message        text
  created_at     datetime
}
Ref: alerts.threshold_id > thresholds.threshold_id

Table automation_rules {
  rule_id        integer [primary key]
  status         boolean
  action         varchar
  threshold_id   integer [note: "cho phép null"]
}
Ref: automation_rules.threshold_id > thresholds.threshold_id

Table is_monitor {
  id         integer [primary key]
  device_id  integer
  rule_id    integer

  Note: "unique_together(device_id, rule_id)"
}
Ref: is_monitor.device_id > devices.device_id
Ref: is_monitor.rule_id > automation_rules.rule_id

Table schedule {
  schedule_id     integer [primary key]
  room_id         integer [note: "cho phép null"]
  action          varchar
  schedule_time   time
  repeat_type     varchar
  status          boolean
}
Ref: schedule.room_id > rooms.room_id

Table activity_log {
  log_id        integer [primary key]
  user_id       integer [note: "cho phép null"]
  device_id     integer [note: "cho phép null"]
  action        varchar
  action_time   datetime
}
Ref: activity_log.user_id > users.user_id
Ref: activity_log.device_id > devices.device_id

Table iot_app_iottoken {
  id          integer [primary key]
  token       varchar [unique]
  device_id   integer [unique]
  label       varchar
  is_active   boolean
  last_seen   datetime [note: "cho phép null"]
  created_at  datetime
}
Ref: iot_app_iottoken.device_id - devices.device_id
```

## 2. Ghi chú đã đồng bộ với code

- Bảng iot_app_iottoken dùng quan hệ một-một với devices.
- Bảng alerts không có cột is_read lưu bền; trạng thái đã đọc/chưa đọc hiện được theo dõi phía FE.
- Các model monitoring gồm thresholds, sensor_data, alerts hiện đang để managed=True trong code.
- Phân loại sensor/actuator trong API được suy ra từ type, threshold và env mapping, không có cột riêng trong DB.

## 3. Snapshot dữ liệu runtime (DB dev hiện tại)

- Tổng số thiết bị: 7
- Bộ actuator cho các kênh điều khiển: Demo Light 1, Demo Mini Fan 1, Demo Light 2, Demo Mini Fan 2
- Bộ sensor đã khôi phục: Demo Temp Sensor Device, Demo Humidity Sensor Device, Demo Light Sensor Device

## 4. Các bảng hệ thống Django (không thuộc nghiệp vụ)

SQLite đang chạy còn chứa các bảng framework như:

- auth_group
- auth_permission
- auth_user và các bảng m2m liên quan
- django_admin_log
- django_content_type
- django_migrations
- django_session

Đây là các bảng mức framework, không thuộc mô hình nghiệp vụ Smart Home.
