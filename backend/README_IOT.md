# Hướng dẫn kết nối IoT — Smart Home Backend

> ← Quay lại: [README.md gốc](../README.md)

Tài liệu này hướng dẫn cách kết nối thiết bị IoT (ESP32, Arduino, Raspberry Pi…) với hệ thống Smart Home qua **HTTP REST API** hoặc **MQTT**.

---

## Mục lục

1. [Tổng quan luồng dữ liệu](#1-tổng-quan-luồng-dữ-liệu)
2. [Điền ở file nào](#2-điền-ở-file-nào)
3. [Gửi dữ liệu qua HTTP API](#3-gửi-dữ-liệu-qua-http-api)
4. [Kết nối MQTT](#4-kết-nối-mqtt)
5. [Code mẫu ESP32 (Arduino)](#5-code-mẫu-esp32-arduino)
6. [Cấu hình MQTT trong Django](#6-cấu-hình-mqtt-trong-django)
7. [Quản lý threshold và Alert](#7-quản-lý-threshold-và-alert)
8. [API Reference](#8-api-reference)
9. [Nhanh nhất: nhận data sensor lên app trước](#9-nhanh-nhất-nhận-data-sensor-lên-app-trước)
10. [Checklist kết nối BE lên FE thực](#10-checklist-kết-nối-be-lên-fe-thực)
11. [Bộ file mẫu có sẵn để điền](#11-bộ-file-mẫu-có-sẵn-để-điền)

---

## 1. Tổng quan luồng dữ liệu

```
┌─────────────┐          HTTP / MQTT          ┌───────────────────┐
│  ESP32 /    │ ─────────────────────────────► │  Django Backend   │
│  Arduino    │                                │  :8000            │
└─────────────┘                                └────────┬──────────┘
                                                        │ lưu DB
                                                        ▼
                                               ┌───────────────────┐
                                               │  React Frontend   │
                                               │  :5173            │
                                               └───────────────────┘
```

- **HTTP API**: Thiết bị gửi POST request kèm token mỗi lần có dữ liệu mới.
- **MQTT**: Thiết bị publish lên broker → Django subscribe và xử lý liên tục (phù hợp khi cần real-time).

### Phạm vi nhóm hiện tại

Nhóm bạn chỉ cần 2 luồng sau:

1. `Cảm biến ánh sáng` -> `Đèn RGB`
2. `Cảm biến nhiệt độ/độ ẩm` -> `Quạt mini`

Mapping metric nên dùng thống nhất:

- `light` cho cảm biến ánh sáng
- `temperature` và `humidity` cho cảm biến nhiệt độ/độ ẩm

Actuator tương ứng:

- `Đèn RGB` là device kiểu `actuator` (điều khiển qua API on/off/toggle)
- `Quạt mini` là device kiểu `actuator` (điều khiển qua API on/off/toggle)

### FE tự live như thế nào?

Bạn không cần sửa thêm FE nếu dùng đúng endpoint/payload. Luồng tự động đã có sẵn trong BE:

1. Thiết bị gửi data vào `/api/iot/push/` hoặc MQTT topic chuẩn.
2. BE lưu `SensorData` và kiểm tra threshold.
3. BE broadcast realtime qua WebSocket.
4. FE đang mở Dashboard/Alerts sẽ nhận và render dữ liệu mới.

Lưu ý hiện tại FE đã kết nối WebSocket ở mức toàn app (AppContext), nên khi BE nhận IoT thành công thì dữ liệu mới sẽ tự đồng bộ lại trên các màn hình chính mà không cần bấm refresh.

Điều kiện để live thành công:

- Device có Sensor record trong DB.
- Token đúng và còn active.
- Payload có `value` hợp lệ.
- FE đang chạy và mở đúng màn hình dùng dữ liệu realtime.

---

## 2. Điền ở file nào

Phần này trả lời thẳng câu hỏi: cần điền cấu hình ở file nào trong project.

| Bạn cần điền gì | File cần sửa | Ghi chú |
|---|---|---|
| Cấu hình MQTT broker cho BE (host, port, user, pass, client id) | `/.env` (copy từ `/.env.example`) | Đây là chỗ điền chính cho BE. |
| Giá trị mẫu biến MQTT để team tham khảo | `/.env.example` | Team clone repo sẽ nhìn file này để biết phải điền gì. |
| Logic đọc biến môi trường MQTT | `/backend/config/settings.py` | Không điền trực tiếp ở đây, chỉ kiểm tra BE đã load env đúng. |
| Endpoint nhận data HTTP từ thiết bị | `/backend/iot_app/views.py` | Không điền config tại đây, chỉ dùng để hiểu format request. |
| Topic MQTT BE đang subscribe | `/backend/iot_app/mqtt_client.py` | Không điền secret tại đây, chỉ xác nhận topic/payload chuẩn. |
| WiFi, token, URL BE của board ESP32 | File firmware của thiết bị (ví dụ `esp32_main.ino`) | Đây là chỗ điền bắt buộc phía device. |

## 2.1 Chuẩn bị device và sensor thật

Không dùng dữ liệu đo mẫu. Luồng chuẩn cho thiết bị thật:

1. Tạo Device kiểu `sensor` trong hệ thống (qua FE hoặc API).
2. Tạo bản ghi Sensor gắn với Device đó (`temperature`, `humidity`, `light`, ...).
3. Tạo IoT token cho đúng Device bằng API.

Token được tạo qua API, không bắt buộc đăng nhập Django superadmin.

### Tạo token (API)

**Tạo token mới:**
```http
POST /api/iot/tokens/
Content-Type: application/json

{
  "device": 1,
  "label": "ESP32-phong-khach"
}
```

### Xem tất cả token
```http
GET /api/iot/tokens/
```

### Regenerate token khi bị lộ
```http
POST /api/iot/tokens/{id}/regenerate/
```

### Điền token vào firmware ESP32
```cpp
const char* IOT_TOKEN = "a3f9c2e1b4d8...";  // token đầy đủ 64 ký tự
```

---

## 3. Gửi dữ liệu qua HTTP API

### 3.1 Gửi một cảm biến

```http
POST /api/iot/push/
Authorization: Token <iot_token>
Content-Type: application/json

{
  "value": 25.5,
  "unit": "C",
  "metric": "temperature"
}
```

**Response thành công (201):**
```json
{
  "message": "Dữ liệu đã được lưu",
  "data_id": 42,
  "device_id": 1,
  "metric": "temperature",
  "value": 25.5,
  "unit": "C",
  "recorded_at": "2026-03-12T10:00:00Z"
}
```

### 3.2 Gửi nhiều cảm biến cùng lúc (batch)

Phù hợp khi ESP32 có cả nhiệt độ + độ ẩm trong một lần đọc:

```http
POST /api/iot/push/batch/
Authorization: Token <iot_token>
Content-Type: application/json

[
  { "value": 25.5, "unit": "C", "metric": "temperature" },
  { "value": 65.0, "unit": "%", "metric": "humidity" }
]
```

### 3.3 Lỗi thường gặp

| HTTP Status | Nguyên nhân |
|-------------|-------------|
| `401 Unauthorized` | Token sai hoặc bị vô hiệu hóa |
| `400 Bad Request` | Thiếu field `value` hoặc format body sai |
| `400 Bad Request` | Device chưa có bản ghi Sensor trong bảng `sensors` |

### 3.4 Payload mẫu đúng cho nhóm bạn

Ánh sáng (để hiển thị live lên FE):

```json
{ "value": 320, "unit": "lux", "metric": "light" }
```

Nhiệt độ:

```json
{ "value": 29.3, "unit": "C", "metric": "temperature" }
```

Độ ẩm:

```json
{ "value": 66.0, "unit": "%", "metric": "humidity" }
```

Gửi đồng thời nhiệt độ + độ ẩm (batch):

```json
[
  { "value": 29.3, "unit": "C", "metric": "temperature" },
  { "value": 66.0, "unit": "%", "metric": "humidity" }
]
```

---

## 4. Kết nối MQTT

MQTT phù hợp khi cần **real-time** hoặc thiết bị publish liên tục.

### 4.1 Cài MQTT broker

**Option A: Mosquitto (local)**
```bash
# Windows (winget)
winget install EclipseFoundation.Mosquitto

# Ubuntu
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

**Option B: HiveMQ Cloud (free tier)**
- Đăng ký tại https://www.hivemq.com/mqtt-cloud-broker/
- Lấy host, port, username, password

**Option C: EMQX**
```bash
docker run -d --name emqx -p 1883:1883 -p 18083:18083 emqx/emqx
```

### 4.2 Topic chuẩn của hệ thống

| Topic | Chiều | Dữ liệu |
|-------|-------|---------|
| `smarthome/device/{device_id}/sensor/{metric}` | Device → Server | `{"value": 25.5, "unit": "C"}` |
| `smarthome/device/{device_id}/status` | Device → Server | `{"status": true}` (bật) / `{"status": false}` (tắt) |
| `smarthome/device/{device_id}/control` | Server → Device | `{"value": 128}` (độ sáng 0-255) |

**Ví dụ publish từ thiết bị (Sensor):**
```
Topic:   smarthome/device/3/sensor/temperature
Payload: {"value": 28.1, "unit": "C"}
```

### 4.2.1 Điều khiển độ sáng LED qua MQTT

Django sẽ **publish** (gửi) câu lệnh điều khiển độ sáng đèn LED tới thiết bị qua topic `smarthome/device/{device_id}/control`.

**Luồng điều khiển LED:**
```
FE (App) → Kéo slider độ sáng → API call → Django lưu DB + publish MQTT
                                              ↓
ESP32/Arduino: Subscribe topic control → Nhận brightness value → Điều chỉnh PWM LED
```

**Cách thiết bị ESP32 nhận và xử lý:**

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* BROKER = "192.168.1.100";  // MQTT broker address
const int PORT = 1883;
const char* CLIENT_ID = "esp32_light_1";
const int DEVICE_ID = 1;  // Must match Django device ID
const int LED_PIN = 13;   // GPIO pin cho LED PWM

WiFiClient espClient;
PubSubClient client(espClient);

void setup_mqtt() {
  client.setServer(BROKER, PORT);
  client.setCallback(onMqttMessage);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  // Parse topic: smarthome/device/1/control
  if (strncmp(topic, "smarthome/device/", 17) == 0) {
    
    // Parse JSON payload: {"value": 128}
    StaticJsonDocument<128> doc;
    String payloadStr((char*)payload, length);
    deserializeJson(doc, payloadStr);
    
    int brightness = doc["value"] | 0;  // 0-255
    brightness = constrain(brightness, 0, 255);
    
    // Điều chỉnh PWM LED
    analogWrite(LED_PIN, brightness);
    Serial.printf("LED brightness set to: %d\n", brightness);
  }
}

void loop() {
  if (!client.connected()) {
    // Re-connect to broker
    if (client.connect(CLIENT_ID)) {
      // Subscribe to control topic
      char control_topic[64];
      snprintf(control_topic, sizeof(control_topic), 
               "smarthome/device/%d/control", DEVICE_ID);
      client.subscribe(control_topic);
      Serial.printf("Subscribed to: %s\n", control_topic);
    }
  }
  client.loop();
  delay(100);
}
```

**Payload format:**
```json
{
  "value": 255
}
```

- `value`: Giá trị độ sáng từ 0 (OFF) đến 255 (MAX)
- Thiết bị nên convert sang phần trăm (%) nếu cần: `percentage = (value * 100) / 255`

### 4.3 Chạy MQTT listener trên Django

```bash
cd backend
python manage.py mqtt_listen
```

Lệnh này sẽ kết nối broker và tự động lưu mọi dữ liệu vào DB.

---

## 5. Code mẫu ESP32 (Arduino)

### 5.1 Gửi dữ liệu qua HTTP

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* SERVER_URL    = "http://192.168.1.100:8000/api/iot/push/";
const char* IOT_TOKEN     = "iot_token_64_chars_here";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void sendSensorData(float value, const char* unit) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Token ") + IOT_TOKEN);

  StaticJsonDocument<128> doc;
  doc["value"]     = value;
  doc["unit"]      = unit;
  doc["metric"]    = "temperature";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("HTTP %d\n", code);
  http.end();
}

void loop() {
  // Đọc cảm biến (ví dụ DHT11)
  float temperature = 25.5;   // thay bằng đọc thật
  sendSensorData(temperature, "C");
  delay(30000);  // gửi mỗi 30 giây
}
```

### 5.1.2 Mẫu điền nhanh (copy-paste cho team)

```cpp
// ====== TODO-1: Điền WiFi thật ======
const char* WIFI_SSID     = "<TEN_WIFI_NHA_BAN>";
const char* WIFI_PASSWORD = "<MAT_KHAU_WIFI>";

// ====== TODO-2: Điền BE URL ======
// Local LAN: http://192.168.x.x:8000/api/iot/push/
// Deploy:    https://your-domain/api/iot/push/
const char* SERVER_URL    = "http://<IP_BE>:8000/api/iot/push/";

// ====== TODO-3: Điền token của đúng device ======
const char* IOT_TOKEN     = "<TOKEN_64_KY_TU>";

// ====== TODO-4: Điền metric khớp sensor_type trong DB ======
// Ví dụ hợp lệ: temperature | humidity | light
const char* METRIC_NAME   = "temperature";

void sendSensorData(float value, const char* unit) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Token ") + IOT_TOKEN);

  StaticJsonDocument<128> doc;
  doc["value"]  = value;
  doc["unit"]   = unit;
  doc["metric"] = METRIC_NAME;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("HTTP %d | payload=%s\n", code, body.c_str());
  http.end();
}
```

### 5.1.1 Chỗ cần điền khi dùng thiết bị thật

Trong code firmware, điền đúng các hằng số sau trước khi nạp lên board:

1. `WIFI_SSID`, `WIFI_PASSWORD`: WiFi thật nơi đặt thiết bị.
2. `SERVER_URL`: IP LAN hoặc domain của BE, ví dụ `http://192.168.1.100:8000/api/iot/push/`.
3. `IOT_TOKEN`: token 64 ký tự lấy từ API `/api/iot/tokens/`.
4. `metric`: phải khớp loại sensor trong DB (`temperature`, `humidity`, `light`, ...).

### 5.2 Gửi dữ liệu qua MQTT

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* MQTT_BROKER   = "192.168.1.100";  // IP máy chạy Mosquitto
const int   MQTT_PORT     = 1883;

// Thay bằng device_id thật trong DB
const int DEVICE_ID = 3;

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
}

void reconnect() {
  while (!mqtt.connected()) {
    if (mqtt.connect("ESP32-SmartHome")) {
      Serial.println("MQTT connected");
    } else {
      delay(3000);
    }
  }
}

void publishSensor(float value, const char* unit) {
  char topic[64];
  snprintf(topic, sizeof(topic),
           "smarthome/device/%d/sensor/%s", DEVICE_ID, "temperature");

  StaticJsonDocument<64> doc;
  doc["value"] = value;
  doc["unit"]  = unit;

  char payload[64];
  serializeJson(doc, payload);

  mqtt.publish(topic, payload);
  Serial.printf("Published → %s : %s\n", topic, payload);
}

void loop() {
  if (!mqtt.connected()) reconnect();
  mqtt.loop();

  float temp = 26.3;  // đọc từ cảm biến thật
  publishSensor(temp, "C");
  delay(10000);  // mỗi 10 giây
}
```

### 5.2.1 Chỗ cần điền khi dùng MQTT thật

1. `MQTT_BROKER`, `MQTT_PORT`: broker thật (Mosquitto local hoặc cloud).
2. `DEVICE_ID`: đúng device đã tạo trong DB.
3. Topic metric: dùng tên chỉ số, ví dụ `temperature`.
4. Payload bắt buộc có `value`; `unit` tùy chọn.

### 5.2.2 Mẫu topic/payload chuẩn để FE live

- Topic: `smarthome/device/<DEVICE_ID>/sensor/temperature`
- Payload:

```json
{"value": 27.8, "unit": "C"}
```

Nếu publish đúng format trên và listener đang chạy, dữ liệu sẽ đi vào DB rồi lên FE realtime.

---

## 6. Cấu hình MQTT trong Django

Thêm các biến sau vào file `.env`:

```env
MQTT_BROKER=localhost
MQTT_PORT=1883
# MQTT_USERNAME=your_username     # bỏ comment nếu broker yêu cầu auth
# MQTT_PASSWORD=your_password
MQTT_CLIENT_ID=smarthome-django
```

Sau đó trong `settings.py` (hoặc đã có sẵn):

```python
MQTT_BROKER    = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT      = int(os.getenv('MQTT_PORT', 1883))
MQTT_USERNAME  = os.getenv('MQTT_USERNAME', None)
MQTT_PASSWORD  = os.getenv('MQTT_PASSWORD', None)
MQTT_CLIENT_ID = os.getenv('MQTT_CLIENT_ID', 'smarthome-django')
```

Chạy listener:
```bash
python manage.py mqtt_listen
```

---

## 7. Quản lý Threshold và Alert

Khi giá trị cảm biến vượt ngưỡng, hệ thống **tự động tạo Alert** hiển thị trên FE.

### Thiết lập ngưỡng qua API

```http
POST /api/thresholds/
Content-Type: application/json

{
  "sensor": 1,
  "min_value": 15.0,
  "max_value": 35.0
}
```

### Xem Alert

```http
GET /api/alerts/
GET /api/alerts/{id}/
POST /api/alerts/{id}/read/    ← đánh dấu đã đọc
```

---

## 8. API Reference

- POST `/api/iot/push/`
- POST `/api/iot/push/batch/`
- GET `/api/iot/tokens/`
- POST `/api/iot/tokens/`
- POST `/api/iot/tokens/{id}/regenerate/`

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/iot/push/` | Gửi 1 cảm biến (cần token) |
| `POST` | `/api/iot/push/batch/` | Gửi nhiều cảm biến (cần token) |
| `GET`  | `/api/iot/tokens/` | Danh sách token |
| `POST` | `/api/iot/tokens/` | Tạo token mới |
| `GET`  | `/api/iot/tokens/{id}/` | Chi tiết token |
| `DELETE` | `/api/iot/tokens/{id}/` | Xóa token |
| `POST` | `/api/iot/tokens/{id}/regenerate/` | Tạo lại token |
| `POST` | `/api/devices/{id}/on/` | Bật actuator (đèn RGB/quạt mini) |
| `POST` | `/api/devices/{id}/off/` | Tắt actuator (đèn RGB/quạt mini) |
| `POST` | `/api/devices/{id}/toggle/` | Đảo trạng thái actuator |
| `POST` | `/api/devices/{id}/brightness/` | **Điều khiển độ sáng LED** (0-255) |
| `GET`  | `/api/sensor-data/` | Xem toàn bộ dữ liệu cảm biến |
| `GET`  | `/api/sensor-data/latest/` | Dữ liệu mới nhất |
| `GET`  | `/api/sensor-data/{sensor_id}/` | Dữ liệu theo cảm biến |
| `GET`  | `/api/alerts/` | Danh sách alert |
| `POST` | `/api/alerts/{id}/read/` | Đánh dấu đã đọc |
| `GET`  | `/api/thresholds/` | Xem ngưỡng |
| `POST` | `/api/thresholds/` | Tạo ngưỡng |

Xem full Swagger UI tại: **http://localhost:8000/api/docs/**

### 8.1 Endpoint điều khiển độ sáng LED (Brightness Control)

**Đường dẫn API:**
```
POST /api/devices/{device_id}/brightness/
```

**Request Body:**
```json
{
  "brightness": 128
}
```

- `brightness`: Giá trị từ **0 (OFF)** đến **255 (MAX)**
- Hoặc tính bằng phần trăm: `brightness = (percentage * 255) / 100`

**Response (thành công):**
```json
{
  "message": "Ceiling Light brightness set to 128/255",
  "brightness": 128
}
```

**Ví dụ curl:**

```bash
# Đặt độ sáng 128 (50%)
curl -X POST http://localhost:8000/api/devices/1/brightness/ \
  -H "Content-Type: application/json" \
  -d '{"brightness": 128}'

# Đặt độ sáng 255 (MAX)
curl -X POST http://localhost:8000/api/devices/1/brightness/ \
  -H "Content-Type: application/json" \
  -d '{"brightness": 255}'

# Tắt đèn (0)
curl -X POST http://localhost:8000/api/devices/1/brightness/ \
  -H "Content-Type: application/json" \
  -d '{"brightness": 0}'
```

**Luồng hoạt động:**
1. Frontend gửi `POST /api/devices/1/brightness/` với `{"brightness": 128}`
2. Backend lưu giá trị vào database
3. Backend **publish MQTT** lên `smarthome/device/1/control` với payload `{"value": 128}`
4. ESP32/Arduino nhận từ MQTT → apply PWM → đèn sáng đạt 50%

**Ghi chú:**
- Giá trị được tự động clamp vào range 0-255
- MQTT publish thất bại sẽ không ảnh hưởng đến API response (DB vẫn được update)
- Để theo dõi MQTT publish log, chạy: `python manage.py mqtt_listen`

---

## 9. Nhanh nhất: nhận data sensor lên app trước

Mục này ưu tiên đúng nhu cầu hiện tại: chỉ cần thấy sensor data vào app và live lên FE.

1. Chạy BE và FE:

> **Lưu ý:** BE phải chạy qua ASGI/Daphne để WebSocket hoạt động. Đảm bảo đã cài `daphne` và thêm vào `INSTALLED_APPS` (đã cấu hình sẵn). Lệnh `runserver` sẽ tự dùng Daphne nếu đúng.

```bash
cd backend
pip install -r ../requirements.txt   # lần đầu hoặc sau khi pull code mới
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

Khi thấy log `Starting ASGI/Daphne version X.X.X` là đúng. Nếu còn thấy `Starting development server` (WSGI) thì WebSocket sẽ bị 404.

```bash
cd FE
npm run dev
```

2. Tạo token nhanh cho 1 device sensor:

```bash
curl -X POST http://localhost:8000/api/iot/tokens/ \
  -H "Content-Type: application/json" \
  -d '{"device": 1, "label": "quick-test-sensor"}'
```

3. Stream dữ liệu liên tục từ máy dev (chưa cần board thật):

```powershell
cd backend/iot_app/examples
./stream_sensor_to_app.ps1 -Token <TOKEN_VUA_TAO> -Metric temperature -Unit C -IntervalSeconds 5 -Count 30
```

4. Mở FE tại `http://localhost:5173` để xem live.

Nếu script in `OK data_id=...` liên tục và FE cập nhật, nghĩa là pipeline Device -> BE -> FE đã thông.

### Khi chuyển từ test nhanh sang chạy ổn định

1. Dùng firmware stable thay vì template cơ bản.
2. Bật gửi theo chu kỳ cố định (`SEND_INTERVAL_MS`) và có retry khi mạng chập chờn.
3. Không đẩy quá nhanh (< 2 giây/lần) để tránh nghẽn mạng nội bộ và spam DB.
4. Giữ metric cố định đúng loại sensor trong DB (`light`, `temperature`, `humidity`).

---

## 10. Checklist kết nối BE lên FE thực

Làm theo đúng thứ tự sau để xác nhận luồng chạy thực tế, không dùng data mẫu:

1. Chạy BE:

```bash
cd backend
pip install -r ../requirements.txt   # đảm bảo có daphne, channels
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

> Kiểm tra log có dòng `Starting ASGI/Daphne` và `WebSocket CONNECT /ws/sensors/` sau khi FE mở.

2. Chạy FE:

```bash
cd FE
npm run dev
```

3. Tạo device sensor thật và sensor record thật trong hệ thống.

4. Tạo token cho thiết bị bằng API `/api/iot/tokens/` và copy token vào firmware.

4.1. Command mẫu tạo token nhanh:

```bash
curl -X POST http://localhost:8000/api/iot/tokens/ \
  -H "Content-Type: application/json" \
  -d '{"device": 1, "label": "esp32-phong-khach"}'
```

5. Nạp firmware lên thiết bị, kiểm tra log serial thấy gửi thành công mỗi chu kỳ.

6. Kiểm tra BE nhận dữ liệu:

```bash
curl http://localhost:8000/api/sensor-data/latest/
```

Nếu trả về bản ghi mới có `value`, `recorded_at` thay đổi liên tục nghĩa là BE đã nhận thành công.

7. Mở FE tại `http://localhost:5173`, vào Dashboard/Alerts:
  - Giá trị sensor cập nhật mới theo thời gian thực.
  - Khi vượt ngưỡng, alert mới xuất hiện.

8. Nếu FE không cập nhật:
  - Kiểm tra thiết bị gửi đúng `Authorization: Token <...>`.
  - Kiểm tra device đó đã có bản ghi sensor trong DB.
  - Kiểm tra payload có `value` hợp lệ.
  - Kiểm tra BE log khi nhận IoT push.

---

## 11. Bộ file mẫu có sẵn để điền

Mình đã soạn sẵn file template trong thư mục sau:

- `/backend/iot_app/examples/device_config_http.h.example`
- `/backend/iot_app/examples/esp32_http_template.ino`
- `/backend/iot_app/examples/device_config_mqtt.h.example`
- `/backend/iot_app/examples/esp32_mqtt_template.ino`
- `/backend/iot_app/examples/create_iot_token_and_push_test.ps1`
- `/backend/iot_app/examples/stream_sensor_to_app.ps1`
- `/backend/iot_app/examples/esp32_light_sensor_stable.ino`
- `/backend/iot_app/examples/esp32_temp_humidity_stable.ino`

### 11.0 Firmware ổn định khuyên dùng cho nhóm bạn

Với scope hiện tại, dùng 2 file này trước:

1. `esp32_light_sensor_stable.ino` cho luồng `cảm biến ánh sáng -> đèn RGB`
2. `esp32_temp_humidity_stable.ino` cho luồng `cảm biến nhiệt độ/độ ẩm -> quạt mini`

Hai file đã có sẵn:

- WiFi reconnect
- HTTP timeout
- retry nhiều lần khi gửi thất bại
- log serial rõ để debug

Việc cần điền vẫn nằm trong `device_config_http.h` (copy từ `.example`).

### 10.1 Dùng HTTP (khuyên dùng để setup nhanh)

1. Copy file config:

```bash
cd backend/iot_app/examples
copy device_config_http.h.example device_config_http.h
```

2. Mở `device_config_http.h`, điền các dòng `TODO-HTTP-1..4`:
  - `WIFI_SSID`, `WIFI_PASSWORD`
  - `SERVER_URL`
  - `IOT_TOKEN`
  - `METRIC_NAME`

3. Mở `esp32_http_template.ino`, nạp lên board.

4. Mở Serial Monitor:
  - Nếu thấy `HTTP 201` nghĩa là BE nhận thành công.
  - Sau đó FE sẽ tự live dữ liệu mới.

5. Muốn chạy ổn định luôn, thay bằng firmware profile:
  - `esp32_light_sensor_stable.ino`
  - `esp32_temp_humidity_stable.ino`

### 10.2 Dùng MQTT

1. Copy file config:

```bash
cd backend/iot_app/examples
copy device_config_mqtt.h.example device_config_mqtt.h
```

2. Mở `device_config_mqtt.h`, điền các dòng `TODO-MQTT-1..4`:
  - `WIFI_SSID`, `WIFI_PASSWORD`
  - `MQTT_BROKER`, `MQTT_PORT`, (option) `MQTT_USERNAME`, `MQTT_PASSWORD`
  - `DEVICE_ID`
  - `METRIC_NAME`

3. Chạy listener ở BE:

```bash
cd backend
python manage.py mqtt_listen
```

4. Nạp `esp32_mqtt_template.ino` lên board và xem log publish.

### 10.3 Test nhanh từ máy dev (không cần board)

Dùng script PowerShell đã chuẩn bị để tạo token và push thử 1 mẫu:

```powershell
cd backend/iot_app/examples
./create_iot_token_and_push_test.ps1 -DeviceId 1 -Metric temperature -Value 28.1
```

Nếu script trả dữ liệu ở `/api/sensor-data/latest/` nghĩa là BE OK, sau đó mở FE để xác nhận realtime.
