# Smart Home App

Ứng dụng quản lý nhà thông minh gồm hai phần:
- **Backend (BE)** — Django REST Framework + Django Channels (WebSocket), chạy ở cổng `8000`
- **Frontend (FE)** — React + Vite + TypeScript + Tailwind CSS, chạy ở cổng `5173`

### Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| Quản lý thiết bị | Sensor (nhiệt độ, độ ẩm, ánh sáng) và Actuator (quạt, đèn, v.v.) |
| Phân cấp không gian | Tầng → Phòng → Thiết bị |
| Ngưỡng & Cảnh báo | Tự động kích hoạt thiết bị khi vượt ngưỡng min/max |
| Lịch hẹn | Hẹn giờ theo phòng hoặc thiết bị cụ thể, lặp theo thứ hoặc hàng ngày |
| Nhật ký hoạt động | Ghi log đầy đủ mọi thao tác với metadata |
| Phân tích dữ liệu | Biểu đồ theo tầng/phòng, theo ngày/tháng/năm, 4 loại chỉ số |
| Realtime | Dữ liệu cảm biến stream qua WebSocket |
| Kết nối IoT | Thiết bị thật đẩy dữ liệu qua HTTP API với token xác thực |

> Kết nối IoT (ESP32, Arduino): xem hướng dẫn tại [backend/README_IOT.md](backend/README_IOT.md)

---

## Mục lục

