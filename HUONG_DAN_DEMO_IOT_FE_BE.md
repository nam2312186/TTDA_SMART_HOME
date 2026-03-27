# Hướng Dẫn Demo IoT + FE + BE

Tài liệu này dùng để demo các cảnh (a)-(d) bạn yêu cầu, đồng thời hướng dẫn từng bước thực hiện từ backend, frontend đến IoT (CoreIoT + giả lập local).

## 1. Mục tiêu demo

- (a) Bật/tắt thiết bị ở app -> trạng thái thay đổi hai chiều (app <-> server <-> cloud).
- (b) Thử nghiệm thay đổi giá trị cảm biến (nóng/lạnh, sáng/tối) -> app cập nhật realtime.
- (c) Thay đổi trên server/giả lập -> app thay đổi, và ngược lại.
- (d) Giới thiệu các giao diện đã hoàn thành và tổng kết tiến độ.

## 2. Chuẩn bị trước demo

- Đã có file `.env` cấu hình CoreIoT đúng.
- Đã migrate + seed backend.
- Đã cài dependencies:
  - BE: `pip install -r requirements.txt`
  - FE: `npm install` trong thư mục `FE`
- Đã xác nhận kết nối cloud:
  - `python manage.py coreiot_sync --once` trả về `CoreIoT sync once completed`.

## 3. Khởi động hệ thống

### 3.1 Terminal Backend

```bash
cd backend
python manage.py runserver
```

Kiểm tra nhanh:

- Swagger: `http://127.0.0.1:8000/api/docs/`

### 3.2 Terminal Frontend

```bash
cd FE
npm run dev
```

Lưu ý:

- Nếu `5173` đã bị chiếm, Vite sẽ tự nhảy sang cổng khác (ví dụ `5174`).
- Dùng URL mà Vite in ra để demo.

### 3.3 Xác nhận realtime websocket

Khi mở FE, backend sẽ có log websocket `CONNECT /ws/sensors/`.

## 4. Kịch bản demo chi tiết

## (a) Cảnh bật/tắt thiết bị, đồng bộ hai chiều

### Mục tiêu

- Bật/tắt trên app thì trạng thái thiết bị cập nhật ngay.
- Nếu cloud trả telemetry mới, app tiếp tục đồng bộ theo server.

### Cách làm

1. Mở màn hình điều khiển thiết bị trên FE.
2. Thử bật/tắt fan/đèn trên app.
3. Thử kéo slider độ sáng đèn (0-255 tương ứng OFF -> ON).
4. Quan sát:
   - Trạng thái trên app đổi ngay.
   - Log backend có call setState CoreIoT.
   - Nếu cloud trả về giá trị mới, app cập nhật lại theo server.

### Kết quả mong đợi

- OFF: brightness = 0, status = off.
- ON: brightness > 0, status = on.

## (b) Cảnh thay đổi giá trị cảm biến (nóng/lạnh, sáng/tối)

### Mục tiêu

- Giá trị nhiệt độ/độ ẩm/ánh sáng thay đổi, app cập nhật realtime.

### Cách làm (không cần thiết bị thật)

Có 2 cách:

1. Đồng bộ từ CoreIoT:

```bash
cd backend
python manage.py coreiot_sync --once
```

2. Giả lập local bằng script stream:

```bash
cd backend/iot_app/examples
./stream_sensor_to_app.ps1 -Token <IOT_TOKEN> -Metric temperature -Unit C -StartValue 26 -Step 0.3 -IntervalSeconds 2 -Count 10
```

Thay metric theo cảnh:

- Nhiệt độ: `temperature`, unit `C`
- Độ ẩm: `humidity`, unit `%`
- Ánh sáng: `light`, unit `lux`

### Kết quả mong đợi

- Dashboard/Alerts trên FE đổi số theo từng lần push.
- Lịch sử sensor tăng dần theo `data_id`.

## (c) Cảnh thay đổi trên server/giả lập và ngược lại

### Mục tiêu

- Thao tác từ server -> app đổi.
- Thao tác từ app -> server/cloud đổi.

### Cách làm

1. Server -> app:
   - Chạy script stream local (như phần b).
   - Hoặc chạy `coreiot_sync --once` để kéo dữ liệu cloud về.
2. App -> server/cloud:
   - Trên FE đổi trạng thái đèn/fan.
   - Kiểm tra backend log và DB cập nhật.

### Kết quả mong đợi

- Hai hướng đều cập nhật dữ liệu nhất quán.
- Không cần refresh trang vẫn thấy đổi dữ liệu.

