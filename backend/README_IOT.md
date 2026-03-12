# Hướng dẫn kết nối IoT — Smart Home Backend

> ← Quay lại: [README.md gốc](../README.md)

Tài liệu này hướng dẫn cách kết nối thiết bị IoT (ESP32, Arduino, Raspberry Pi…) với hệ thống Smart Home qua **HTTP REST API** hoặc **MQTT**.

---

## Mục lục

1. [Tổng quan luồng dữ liệu](#1-tổng-quan-luồng-dữ-liệu)
2. [Tạo IoT Token cho thiết bị](#2-tạo-iot-token-cho-thiết-bị)
3. [Gửi dữ liệu qua HTTP API](#3-gửi-dữ-liệu-qua-http-api)
4. [Kết nối MQTT](#4-kết-nối-mqtt)
5. [Code mẫu ESP32 (Arduino)](#5-code-mẫu-esp32-arduino)
6. [Cấu hình MQTT trong Django](#6-cấu-hình-mqtt-trong-django)
7. [Quản lý threshold và Alert](#7-quản-lý-threshold-và-alert)
8. [API Reference](#8-api-reference)

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

---

## 2. Tạo IoT Token cho thiết bị

Mỗi thiết bị cần **một token riêng** để xác thực. Token được tạo qua Django Admin hoặc API.

### Cách 1: Qua Django Admin

1. Vào **http://localhost:8000/admin/**
2. Đăng nhập bằng superuser
3. Vào **IoT Tokens** → **Add IoT Token**
4. Chọn `Device` và điền `Label` (ví dụ: `ESP32-livingroom`)
5. Lưu → token được tự động sinh

### Cách 2: Qua API (Admin dùng)

**Tạo token mới:**
```http
POST /api/iot/tokens/
Content-Type: application/json

{
  "device": 1,
  "label": "ESP32-phong-khach"
}
```

**Xem tất cả token:**
```http
GET /api/iot/tokens/
```

**Regenerate token (khi bị lộ):**
```http
POST /api/iot/tokens/{id}/regenerate/
```

**Lưu token vào firmware ESP32** (ví dụ):
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
  "sensor_id": 1,
  "value": 25.5,
  "unit": "°C"
}
```

**Response thành công (201):**
```json
{
  "message": "Dữ liệu đã được lưu",
  "data_id": 42,
  "sensor_id": 1,
  "value": 25.5,
  "unit": "°C",
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
  { "sensor_id": 1, "value": 25.5, "unit": "°C" },
  { "sensor_id": 2, "value": 65.0, "unit": "%" }
]
```

### 3.3 Lỗi thường gặp

| HTTP Status | Nguyên nhân |
|-------------|-------------|
| `401 Unauthorized` | Token sai hoặc bị vô hiệu hóa |
| `400 Bad Request` | Thiếu field `sensor_id`, `value`, hoặc `unit` |
| `404 Not Found` | `sensor_id` không thuộc device của token này |

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
| `smarthome/device/{device_id}/sensor/{sensor_id}` | Device → Server | `{"value": 25.5, "unit": "°C"}` |
| `smarthome/device/{device_id}/status` | Device → Server | `{"status": true}` (bật) / `{"status": false}` (tắt) |

**Ví dụ publish từ thiết bị:**
```
Topic:   smarthome/device/3/sensor/7
Payload: {"value": 28.1, "unit": "°C"}
```

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

const int SENSOR_ID = 1;

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
  doc["sensor_id"] = SENSOR_ID;
  doc["value"]     = value;
  doc["unit"]      = unit;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("HTTP %d\n", code);
  http.end();
}

void loop() {
  // Đọc cảm biến (ví dụ DHT11)
  float temperature = 25.5;   // thay bằng đọc thật
  sendSensorData(temperature, "°C");
  delay(30000);  // gửi mỗi 30 giây
}
```

### 5.2 Gửi dữ liệu qua MQTT

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* MQTT_BROKER   = "192.168.1.100";  // IP máy chạy Mosquitto
const int   MQTT_PORT     = 1883;

// Thay bằng device_id và sensor_id thật trong DB
const int DEVICE_ID = 3;
const int SENSOR_ID = 7;

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
           "smarthome/device/%d/sensor/%d", DEVICE_ID, SENSOR_ID);

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
  publishSensor(temp, "°C");
  delay(10000);  // mỗi 10 giây
}
```

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

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/iot/push/` | Gửi 1 cảm biến (cần token) |
| `POST` | `/api/iot/push/batch/` | Gửi nhiều cảm biến (cần token) |
| `GET`  | `/api/iot/tokens/` | Danh sách token |
| `POST` | `/api/iot/tokens/` | Tạo token mới |
| `GET`  | `/api/iot/tokens/{id}/` | Chi tiết token |
| `DELETE` | `/api/iot/tokens/{id}/` | Xóa token |
| `POST` | `/api/iot/tokens/{id}/regenerate/` | Tạo lại token |
| `GET`  | `/api/sensor-data/` | Xem toàn bộ dữ liệu cảm biến |
| `GET`  | `/api/sensor-data/latest/` | Dữ liệu mới nhất |
| `GET`  | `/api/sensor-data/{sensor_id}/` | Dữ liệu theo cảm biến |
| `GET`  | `/api/alerts/` | Danh sách alert |
| `POST` | `/api/alerts/{id}/read/` | Đánh dấu đã đọc |
| `GET`  | `/api/thresholds/` | Xem ngưỡng |
| `POST` | `/api/thresholds/` | Tạo ngưỡng |

Xem full Swagger UI tại: **http://localhost:8000/api/docs/**