- [Smart Home App](#smart-home-app)
    - [Tính năng chính](#tính-năng-chính)
  - [Mục lục](#mục-lục)
  - [1. Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
  - [2. Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
  - [3. Cài đặt Backend (BE)](#3-cài-đặt-backend-be)
    - [3.1 Tạo môi trường ảo và cài package](#31-tạo-môi-trường-ảo-và-cài-package)
    - [3.2 Tạo file môi trường](#32-tạo-file-môi-trường)
    - [3.3 Khởi tạo database và chạy server](#33-khởi-tạo-database-và-chạy-server)
    - [3.4 Các lệnh hay dùng](#34-các-lệnh-hay-dùng)
  - [4. Cài đặt Frontend (FE)](#4-cài-đặt-frontend-fe)
    - [Build production](#build-production)
  - [5. Chạy cùng lúc FE + BE](#5-chạy-cùng-lúc-fe--be)
  - [6. Chạy bằng Docker](#6-chạy-bằng-docker)
  - [7. Tài khoản mặc định](#7-tài-khoản-mặc-định)
  - [8. Kết nối IoT thật (không dùng data mẫu)](#8-kết-nối-iot-thật-không-dùng-data-mẫu)
    - [Tạo device và sensor thật](#tạo-device-và-sensor-thật)
    - [Tạo IoT token bằng API (không cần superadmin)](#tạo-iot-token-bằng-api-không-cần-superadmin)
    - [Đẩy dữ liệu từ thiết bị thật (HTTP)](#đẩy-dữ-liệu-từ-thiết-bị-thật-http)
    - [Kiểm tra FE nhận realtime](#kiểm-tra-fe-nhận-realtime)
  - [9. API nhanh](#9-api-nhanh)
  - [Kết nối IoT (ESP32 / Arduino)](#kết-nối-iot-esp32--arduino)

---

## 1. Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| Python  | 3.11+ |
| Node.js | 18+   |
| npm     | 9+    |

---

## 2. Cấu trúc thư mục

```
Smart_Home_App_Design/
├── backend/                ← Django BE
│   ├── auth_app/           ← Đăng nhập / đăng ký / vai trò
│   ├── building_app/       ← Tầng, phòng, lịch hẹn, seed data
│   ├── devices_app/        ← Device (sensor + actuator), IoT Token
│   ├── monitoring_app/     ← SensorData, Threshold, Alert, ActivityLog
│   ├── users_app/          ← Hồ sơ người dùng
│   ├── manage.py
│   └── README_IOT.md       ← Hướng dẫn kết nối IoT
├── FE/                     ← React + Vite FE
│   ├── src/
│   │   ├── app/
│   │   │   ├── screens/   ← Màn hình chính của app
│   │   │   ├── context/   ← AppContext (global state)
│   │   │   ├── data/      ← Mock data (dev)
│   │   │   └── types/
│   │   └── styles/
│   └── package.json
├── .env.example
├── requirements.txt
└── README.md               ← File này
```

---

## 3. Cài đặt Backend (BE)

### 3.1 Tạo môi trường ảo và cài package

```bash
# Tạo venv (chỉ làm một lần)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Cài dependencies
pip install -r requirements.txt
```

### 3.2 Tạo file môi trường

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Chỉnh sửa `.env` nếu cần (mặc định dùng SQLite, không cần thay gì).

### 3.3 Khởi tạo database và chạy server

```bash
cd backend

# Áp dụng migration
python manage.py migrate

# Seed dữ liệu cấu trúc (roles, users, floors, rooms, devices)
# Không seed dữ liệu đo cảm biến mẫu.
python manage.py seed_data

# Chạy server
python manage.py runserver
```

Backend sẽ chạy tại: **http://localhost:8000**

API docs (Swagger): **http://localhost:8000/api/docs/**

### 3.4 Các lệnh hay dùng

```bash
# Tạo migration sau khi thay đổi model
python manage.py makemigrations <app_name>
python manage.py migrate

# Tạo app mới
python manage.py startapp <app_name>

# Revert migration về trạng thái ban đầu
python manage.py migrate <app_name> zero
```

---

## 4. Cài đặt Frontend (FE)

```bash
cd FE

# Cài dependencies (chỉ làm một lần)
npm install

# Chạy dev server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

> **Proxy**: Vite tự động proxy `/api/*` → `http://localhost:8000` nên không cần lo về CORS khi dev.

### Build production

```bash
npm run build
# Output nằm ở FE/dist/
```

---

## 5. Chạy cùng lúc FE + BE

Mở **hai terminal** riêng biệt:

**Terminal 1 — Backend:**
```bash
# Windows
.venv\Scripts\activate
cd backend
python manage.py runserver
```

**Terminal 2 — Frontend:**
```bash
cd FE
npm run dev
```

Truy cập app: **http://localhost:5173**

---

## 6. Chạy bằng Docker

```bash
# Copy .env
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux

# Build và khởi động
docker compose up --build

# Chạy ngầm
docker compose up -d --build
```

Backend: **http://localhost:8000** | FE cần chạy riêng bằng `npm run dev`.

```bash
# Dừng
docker compose down

# Xem log
docker compose logs -f backend

# Chạy lệnh Django trong container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_data
docker compose exec backend python manage.py makemigrations <app_name>
```

---

## 7. Tài khoản mặc định

| Email                    | Password | Vai trò |
|--------------------------|----------|---------|
| `admin@smarthome.com`    | `123456` | Admin   |
| `user@smarthome.com`     | `123456` | User    |

> Thay đổi mật khẩu mặc định trước khi deploy production.

---

## 8. Kết nối IoT thật (không dùng data mẫu)

### Tạo device và sensor thật

1. Đăng nhập FE bằng tài khoản admin hệ thống có sẵn: `admin@smarthome.com / 123456`.
2. Tạo Device kiểu `sensor` trong đúng phòng của bạn.
3. Tạo bản ghi Sensor gắn với Device vừa tạo (ví dụ `temperature`, `humidity`, `light`).

### Tạo IoT token bằng API (không cần superadmin)

```bash
curl -X POST http://localhost:8000/api/iot/tokens/ \
  -H "Content-Type: application/json" \
  -d '{"device": 1, "label": "esp32-phong-khach"}'
```

Xem token:

```bash
curl http://localhost:8000/api/iot/tokens/
```

### Đẩy dữ liệu từ thiết bị thật (HTTP)

```bash
curl -X POST http://localhost:8000/api/iot/push/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <TOKEN_64_CHARS>" \
  -d '{"value": 28.5, "unit": "C", "metric": "temperature"}'
```

### Kiểm tra FE nhận realtime

1. Mở FE tại http://localhost:5173.
2. Mở màn hình Dashboard hoặc Alerts.
3. Gửi payload từ thiết bị thật.
4. Xác nhận số liệu mới xuất hiện trên FE và lịch sử sensor/alert tăng tương ứng.

---

## 9. API nhanh

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login/` | Đăng nhập |
| POST | `/api/auth/register/` | Đăng ký |
| GET | `/api/devices/` | Danh sách thiết bị |
| PATCH | `/api/devices/{id}/` | Cập nhật trạng thái / giá trị |
| GET | `/api/alerts/` | Danh sách cảnh báo |
| GET | `/api/schedules/` | Danh sách lịch hẹn |
| GET | `/api/dashboard/analytics/` | Analytics (query: `scope`, `metric`, `period`) |
| POST | `/api/iot/push/` | IoT push dữ liệu (Token header) |
| POST | `/api/iot/push/batch/` | IoT push dữ liệu theo lô |
| GET/POST | `/api/iot/tokens/` | Danh sách / tạo token thiết bị |
| GET | `/api/floors/` | Danh sách tầng (admin: full CRUD) |
| GET | `/api/rooms/` | Danh sách phòng (admin: full CRUD) |

> Swagger UI: **http://localhost:8000/api/docs/**

---

## Kết nối IoT (ESP32 / Arduino)

Xem hướng dẫn chi tiết tại: **[backend/README_IOT.md](backend/README_IOT.md)**

Nội dung:
- CoreIoT-only architecture và luồng dong bo realtime
- Checklist cau hinh `.env` de ket noi that
- Cach map CoreIoT telemetry ve local devices
- Lenh verify nhanh `coreiot_sync --once` va build FE