## (d) Giới thiệu giao diện đã hiện thực + tổng kết tiến độ

### Gợi ý flow demo cho người dùng

1. Đăng nhập.
2. Home dashboard (tổng quan).
3. Control screen (bật/tắt + slider đèn).
4. Alerts (cảnh báo ngưỡng).
5. History/logs (lịch sử thao tác và sensor).
6. Rooms/Floors/Devices (quản lý cấu trúc nhà).

### Tổng kết tiến độ hiện tại

- Module 1 - Nhận và hiển thị dữ liệu từ thiết bị: Đã làm được. Dữ liệu từ CoreIoT và dữ liệu giả lập local đều hiển thị trên ứng dụng theo thời gian thực.
- Module 2 - Kiểm tra dữ liệu vượt ngưỡng cho phép: Đã làm được. Hệ thống đã có cơ chế cảnh báo ngưỡng và hiển thị trong màn hình Alerts.
- Module 3 - Điều khiển thiết bị: Đã làm được. Bật/tắt thiết bị và chỉnh mức đèn từ ứng dụng đã đồng bộ qua backend và cloud.
- Module 4 - Ghi nhận hoạt động: Đã làm được. Lịch sử thao tác và dữ liệu cảm biến được ghi nhận và xem lại qua logs/history.
- Module 5 - Ứng dụng Web/Mobile: Đã làm được phần ứng dụng web với các luồng người dùng chính (dashboard, control, alerts, history, quản lý phòng/tầng/thiết bị).

### Định hướng cải tiến giao diện FE (giai đoạn tiếp theo)

- Tối ưu bố cục màn hình điều khiển để thao tác bật/tắt và chỉnh mức nhanh hơn trên mobile.
- Tăng độ trực quan của dashboard bằng nhóm thẻ dữ liệu theo ngữ cảnh (nhiệt độ, độ ẩm, ánh sáng, trạng thái thiết bị).
- Cải thiện trạng thái phản hồi khi điều khiển (loading/success/error) để người dùng thấy rõ thiết bị đã nhận lệnh.
- Chuẩn hóa màu sắc cảnh báo và ưu tiên thông tin quan trọng giúp theo dõi thuận mắt hơn.
- Rà soát trải nghiệm tổng thể để giao diện tiện dụng, dễ hiểu hơn cho người dùng không chuyên kỹ thuật.

## 5. Checklist demo nhanh (trước khi thuyết trình)

1. Backend UP (`/api/docs/` trả 200).
2. Frontend UP (mở được trang Vite URL hiện tại).
3. `coreiot_sync --once` thành công.
4. WebSocket CONNECT trong log backend.
5. Test 1 lần stream local (3-5 mẫu) thành công.
6. Test bật/tắt đèn và fan trên FE.
7. Test thay đổi giá trị temperature/humidity/light.
8. Mở Alerts và xác nhận có cập nhật.
9. Mở History/Logs và xác nhận có bản ghi.
10. Chốt flow (a)-(d) theo thứ tự trên.

## 6. Xử lý sự cố nhanh

- Lỗi port 8000 đang bị chiếm:
  - Tắt process đang listen 8000 rồi chạy lại `runserver`.
- FE không chạy 5173:
  - Dùng port Vite tự động cấp (ví dụ 5174).
- CoreIoT 401:
  - Kiểm tra token/username-password, `COREIOT_LOGIN_URL`, và token hết hạn.
- Không realtime:
  - Kiểm tra websocket connect và log backend.

## 7. Lệnh mẫu hay dùng

```bash
# BE
cd backend
python manage.py runserver
python manage.py coreiot_sync --once

# FE
cd FE
npm run dev

# Giả lập local push 1 mẫu
cd backend/iot_app/examples
./create_iot_token_and_push_test.ps1 -DeviceId 1 -Metric temperature -Unit C -Value 27.5
```

## 8. Chốt nội dung khi báo cáo tiến độ

Khi thuyết trình/demo, có thể chốt ngắn gọn như sau:

1. Hệ thống đã hoàn thành 5 module cốt lõi (nhận dữ liệu, kiểm tra ngưỡng, điều khiển thiết bị, ghi nhận hoạt động, ứng dụng FE/BE).
2. Demo đã xác nhận đầy đủ luồng hai chiều giữa IoT - Backend - Frontend.
3. Giai đoạn tiếp theo tập trung cải thiện giao diện FE theo hướng thuận mắt và tiện dụng hơn cho người dùng cuối.
