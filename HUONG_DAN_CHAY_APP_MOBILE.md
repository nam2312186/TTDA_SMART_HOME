# HƯỚNG DẪN CÀI ĐẶT, CHẠY MOBILE APP VÀ GIẢ LẬP IOT (CHO THÀNH VIÊN NHÓM)

Tài liệu này tổng hợp lại những gì đã thiết lập để ứng dụng Mobile kết nối trực tiếp với máy tính qua Wi-Fi (Live Reload) và cách chạy giả lập dữ liệu cảm biến (Real-time). Các bạn thành viên khác khi lấy code về chạy cần làm theo các bước sau.

---

## 1. Lưu ý cực kỳ quan trọng ban đầu (Networking)
- Điện thoại dùng để test và Máy tính chạy code **BẮT BUỘC PHẢI BẮT CHUNG MỘT MẠNG WI-FI**.
- Cần biết địa chỉ IP LAN (IPv4) của máy tính. Trên máy Windows, mở PowerShell gõ `ipconfig` và tìm dòng `IPv4 Address` (ví dụ: `192.168.1.10`). Đầu IP này thay đổi nếu bạn đổi mạng Wi-Fi.

## 2. Thiết lập chạy Backend và Frontend (Host qua mạng LAN)

### Chạy Backend (Django)
Khi khởi động Backend, bắt buộc phải bind ip `0.0.0.0` để điện thoại có thể gọi API. 
Mở Terminal 1:
```powershell
cd backend
.venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:8000
```

### Chạy Frontend (React Vite)
Tương tự, Frontend cũng phải được host trên mạng LAN để tính năng Live Reload hoạt động. Trong `vite.config.ts` đã được sửa `localhost` thành `127.0.0.1` để tránh lỗi proxy ECONNREFUSED.
Mở Terminal 2:
```powershell
cd FE
npm run dev -- --host
```

## 3. Mở cổng Tường Lửa (Windows Defender Firewall) - Rất quan trọng!
Mặc định Windows sẽ chặn thiết bị khác truy cập vào port 5173 và 8000. Phải mở port thì điện thoại mới nhận dữ liệu được.
**Cách làm:**
Mở PowerShell **dưới quyền Administrator** và chạy lệnh:
```powershell
New-NetFirewallRule -DisplayName "SmartHome FE BE" -Direction Inbound -LocalPort 5173,8000 -Protocol TCP -Action Allow
```

## 4. Cấu hình Live Reload cho Mobile App (Capacitor)
Giúp bạn code giao diện xong, save lại là trên màn hình điện thoại tự động thay đổi, KHÔNG CẦN CẮM CÁP BUID APK LẠI.

**Bước 1:** Thay đổi IP trong file `FE/capacitor.config.json` (hoặc `capacitor.config.ts`):
Thêm khối `"server"` và điền IP đang bắt Wi-Fi của máy bạn vào. (VD: IP của máy bạn là 192.168.10.6)
```json
{
  "appId": "com.xxx.app",
  "appName": "SmartHome",
  "webDir": "dist",
  "server": {
    "url": "http://192.168.10.6:5173",
    "cleartext": true
  }
}
```
**Bước 2:** Cắm cáp điện thoại Android vào máy tính (chọn chế độ truyền file, bật USB Debugging).
**Bước 3:** Chạy lệnh đồng bộ và chạy app:
```powershell
npx cap copy
npx cap run android
```
**Trải nghiệm:** App hiện lên điện thoại. Lúc này bạn **có thể rút hoàn toàn cáp USB ra** và đi vòng quanh nhà! Chỉ cần code có sự thay đổi là app trên điện thoại tự Reload qua sóng Wi-Fi.

---

## 5. Hướng dẫn Giả lập Cảm biến (Data Realtime WebSocket)
Vì không có cảm biến IoT vật lý, ta dùng Script PowerShell bắn thẳng Request vào cổng `/api/iot/push/` của Backend để mô phỏng. Khi dữ liệu vào backend, WebSockets sẽ đẩy notification về màn hình điện thoại lập tức.

**Bước 1: Lấy Token cho thiết bị**
Cần có Token của thiết bị 5 (hoặc ID khác tuỳ DB của máy). Có thể tạo/lấy token qua DB hoặc chạy lệnh sau trên PowerShell (thay `"device": 5` bằng cảm biến bạn muốn, ví dụ Temp Sensor có ID=5)
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/iot/tokens/" -Method Post -Headers @{"X-User-Id"="1"; "Content-Type"="application/json"} -Body '{"device": 5}'
```
Lưu lại mã chuỗi dài `"token": "..."` từ kết quả. (Ví dụ: `5db5f....`)

**Bước 2: Chạy vòng lặp bắn dữ liệu (Mở một cửa sổ Terminal mới)**
Dán đoạn script sau vào PowerShell (Nhớ thay token của máy bạn vào chỗ `"Token <Mã_Token_Của_Bạn>"`)
```powershell
while ($true) { 
    $temp = (Get-Random -Minimum 250 -Maximum 350) / 10.0; 
    $body = "{`"value`": $temp, `"unit`": `"°C`", `"metric`": `"temperature`"}"; 
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/iot/push/" -Method Post -Headers @{"Authorization"="Token 5db5f0db435e3db971d10414d9aaa840780f9ff190f993a355485d2ec68cf7ed"; "Content-Type"="application/json"} -Body $body | Out-Null; 
    Write-Host "Đã gửi nhiệt độ: $temp °C"; 
    Start-Sleep -Seconds 3 
}
```
Script này sẽ giả lập việc cảm biến nhích nhiệt độ lên xuống ngẫu nhiên mỗi 3 giây.
Để dừng giả lập, kích chuột vào terminal và ấn `Ctrl + C`.

---

## 6. Checklist cho người mới (Tóm tắt lại)
1. `ipconfig` lấy IP IPv4. Đổi IP vào `capacitor.config.json` => `server.url`.
2. Chạy BE với `0.0.0.0:8000`.
3. Chạy FE với `npm run dev -- --host`.
4. Mở Port 5173 và 8000 qua Filewall Windows.
5. Cắm USB chạy `npx cap run android` rồi rút USB.
6. Chạy Script giả lập sensor để test cơ chế Realtime trên điện thoại.