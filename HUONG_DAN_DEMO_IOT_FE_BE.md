# Hướng Dẫn Demo IoT + FE + BE

Tài liệu này mô tả toàn bộ cách kết nối thiết bị IoT với hệ thống Smart Home, bao gồm các tính năng mới nhất: **điều khiển quạt (0-100%)**, **cảm biến nhận diện người (motion)**, và **tự động hoá dựa trên ngưỡng cảm biến**.

---

## 1. Mục tiêu hệ thống

| Tính năng | Mô tả |
|---|---|
| Nhận dữ liệu cảm biến | Nhiệt độ, độ ẩm, ánh sáng, chuyển động (motion) |
| Điều khiển đèn | Bật/tắt + điều chỉnh độ sáng 0–255 |
| Điều khiển quạt | Bật/tắt + điều chỉnh tốc độ 0–255 |
| Cảm biến motion | Nhận diện có/không có người (0 hoặc 1) |
| Tự động hoá | Bật quạt/đèn theo ngưỡng + motion; tắt khi không có người |
| Cảnh báo ngưỡng | Alert khi cảm biến vượt ngưỡng cấu hình |

---

## 2. Cấu trúc tham số gửi lên từ IoT

Thiết bị IoT gửi dữ liệu lên server qua CoreIoT theo định dạng **JSON telemetry**. Tên tham số phải đúng như bảng dưới:

### 2.1 Tham số cảm biến (sensor)

| Tên tham số | Kiểu | Đơn vị | Ví dụ | Ghi chú |
|---|---|---|---|---|
| `temperature` | `float` | `C` | `28.5` | Nhiệt độ phòng |
| `humidity` | `float` | `%` | `65.0` | Độ ẩm |
| `light` | `float` | `lux` | `350.0` | Cường độ ánh sáng |
| `motion` | `int` | — | `0` hoặc `1` | **0 = không người, 1 = có người** |

> ⚠️ **Quan trọng**: Tham số `motion` phải gửi giá trị **0 hoặc 1** (integer hoặc float đều được). Hệ thống coi `> 0` là "có người".

### 2.2 Payload mẫu gửi từ thiết bị

```json
{
  "temperature": 31.2,
  "humidity": 72.0,
  "light": 85.0,
  "motion": 1
}
```

---

## 3. Điều khiển thiết bị từ app → IoT

### 3.1 Điều khiển đèn (Light)

App gửi lệnh `setValue` với giá trị brightness từ **0 đến 255**:

| Slider app (%) | Giá trị gửi server | Trạng thái |
|---|---|---|
| 0% | 0 | Tắt |
| 50% | 128 | Sáng vừa |
| 100% | 255 | Sáng tối đa |

**Payload server → CoreIoT:**
```json
{ "brightness": 255 }
```

### 3.2 Điều khiển quạt (Fan) ← **MỚI**

App gửi lệnh `setFanSpeed` với giá trị tốc độ từ **0 đến 255** (quy đổi từ slider 0–100%):

| Slider app (%) | Giá trị gửi server | Trạng thái |
|---|---|---|
| 0% | 0 | Tắt |
| 25% | 64 | Tốc độ thấp |
| 50% | 128 | Tốc độ trung bình |
| 75% | 191 | Tốc độ cao |
| 100% | 255 | Tốc độ tối đa |

**Công thức chuyển đổi:**
```
server_value = round(percent / 100 * 255)
```

**Payload server → CoreIoT:**
```json
{ "brightness": 191 }
```

> 💡 Quạt dùng chung endpoint `/devices/{id}/brightness/` với đèn — bên thiết bị đọc giá trị `brightness` để điều tốc độ quạt tương ứng.

---

## 4. Logic tự động hoá (Smart Automation) ← **MỚI**

Khi nhận dữ liệu từ cảm biến, hệ thống tự đánh giá và điều khiển thiết bị theo quy tắc:

### 4.1 Quy tắc bật quạt

```
Điều kiện: (Nhiệt độ ≥ ngưỡng max) HOẶC (Độ ẩm ≥ ngưỡng max)
           VÀ motion = 1 (có người)
→ Hành động: Bật tất cả quạt trong hệ thống
```

### 4.2 Quy tắc bật đèn

```
Điều kiện: Ánh sáng ≤ ngưỡng min (tối)
           VÀ motion = 1 (có người)
→ Hành động: Bật tất cả đèn trong hệ thống
```

### 4.3 Quy tắc tắt tự động

```
Điều kiện: motion = 0 (không có người)
           VÀ rule tương ứng đang active (đã cài ngưỡng)
→ Hành động: Tắt quạt (nếu fan rule active)
             Tắt đèn (nếu light rule active)
```

### 4.4 Cài ngưỡng

Ngưỡng được cài trong app tại: **Areas → Chọn phòng → Chọn sensor → Edit**

| Sensor | Field cần cài | Ví dụ |
|---|---|---|
| Temperature | Max threshold | `30` (°C) |
| Humidity | Max threshold | `70` (%) |
| Light | Min threshold | `100` (lux) |

> ⚠️ **Nếu chưa cài ngưỡng → rule đó không hoạt động** (hiển thị `— N/A` trên Dashboard). Không có giá trị mặc định.

---

## 5. Chuẩn bị kết nối

### 5.1 Yêu cầu

- File `.env` đã cấu hình CoreIoT đúng
- Backend đã migrate + seed
- Dependencies đã cài:
  - BE: `pip install -r requirements.txt`
  - FE: `npm install` trong thư mục `FE`

### 5.2 Xác nhận kết nối cloud

