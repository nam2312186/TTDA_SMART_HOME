# Smart Home IoT Integration (CoreIoT-only)

Tài liệu này dùng để handoff cho đội ngũ kĩ thuật nhận trách nhiệm phần cứng thiết bị IoT và người vận hành backend.
Mục tiêu: clone code, điền `.env`, chạy được ngay, test được luồng 2 chiều ngay cả khi chưa có board thật. Nắm được luồng xử lý mới nhất bao gồm quạt, cảm biến chuyển động (motion), và các luật tự động hoá.

## 1. Tổng quan luồng tính năng mới nhất

1. FE điều khiển **đèn (light)** và **quạt (fan)** qua API Django.
2. Cảm biến gửi dữ liệu: nhiệt độ, độ ẩm, ánh sáng, và **nhận diện người (motion)**.
3. Django gọi CoreIoT `setState` để điều khiển actuator trên cloud.
4. Django đồng bộ telemetry từ CoreIoT về DB local theo chu kỳ.
5. Django broadcast qua WebSocket để FE cập nhật realtime.
6. **[MỚI] Tự động hóa**: Xảy ra ở frontend/websocket layer. Khi nhận `motion=1` + cảm biến vượt ngưỡng cài đặt → gọi API điều khiển bật quạt/đèn.

### Quy ước thiết bị điều khiển (Đèn & Quạt):

- Trạng thái điều khiển (sáng/tốc độ) được truyền qua **`brightness` (0-255)**. Đối với quạt, hãy map giá trị này thành tốc độ quạt (0% = 0, 100% = 255).
- Trạng thái logic suy ra từ tham số này:
  - `0` -> off
  - `>0` -> on

## 2. Chuẩn bị trước khi giao cho người cầm thiết bị

Cần cung cấp cho họ:

1. File `.env` đã điền đầy đủ (không dùng `.env.example` nguyên bản để chạy).
2. Device ID trên CoreIoT (`COREIOT_DEVICE_ID`).
3. Endpoint template telemetry và setState.
4. Mapping ID local trong DB (`COREIOT_LOCAL_*`).
5. Tài khoản CoreIoT (hoặc access token) còn hạn.

## 3. Điền .env (theo mẫu trong .env.example)

### 3.1 Bật CoreIoT

```env
COREIOT_ENABLED=True
COREIOT_BASE_URL=https://app.coreiot.io
```

### 3.2 Chọn một trong hai cách xác thực

Cách A - Login bằng username/password:

```env
COREIOT_LOGIN_URL=/api/auth/login
COREIOT_EMAIL=your_coreiot_username_or_email
COREIOT_PASSWORD=your_password
COREIOT_ACCESS_TOKEN=
```

Cách B - Dùng JWT token trực tiếp:

```env
COREIOT_LOGIN_URL=
COREIOT_EMAIL=
COREIOT_PASSWORD=
COREIOT_ACCESS_TOKEN=your_jwt_token_only
```

Lưu ý quan trọng:

1. `COREIOT_ACCESS_TOKEN` chỉ chứa token nguyên bản, không thêm chữ `Bearer`.
2. Header/prefix nên để:

```env
COREIOT_AUTH_HEADER=Authorization
COREIOT_AUTH_PREFIX=Bearer
COREIOT_TIMEOUT_SECONDS=10
```

### 3.3 Endpoint CoreIoT

```env
COREIOT_DEVICE_ID=your_device_uuid
# Chú ý bổ sung tham số 'motion' vào danh sách keys
COREIOT_TELEMETRY_URL_TEMPLATE=/api/plugins/telemetry/DEVICE/{device_id}/values/timeseries?keys=brightness,temperature,humidity,light,motion
COREIOT_SETSTATE_URL_TEMPLATE=/api/plugins/rpc/twoway/{device_id}
COREIOT_SETSTATE_MODE=rpc
COREIOT_SETSTATE_METHOD=setState
```

### 3.4 Key telemetry (Cấu hình keys trả về từ IoT)

```env
COREIOT_BRIGHTNESS_KEY=brightness
COREIOT_TEMPERATURE_KEY=temperature
COREIOT_HUMIDITY_KEY=humidity
COREIOT_LIGHT_KEY=light
COREIOT_MOTION_KEY=motion
```

### 3.5 Map vào ID thiết bị local trong DB backend

Để backend tự động map dữ liệu IoT chính xác vào đúng device_id tĩnh trên hệ thống:

```env
COREIOT_LOCAL_LIGHT_ACTUATOR_ID=6
COREIOT_LOCAL_FAN_ACTUATOR_ID=7
COREIOT_LOCAL_TEMPERATURE_SENSOR_ID=1
COREIOT_LOCAL_HUMIDITY_SENSOR_ID=2
COREIOT_LOCAL_LIGHT_SENSOR_ID=3
COREIOT_LOCAL_MOTION_SENSOR_ID=4
```

