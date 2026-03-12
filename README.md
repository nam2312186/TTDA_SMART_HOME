# Smart Home App

Ứng dụng Smart Home gồm hai phần:
- **Backend (BE)** — Django REST Framework, chạy ở cổng `8000`
- **Frontend (FE)** — React + Vite, chạy ở cổng `5173`

> Kết nối IoT (ESP32, Arduino, MQTT): xem hướng dẫn riêng tại [backend/README_IOT.md](backend/README_IOT.md)

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Cài đặt Backend (BE)](#3-cài-đặt-backend-be)
4. [Cài đặt Frontend (FE)](#4-cài-đặt-frontend-fe)
5. [Chạy cùng lúc FE + BE](#5-chạy-cùng-lúc-fe--be)
6. [Chạy bằng Docker](#6-chạy-bằng-docker)
7. [Tài khoản mặc định](#7-tài-khoản-mặc-định)

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
├── backend/          ← Django BE
│   ├── auth_app/
│   ├── iot_app/
│   ├── building_app/
│   ├── devices_app/
│   ├── monitoring_app/
│   ├── users_app/
│   ├── manage.py
│   └── README_IOT.md  ← Hướng dẫn kết nối IoT
├── FE/               ← React + Vite FE
│   ├── src/
│   └── package.json
├── .env.example
├── requirements.txt
└── README.md         ← File này
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

# Seed dữ liệu mặc định (roles, users, floors, rooms)
python manage.py seed_data

# (Tùy chọn) Tạo superuser Django admin
python manage.py createsuperuser

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

## Kết nối IoT (ESP32 / Arduino / MQTT)

Xem hướng dẫn chi tiết tại: **[backend/README_IOT.md](backend/README_IOT.md)**

Nội dung:
- Cách tạo IoT Token cho thiết bị
- Gửi dữ liệu cảm biến qua HTTP API
- Kết nối MQTT (Mosquitto / HiveMQ)
- Code mẫu ESP32 (Arduino)

### Tạo migration

```
docker compose exec backend python manage.py makemigrations <appname>
```

### Áp dụng migration

```
docker compose exec backend python manage.py migrate
```

### Tạo admin user

```
docker compose exec backend python manage.py createsuperuser
```

### Tạo app mới

```
docker compose exec backend python manage.py startapp <appname>
```

### Revert migration của app

```
docker compose exec backend python manage.py migrate <appname> zero
```

---

# 4. Dừng hệ thống

```
docker compose down
```
