
  # Smart Home App Design

Ứng dụng quản lý thiết bị nhà thông minh — hỗ trợ nhiều tầng, nhiều phòng, lịch trình bật/tắt và cảnh báo theo ngưỡng.

Thiết kế gốc trên Figma: https://www.figma.com/design/3ScsDAmvmMqG65c2ijWU66/Smart-Home-App-Design

---

## Yêu cầu

- [Node.js](https://nodejs.org/) phiên bản 18 trở lên
- npm (đi kèm với Node.js)

---

## Cài đặt và chạy

### 1. Cài dependencies

```bash
npm install
```

### 2. Chạy môi trường phát triển

```bash
npm run dev
```

Mở trình duyệt tại: http://localhost:5173

### 3. Đăng nhập demo

| Trường | Giá trị |
|--------|---------|
| Email  | `user@smarthome.com` |
| Password | *(nhập bất kỳ)* |

---

## Build production

```bash
npm run build
```

File output xuất ra thư mục `dist/` — dùng để deploy lên hosting hoặc đóng gói APK.

Kiểm tra build trước khi deploy:

```bash
npm run preview
```

---

## Cấu trúc dự án

```
src/
├── app/
│   ├── screens/       # Các màn hình (HomeScreen, AreasScreen, ...)
│   ├── components/    # Component dùng chung (BottomNav, UI...)
│   ├── context/       # AppContext — quản lý state toàn app
│   ├── data/          # mockData.ts — dữ liệu giả lập
│   └── types/         # Định nghĩa kiểu dữ liệu TypeScript
└── styles/            # CSS, Tailwind, theme
```

---

## Tính năng

- Quản lý thiết bị theo tầng và phòng
- Bật/tắt thiết bị từng cái hoặc theo nhóm
- Thiết lập ngưỡng cảnh báo cho cảm biến (nhiệt độ, độ ẩm...)
- Lịch trình tự động bật/tắt theo giờ và ngày trong tuần
- Xem lịch sử hoạt động và biểu đồ dữ liệu cảm biến
- Dashboard báo cáo với biểu đồ (Bar, Line, Pie)
- Quản lý người dùng (Admin)

---

## Kết nối Backend (khi có)

Tạo file `.env` ở thư mục gốc:

```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
```

Sau đó cập nhật `src/app/context/AppContext.tsx` — thay `mockData` bằng API call thực.
  