```bash
cd backend
python manage.py coreiot_sync --once
# → In ra: "CoreIoT sync once completed"
```

---

## 6. Khởi động hệ thống

### Terminal 1 — Backend

```bash
cd backend
python manage.py runserver
```

Kiểm tra: `http://127.0.0.1:8000/api/docs/`

### Terminal 2 — Frontend

```bash
cd FE
npm run dev
```

> Nếu port 5173 bị chiếm, Vite tự chuyển port → dùng URL Vite in ra.

### Xác nhận WebSocket realtime

Khi mở FE xong, backend log sẽ có: `CONNECT /ws/sensors/`

---

## 7. Kịch bản demo

### (a) Điều khiển đèn/quạt từ app

1. Vào tab **Control**
2. Bật/tắt hoặc kéo slider đèn/quạt
3. Quạt: slider hiện % → server nhận 0–255
4. Đèn: slider hiện % → server nhận 0–255

**Kết quả:** Trạng thái đổi ngay trên app, log backend có lệnh gửi CoreIoT.

### (b) Gửi dữ liệu cảm biến từ thiết bị

```bash
cd backend
python manage.py coreiot_sync --once
```

Hoặc thiết bị tự push telemetry qua CoreIoT:

```json
{
  "temperature": 32.0,
  "humidity": 75.0,
  "light": 50.0,
  "motion": 1
}
```

**Kết quả:** Dashboard cập nhật vòng tròn gauge, Smart Automation tự bật đèn/quạt nếu đã cài ngưỡng.

### (c) Demo nhận diện người (motion) ← **MỚI**

1. Gửi `motion: 1` → Dashboard hiển thị **🟢 Person Detected** (pulse animation)
2. Nếu nhiệt độ/độ ẩm vượt ngưỡng → quạt tự bật
3. Nếu ánh sáng dưới ngưỡng → đèn tự bật
4. Gửi `motion: 0` → **⚫ No Person**, đèn/quạt tự tắt

### (d) Tổng quan giao diện

1. Đăng nhập (admin hoặc user)
2. **Home/Dashboard**: Gauge nhiệt độ/độ ẩm/ánh sáng + Motion card + Smart Automation Status
3. **Control**: Bật/tắt + slider đèn/quạt (0–100% UI, 0–255 server)
4. **Areas → Room → Edit sensor**: Cài ngưỡng cho automation
5. **Alerts**: Cảnh báo khi vượt ngưỡng
6. **More → Reports**: Export PDF báo cáo

---

## 8. Checklist trước khi demo

- [ ] Backend UP (`/api/docs/` trả 200)
- [ ] Frontend UP (mở được URL Vite)
- [ ] `coreiot_sync --once` thành công
- [ ] WebSocket `CONNECT /ws/sensors/` trong log backend
- [ ] Đã cài ngưỡng cho ít nhất 1 sensor (temperature hoặc light)
- [ ] Test bật/tắt đèn → log backend có lệnh CoreIoT
- [ ] Test bật/tắt quạt + slider tốc độ
- [ ] Gửi `motion: 1` + nhiệt/ẩm cao → quạt tự bật
- [ ] Gửi `motion: 0` → đèn/quạt tự tắt
- [ ] Mở Dashboard xác nhận Motion card + Automation Status

---

## 9. Xử lý sự cố

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Port 8000 bị chiếm | Process cũ còn chạy | Tắt process rồi `runserver` lại |
| FE không kết nối WS | Backend chưa chạy duvien Channels | Kiểm tra log backend có `daphne` hoặc channel layer |
| CoreIoT 401 | Token hết hạn | Kiểm tra `COREIOT_TOKEN` trong `.env` |
| Không realtime | WS disconnect | F5 lại FE; kiểm tra log WS |
| motion không nhận | Sai tên tham số | Phải gửi đúng key `"motion"` (chữ thường) |
| Quạt không tự bật | Chưa cài ngưỡng | Vào Edit sensor → điền Max threshold |
| Rule hiển thị N/A | Threshold chưa cài | Vào Areas → chọn sensor → Edit → điền ngưỡng |

---

## 10. Lệnh mẫu hay dùng

```bash
# Backend
cd backend
python manage.py runserver
python manage.py coreiot_sync --once
python manage.py migrate

# Frontend
cd FE
npm run dev
npm install  # nếu thiếu dependencies
```

---

## 11. Tổng kết tính năng đã hoàn thành

| Module | Tính năng | Trạng thái |
|---|---|---|
| 1 | Nhận & hiển thị dữ liệu IoT realtime | ✅ Done |
| 2 | Cảnh báo vượt ngưỡng (Alert) | ✅ Done |
| 3a | Điều khiển đèn (bật/tắt + slider 0–255) | ✅ Done |
| 3b | Điều khiển quạt (bật/tắt + slider 0–255) | ✅ **MỚI** |
| 3c | Cảm biến motion nhận diện người | ✅ **MỚI** |
| 3d | Tự động bật quạt khi nhiệt/ẩm cao + có người | ✅ **MỚI** |
| 3e | Tự động bật đèn khi tối + có người | ✅ **MỚI** |
| 3f | Tự động tắt khi không có người | ✅ **MỚI** |
| 4 | Ghi nhận lịch sử & audit logs | ✅ Done |
| 5 | Giao diện mobile-first (admin + user) | ✅ Done |
| 6 | Phân quyền phòng theo user | ✅ Done |
| 7 | User/Admin đều cài ngưỡng sensor trong phòng mình | ✅ **MỚI** |
| 8 | Export báo cáo PDF | ✅ Done |
