# FIXED REPORT - Smart Home IoT System

Ngay cap nhat: 14/04/2026  
He thong: Smart Home TTDA (FE + BE + CoreIoT)

Bao cao nay doi chieu truc tiep voi BUG_REPORT.md va xac nhan trang thai fix theo tung loi.

---

## Tong ket nhanh

- So loi trong bug report: 6
- So loi da fix: 6/6
- Trang thai hien tai: Da dat yeu cau chuc nang, dong bo realtime, va uu tien thao tac manual.

---

## Doi chieu tung loi trong BUG_REPORT.md

### Loi 1 - Slider bi reset sau khi keo (CRITICAL)
Trang thai: DA FIX

Ket qua:
- Co manual override 120s de chan server overwrite sau thao tac nguoi dung.
- Override duoc set khi keo slider va duoc gia han sau khi API thanh cong.
- WebSocket update se bo qua brightness neu override dang con hieu luc.

File lien quan:
- FE/src/app/context/AppContext.tsx

### Loi 2 - CoreIoT -> FE khong dong bo brightness (CRITICAL)
Trang thai: DA FIX

Ket qua:
- Backend sync brightness tu CoreIoT, normalize 0-255 -> 0-100 de luu DB/FE.
- Backend broadcast brightness normalized len WebSocket.
- FE nhan event device_status va cap nhat lai slider (truong hop khong bi manual override).

File lien quan:
- backend/iot_app/coreiot_sync.py
- FE/src/app/context/AppContext.tsx

### Loi 3 - Motion sensor khong hoat dong (CRITICAL)
Trang thai: DA FIX

Ket qua:
- Da co luong sync motion trong coreiot_sync.
- Da co logging debug motion (checking, processed/not found).
- Motion duoc upsert vao SensorData va broadcast sensor update de FE va automation su dung.

File lien quan:
- backend/iot_app/coreiot_sync.py
- FE/src/app/context/AppContext.tsx

### Loi 4 - Backend thieu sync Motion tu CoreIoT (MEDIUM)
Trang thai: DA FIX

Ket qua:
- Da them motion_key va motion_sensor_id.
- Da xu ly du lieu motion tu telemetry va day vao luong sensor event.

File lien quan:
- backend/iot_app/coreiot_sync.py

### Loi 5 - FE khong hien thi Motion (MEDIUM)
Trang thai: DA FIX

Ket qua:
- Da co motion indicator tren HomeScreen (Person Detected / No Motion).
- Du lieu motion duoc render dua tren currentValue cua motion sensor.

File lien quan:
- FE/src/app/screens/HomeScreen.tsx

### Loi 6 - Fan speed khong sync tu CoreIoT khi doi tren server (HIGH)
Trang thai: DA FIX

Ket qua:
- Da them telemetry fan_speed trong sync.
- Da cap nhat DB va broadcast device_status cho fan.
- FE co endpoint rieng fan-speed va cap nhat slider realtime.

File lien quan:
- backend/iot_app/coreiot_sync.py
- backend/devices_app/views.py
- backend/devices_app/urls.py
- FE/src/app/services/api.ts
- FE/src/app/screens/ControlScreen.tsx

---

## Chuan hoa gia tri slider va payload (tranh lech scale)

He thong hien tai su dung 2 thang do dung muc dich:

- UI/DB: 0-100% (de user de dieu khien)
- Payload gui CoreIoT: 0-255 (muc PWM phan cung)

Chieu gui len CoreIoT:
- FE gui 0-100
- Backend convert 0-100 -> 0-255 truoc khi goi CoreIoT

Chieu dong bo tu CoreIoT ve FE:
- Sync nhan 0-255
- Backend normalize 0-255 -> 0-100 de luu DB va broadcast

File lien quan:
- backend/devices_app/views.py
- backend/iot_app/coreiot_client.py
- backend/iot_app/coreiot_sync.py
- FE/src/app/screens/ControlScreen.tsx

---

## Cau hinh moi truong (.env.example) da du cho runtime

Da bo sung va doi chieu day du bien CoreIoT ma backend dang doc, bao gom:

- COREIOT_SETSTATE_VALUE_METHOD=setValue
- COREIOT_FAN_SPEED_KEY
- COREIOT_MOTION_KEY
- COREIOT_LOCAL_FAN_ACTUATOR_ID
- COREIOT_LOCAL_MOTION_SENSOR_ID

Trang thai: .env.example da khop voi backend/config/settings.py cho luong CoreIoT hien tai.

---

## Ket luan

Tat ca cac loi da neu trong BUG_REPORT.md da duoc fix va da thong nhat theo thiet ke hien tai:

- Sensor dong vai tro trigger/dieu kien.
- Actuator (den/quat) la thanh phan thuc thi bat/tat/chinh muc.
- Manual override duoc uu tien cao nhat trong cua so 120s.
- Realtime CoreIoT <-> BE <-> FE hoat dong theo huong 2 chieu.
