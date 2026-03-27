# Smart Home IoT Integration (CoreIoT-only)

Tai lieu nay dung de handoff cho nguoi cam thiet bi IoT va nguoi van hanh backend.
Muc tieu: clone code, dien .env, chay duoc ngay, test duoc ngay ca khi chua co board that.

## 1. Tong quan luong

1. FE dieu khien den/fan qua API Django.
2. Django goi CoreIoT setState de dieu khien actuator tren cloud.
3. Django dong bo telemetry tu CoreIoT ve DB local theo chu ky.
4. Django broadcast qua WebSocket de FE cap nhat realtime.

Quy uoc den:

- brightness (0-255) la nguon su that.
- status suy ra tu brightness:
  - 0 -> off
  - >0 -> on

## 2. Chuan bi truoc khi giao cho nguoi cam thiet bi

Can cung cap cho ho:

1. File `.env` da dien day du (khong dung `.env.example` de chay).
2. Device ID tren CoreIoT (`COREIOT_DEVICE_ID`).
3. Endpoint template telemetry va setState.
4. Mapping ID local trong DB (`COREIOT_LOCAL_*`).
5. Tai khoan CoreIoT (hoac access token) con han.

## 3. Dien .env (theo mau trong .env.example)

### 3.1 Bat CoreIoT

```env
COREIOT_ENABLED=True
COREIOT_BASE_URL=https://app.coreiot.io
```

### 3.2 Chon mot trong hai cach xac thuc

Cach A - Login bang username/password:

```env
COREIOT_LOGIN_URL=/api/auth/login
COREIOT_EMAIL=your_coreiot_username_or_email
COREIOT_PASSWORD=your_password
COREIOT_ACCESS_TOKEN=
```

Cach B - Dung JWT token:

```env
COREIOT_LOGIN_URL=
COREIOT_EMAIL=
COREIOT_PASSWORD=
COREIOT_ACCESS_TOKEN=your_jwt_token_only
```

Luu y quan trong:

1. `COREIOT_ACCESS_TOKEN` chi chua token, khong them chu `Bearer`.
2. Header/prefix nen de:

```env
COREIOT_AUTH_HEADER=Authorization
COREIOT_AUTH_PREFIX=Bearer
COREIOT_TIMEOUT_SECONDS=10
```

### 3.3 Endpoint CoreIoT

```env
COREIOT_DEVICE_ID=your_device_uuid
COREIOT_TELEMETRY_URL_TEMPLATE=/api/plugins/telemetry/DEVICE/{device_id}/values/timeseries?keys=brightness,temperature,humidity,light
COREIOT_SETSTATE_URL_TEMPLATE=/api/plugins/rpc/twoway/{device_id}
COREIOT_SETSTATE_MODE=rpc
COREIOT_SETSTATE_METHOD=setState
```

### 3.4 Key telemetry

```env
COREIOT_BRIGHTNESS_KEY=brightness
COREIOT_TEMPERATURE_KEY=temperature
COREIOT_HUMIDITY_KEY=humidity
COREIOT_LIGHT_KEY=light
```

### 3.5 Map vao ID thiet bi local trong DB backend

```env
COREIOT_LOCAL_LIGHT_ACTUATOR_ID=6
COREIOT_LOCAL_TEMPERATURE_SENSOR_ID=1
COREIOT_LOCAL_HUMIDITY_SENSOR_ID=2
COREIOT_LOCAL_LIGHT_SENSOR_ID=3
```

Neu chua biet ID local, chay:

```bash
python manage.py shell -c "from devices_app.models import Device; print([(d.device_id,d.device_name,d.type.name_type if d.type else None) for d in Device.objects.select_related('type').all()])"
```

### 3.6 Chu ky dong bo

```env
COREIOT_SYNC_INTERVAL_SECONDS=2
COREIOT_AUTO_SYNC_ON_RUNSERVER=True
```

## 4. Chay va verify (khong can board that)

1. Chay backend:

```bash
cd backend
python manage.py runserver
```