Nếu chưa biết ID local, hãy lấy từ database với lệnh:

```bash
python manage.py shell -c "from devices_app.models import Device; print([(d.device_id,d.device_name,d.type.name_type if d.type else None) for d in Device.objects.select_related('type').all()])"
```

### 3.6 Chu kỳ đồng bộ

```env
COREIOT_SYNC_INTERVAL_SECONDS=2
COREIOT_AUTO_SYNC_ON_RUNSERVER=True
```

## 4. Chạy và kiểm tra (không cần board thật)

1. Chạy backend:

```bash
cd backend
python manage.py runserver
```

2. Kiểm tra 1 vòng đồng bộ:

```bash
python manage.py coreiot_sync --once
```

Thành công khi thấy `CoreIoT sync once completed` hiện ở dòng cuối cùng.

3. Chạy FE:

```bash
cd FE
npm run dev
```

## 5. Cấu hình & Test thiết bị thật (Dành cho đội phần cứng IoT)

Hướng dẫn nhanh để đội phần cứng làm theo:

1. **Chuẩn bị dữ liệu gửi lên:** Hãy cấu hình firmware gửi lên payload JSON, ví dụ:
```json
{
  "temperature": 32.5,
  "humidity": 68.0,
  "light": 150.0,
  "motion": 1
}
```
*(Lưu ý: `motion` truyền `1` là có người, `0` là không người)*

2. **Cách nhận lệnh:** Khi người dùng bật tắt hoặc gạt slider trên App, server sẽ gọi RPC twoway xuống thiết bị chứa params kiểu:
```json
{ "method": "setState", "params": { "brightness": 128 } }
```
Bên phần cứng cần bắt `method` này và dùng `brightness` (0-255) để điều khiển tốc độ quạt / độ sáng đèn.

3. Kểm tra backend đồng bộ dữ liệu cloud về local (`coreiot_sync --once`).
4. Kiểm tra trang Admin Dashboard xem vòng tròn gauge và motion card có hiện "Person Detected".
5. Test Auto Rule: Để cảm biến nhiệt độ báo > 30 độ và vẫy tay trước cảm biến chuyển động (`motion=1`), nếu hệ thống setup đúng, Backend sẽ tự động phát lại RPC setState để **Bật quạt** tức thời.

## 6. Xử lý lỗi nhanh

1. Lỗi 401 login:
  - Thử dùng username thay vì email.
  - Kiểm tra lại `COREIOT_LOGIN_URL`.
  - Kiểm tra token hết hạn.

2. Lỗi `no data or config missing`:
  - Thiếu `COREIOT_DEVICE_ID`.
  - Thiếu endpoint template.
  - Chưa điền đủ `COREIOT_LOCAL_*`.

3. Không thấy realtime trên FE:
  - Kiểm tra backend đang chạy ASGI.
  - Kiểm tra WebSocket kết nối thành công (`CONNECT /ws/sensors/`).
  - Kiểm tra DB local đã có SensorData mới. Cần đảm bảo thiết bị truyền đúng key `"motion"` chữ thường.

## 7. Bảo mật khi handoff

1. Không commit secret thật vào `.env.example`.
2. Chỉ lưu secret trong `.env` local.
3. Nếu lộ token, rotate ngay trên web app CoreIoT và cập nhật lại `.env` cho mọi người.

## 8. File Backend liên quan đên IoT

1. `backend/iot_app/coreiot_client.py`: auth + telemetry + setState.
2. `backend/iot_app/coreiot_sync.py`: xử lý json payload, map ID.
3. `backend/iot_app/management/commands/coreiot_sync.py`: command line.
4. `backend/devices_app/views.py`: API điều khiển brightness/tốc độ của cả đèn và quạt.

## 9. Checklist 10 bước kết nối (Dành cho đội IoT)

1. Clone code và tạo file `.env` từ `.env.example`.
2. Điền đầy đủ API key, Device ID (`COREIOT_DEVICE_ID`).
3. Sửa `COREIOT_TELEMETRY_URL_TEMPLATE` có đủ các khoá `keys=...,motion`.
4. Khai báo nốt vào DB map ID: `COREIOT_LOCAL_FAN_ACTUATOR_ID`, `COREIOT_LOCAL_MOTION_SENSOR_ID`.
5. Bật board gửi telemetry (nhiệt, ẩm, sáng, motion).
6. Khởi động DB, chạy backend: `python manage.py runserver`.
7. Khởi động vòng đồng bộ bằng lệnh: `python manage.py coreiot_sync --once`
8. Mở giao diện `FE`, truy cập Menu **Areas**.
9. Thêm các thiết bị Fan và Motion Sensor (nếu chưa có). Set Min/Max threshold cho chúng trong phần Edit.
10. Lấy tay che Motion Sensor, xem quạt có tự tắt (Off rule) và đưa tay vẫy để xem quạt có tự phục hồi tốc độ (On rule) không.
