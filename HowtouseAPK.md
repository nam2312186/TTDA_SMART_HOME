# Hướng Dẫn Đóng Gói FE Thành APK (How to use APK)

## 1) Mô hình triển khai phù hợp với dự án hiện tại

- APK chỉ đóng gói phần giao diện (Frontend).
- Backend Django không nhét vào APK, vẫn chạy như server riêng (cloud hoặc máy nội bộ/LAN).
- Cách phù hợp nhất: dùng Capacitor để bọc web app thành Android app, sau đó build APK bằng Android Studio.

## 2) Vì sao không nhét Django backend vào APK

- Django cần môi trường server, process manager, bảo mật, logging, scale và cập nhật riêng.
- Chạy backend bên trong điện thoại rất khó ổn định và không phù hợp production.
- Khuyến nghị chính thức: APK frontend + backend server.

## 3) Điều kiện để app chạy ổn trên điện thoại

- Backend có URL điện thoại truy cập được:
  - Public HTTPS (khuyên dùng), hoặc
  - Cùng mạng LAN (dùng IP nội bộ).
- FE trỏ API về URL backend đó (không dùng localhost của điện thoại).
- Backend bật CORS cho domain/origin của app.

## 4) Chuẩn bị môi trường build APK

### 4.1 Cài phần mềm cần thiết

1. Node.js LTS (khuyên dùng 20+).
2. Java JDK 17 hoặc 21.
3. Android Studio (kèm Android SDK, Platform Tools, Build Tools).
4. Thiết bị Android thật hoặc Emulator để test.

### 4.2 Kiểm tra biến môi trường trên Windows

- JAVA_HOME trỏ tới thư mục JDK (không thêm \bin).
  - Ví dụ: C:\Program Files\Java\jdk-17
- ANDROID_HOME trỏ tới Android SDK.
  - Ví dụ: C:\Users\<User>\AppData\Local\Android\Sdk
- Thêm vào PATH:
  - %JAVA_HOME%\bin
  - %ANDROID_HOME%\platform-tools
  - %ANDROID_HOME%\cmdline-tools\latest\bin

## 5) Thiết lập Frontend để gọi đúng Backend

### 5.1 Chọn URL backend

- Nếu backend public:
  - https://api.tenmiencuaban.com
- Nếu backend LAN:
  - http://192.168.x.x:8000

Lưu ý:
- Không dùng localhost trong app Android để gọi backend trên máy tính.
- localhost trong điện thoại là chính điện thoại.

### 5.2 Khai báo biến môi trường FE (gợi ý)

Tạo hoặc cập nhật file .env.production trong FE:

VITE_API_BASE_URL=http://192.168.1.8:8000/api
VITE_WS_URL=ws://192.168.1.8:8000/ws/sensors/

Thay IP theo máy backend thực tế.

### 5.3 CORS cho Django

Đảm bảo backend cho phép origin của FE/app. Với môi trường dev LAN, có thể cấu hình:

- CORS_ALLOWED_ORIGINS cho localhost/127.0.0.1 khi dev web.
- CORS_ALLOWED_ORIGIN_REGEXES cho dải mạng nội bộ (192.168.x.x, 10.x.x.x, 172.16-31.x.x).

## 6) Cài Capacitor trong FE

Mở terminal tại thư mục FE và chạy:

npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev

Khởi tạo Capacitor (nếu chưa có):

npx cap init

Thêm nền tảng Android:

npx cap add android

## 7) Build FE và đồng bộ sang Android

Tại thư mục FE:

npm install
npm run build
npx cap sync android

Nếu cần mở Android Studio ngay:

npx cap open android

## 8) Build APK bằng Android Studio

1. Mở project Android bằng lệnh npx cap open android.
2. Chờ Gradle sync hoàn tất.
3. Chọn menu Build > Build Bundle(s) / APK(s) > Build APK(s).
4. Android Studio sẽ hiển thị đường dẫn APK sau khi build xong.

Đường dẫn phổ biến:

FE/android/app/build/outputs/apk/debug/app-debug.apk

## 9) Cài APK vào điện thoại

### Cách 1: Cài qua USB (ADB)

1. Bật Developer options và USB debugging trên điện thoại.
2. Kết nối USB.
3. Chạy:

adb devices
adb install -r FE/android/app/build/outputs/apk/debug/app-debug.apk

### Cách 2: Chép file APK thủ công

1. Copy APK vào điện thoại.
2. Mở file APK để cài.
3. Cho phép Install unknown apps nếu Android yêu cầu.

## 10) Kiểm tra sau khi cài

1. App mở được và vào màn hình chính.
2. Login gọi API thành công.
3. Dữ liệu dashboard/control hiển thị.
4. WebSocket realtime nhận dữ liệu (nếu dùng).
5. Không có lỗi CORS hoặc lỗi network.

## 11) Lỗi thường gặp và cách xử lý

### Lỗi 1: SDK location not found

- Thiếu Android SDK hoặc ANDROID_HOME chưa đúng.
- Sửa ANDROID_HOME hoặc file local.properties trong FE/android:
  - sdk.dir=C:\\Users\\<User>\\AppData\\Local\\Android\\Sdk

### Lỗi 2: JAVA_HOME invalid

- JAVA_HOME đang trỏ nhầm tới thư mục có \bin.
- Đổi lại thư mục gốc JDK.

### Lỗi 3: App gọi API thất bại trên điện thoại

- Backend không chạy 0.0.0.0 hoặc không mở firewall.
- FE vẫn trỏ localhost thay vì IP backend.
- CORS backend chưa cho phép origin phù hợp.

### Lỗi 4: WebSocket không kết nối

- Sai URL ws hoặc wss.
- Proxy/ngược tuyến chưa cấu hình cho WebSocket.
- Firewall chặn cổng backend.

## 12) Khuyến nghị triển khai production

- Dùng backend public HTTPS (Nginx + SSL hoặc cloud load balancer).
- FE build bản release và ký APK/AAB.
- Không hardcode thông tin nhạy cảm trong FE.
- Tách cấu hình dev/staging/prod bằng file env riêng.

---

## Kết luận

- FE hiện tại hoàn toàn có thể đóng thành app Android.
- Mô hình đúng cho dự án này là: APK frontend + backend Django server.
- Không nên cố đóng gói backend Django vào APK cho production.