2. Kiem tra 1 vong dong bo:

```bash
python manage.py coreiot_sync --once
```

Thanh cong khi thay `CoreIoT sync once completed`.

3. Chay FE:

```bash
cd FE
npm run dev
```

4. Neu can test ingestion local khong qua cloud, dung script:

```bash
cd backend/iot_app/examples
./create_iot_token_and_push_test.ps1 -DeviceId 1 -Metric temperature -Unit C -Value 27.5
```

Hoac stream lien tuc:

```bash
./stream_sensor_to_app.ps1 -Token <IOT_TOKEN> -Metric temperature -Unit C -StartValue 26 -Step 0.3 -IntervalSeconds 5 -Count 20
```

## 5. Test voi thiet bi that

Huong nhanh de nguoi cam board lam theo:

1. Kiem tra board da gui telemetry len CoreIoT (trong dashboard CoreIoT).
2. Chay backend va FE.
3. Kiem tra backend dong bo du lieu cloud ve local (`coreiot_sync --once`).
4. Kiem tra FE co cap nhat nhiet do/do am/anh sang.
5. Thu keo slider den tren FE -> backend goi setState -> board thay doi trang thai den.

## 6. Xu ly loi nhanh

1. Loi 401 login:
  - Thu dung username thay vi email.
  - Kiem tra lai `COREIOT_LOGIN_URL`.
  - Kiem tra token het han.

2. Loi `no data or config missing`:
  - Thieu `COREIOT_DEVICE_ID`.
  - Thieu endpoint template.
  - Chua dien `COREIOT_LOCAL_*`.

3. Khong thay realtime tren FE:
  - Kiem tra backend dang chay ASGI.
  - Kiem tra WebSocket ket noi thanh cong.
  - Kiem tra DB local da co SensorData moi.

## 7. Bao mat khi handoff

1. Khong commit secret that vao `.env.example`.
2. Chi luu secret trong `.env` local.
3. Neu lo token, rotate ngay va cap nhat lai `.env`.

## 8. File lien quan

1. `backend/iot_app/coreiot_client.py`: auth + telemetry + setState.
2. `backend/iot_app/coreiot_sync.py`: dong bo telemetry ve DB.
3. `backend/iot_app/management/commands/coreiot_sync.py`: command sync.
4. `backend/devices_app/views.py`: API dieu khien brightness.
5. `backend/iot_app/apps.py`: auto sync khi runserver.
6. `backend/config/settings.py`: load bien `COREIOT_*`.

## 9. Checklist 10 buoc cho doi IoT

1. Clone code va tao file `.env` tu `.env.example`.
2. Dien `COREIOT_BASE_URL` va bat `COREIOT_ENABLED=True`.
3. Chon 1 kieu auth: login (`COREIOT_LOGIN_URL`, `COREIOT_EMAIL`, `COREIOT_PASSWORD`) hoac JWT (`COREIOT_ACCESS_TOKEN`).
4. Dien `COREIOT_DEVICE_ID` cua thiet bi tren CoreIoT.
5. Dien 2 endpoint template: `COREIOT_TELEMETRY_URL_TEMPLATE` va `COREIOT_SETSTATE_URL_TEMPLATE`.
6. Kiem tra key telemetry (`brightness`, `temperature`, `humidity`, `light`) khop voi CoreIoT dashboard.
7. Dien map ID local: `COREIOT_LOCAL_LIGHT_ACTUATOR_ID`, `COREIOT_LOCAL_TEMPERATURE_SENSOR_ID`, `COREIOT_LOCAL_HUMIDITY_SENSOR_ID`, `COREIOT_LOCAL_LIGHT_SENSOR_ID`.
8. Chay backend: `cd backend` -> `python manage.py runserver`.
9. Chay test cloud 1 lan: `python manage.py coreiot_sync --once` va xac nhan log `CoreIoT sync once completed`.
10. Mo FE (`cd FE`, `npm run dev`) va test thao tac that: keo slider den, xem nhiet do/do am/anh sang cap nhat realtime.

