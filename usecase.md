# Tài liệu Use Case - Hệ thống Smart Home IoT

Tài liệu này mô tả chi tiết các chức năng (Use Cases) mà hệ thống hiện tại đã đáp ứng, bám sát các module thực tế trong mã nguồn dự án.

---

## 1. Tác nhân (Actors)

| Tác nhân | Mô tả |
|---|---|
| **Người dùng (User)** | Người sử dụng hệ thống để điều khiển thiết bị trong các phòng được phân quyền, xem dữ liệu cảm biến và lịch trình. |
| **Quản trị viên (Admin)** | Người có toàn quyền quản lý hệ thống: quản lý User, phân quyền phòng, quản lý Floor/Room, giám sát toàn bộ thiết bị và xem báo cáo tổng hợp. |

---

## 2. Danh sách Chức năng (Use Cases)

### 2.1 Hiển thị dữ liệu tổng hợp toàn hệ thống
- **Mô tả**: Hiển thị cái nhìn tổng quan về trạng thái ngôi nhà.
- **Chi tiết**:
    - Hiển thị chỉ số môi trường trung bình (Nhiệt độ, Độ ẩm) của toàn nhà hoặc khu vực.
    - Thống kê số lượng thiết bị đang hoạt động (Online/On) và thiết bị lỗi/off.
    - Hiển thị thông báo nhanh về các cảnh báo (Alerts) chưa xử lý.
    - Hiển thị trạng thái phát hiện người (Motion) thời gian thực.
- **Module liên quan**: `HomeScreen`, `AdminDashboardScreen`.

### 2.2 Quản lý theo từng khu vực / Tầng / Phòng
- **Mô tả**: Tổ chức hệ thống theo cấu trúc phân cấp để dễ quản lý.
- **Chi tiết**:
    - Quản lý danh sách các Tầng (Floors) và các Phòng (Rooms).
    - Lọc và hiển thị thiết bị theo từng Phòng/Tầng cụ thể.
    - Xem danh sách thiết bị thuộc quyền quản lý của người dùng trong từng khu vực.
- **Module liên quan**: `BuildingApp` (Backend), `AreasScreen`, `RoomsScreen`.

### 2.3 Quản lý thiết bị và Điều khiển trực tiếp
- **Mô tả**: Quản lý chi tiết từng thiết bị và thực hiện điều khiển.
- **Chi tiết**:
    - **Điều khiển (Actuators)**: Bật/Tắt thiết bị, điều chỉnh độ sáng đèn (Brightness 0-100%), điều chỉnh tốc độ quạt (Fan Speed 0-100%).
    - **Giám sát (Sensors)**: Hiển thị giá trị hiện tại của cảm biến (Nhiệt độ, Độ ẩm, Ánh sáng, Chuyển động).
    - **Biểu đồ dữ liệu**: Hiển thị biểu đồ lịch sử sensor (Line Chart) theo thời gian thực để theo dõi xu hướng.
- **Module liên quan**: `DevicesApp` (Backend), `ControlScreen`, `DeviceDetailScreen`.

### 2.4 Quản lý Lịch trình (Schedule)
- **Mô tả**: Thiết lập thời gian tự động điều khiển thiết bị theo phòng.
- **Chi tiết**:
    - Cài đặt lịch bật/tắt thiết bị tự động theo giờ phút cụ thể.
    - Lập lịch lặp lại theo ngày trong tuần (Daily, Weekend, Weekday hoặc Một lần).
    - Áp dụng lịch trình cho toàn bộ thiết bị trong một phòng (Room-based schedule).
- **Module liên quan**: `AutomationApp.Schedule` (Backend), `ScheduleScreen`.

### 2.5 Quản lý Ngưỡng và Tự động hóa (Automation Rules)
- **Mô tả**: Thiết lập các quy tắc tự động dựa trên cảm biến.
- **Chi tiết**:
    - Thiết lập ngưỡng Min/Max cho các cảm biến môi trường.
    - Tùy chọn `require_motion`: Chỉ thực hiện hành động tự động nếu phát hiện có người (Motion detected).
    - Tự động hóa hành động: Ví dụ, tự động bật quạt nếu nhiệt độ > 30°C.
- **Module liên quan**: `Threshold` & `AutomationRule` (Backend), `Logic sync & check`.

### 2.6 Cảnh báo vượt ngưỡng (Alerting)
- **Mô tả**: Hệ thống gửi thông báo khi thông số môi trường bất thường.
- **Chi tiết**:
    - Tự động tạo bản ghi Alert khi giá trị sensor vượt ngoài ngưỡng cho phép.
    - Lưu trữ lịch sử cảnh báo kèm theo giá trị vi phạm và thời gian cụ thể.
    - Đánh dấu đã đọc hoặc xóa cảnh báo khỏi danh sách theo dõi.
- **Module liên quan**: `MonitoringApp.Alert` (Backend), `AlertsScreen`.

### 2.7 Nhật ký hành động ứng dụng (Activity Logs)
- **Mô tả**: Theo dõi mọi tác động vào hệ thống để phục vụ giám sát và bảo mật.
- **Chi tiết**:
    - Lưu lại lịch sử khi người dùng điều khiển thiết bị thủ công (Manual control).
    - Lưu lại lịch sử khi hệ thống tự động điều hành (Scheduled action / Automation).
    - Ghi nhận chi tiết: Ai làm, làm gì (Action), trên thiết bị nào (Device), vào lúc nào.
- **Module liên quan**: `LogsApp.ActivityLog` (Backend), `AuditLogsScreen`.

### 2.8 Quản lý User và Phân quyền (RBAC)
- **Mô tả**: Quản lý người dùng và giới hạn quyền truy cập.
- **Chi tiết**:
    - Phân quyền theo vai trò: **Admin** (quản trị toàn hệ thống) và **User** (người dùng thông thường).
    - **Phân quyền theo phòng (Room Permissions)**: Admin cấp quyền cho User chỉ được xem/điều khiển thiết bị ở những phòng nhất định.
    - Quản lý tài khoản: Thêm mới, sửa thông tin, xóa người dùng.
- **Module liên quan**: `UsersApp`, `RoomManagement` (Backend), `ManageUsersScreen`, `RoomPermissionsScreen`.

### 2.9 Hệ thống báo cáo thông minh (Visualization System)
- **Mô tả**: Cung cấp cái nhìn sâu sắc và phân tích dữ liệu phục vụ báo cáo.
- **Chi tiết**:
    - **Báo cáo trực quan**: Hệ thống biểu đồ đa dạng (Area, Bar, Composed, Scatter chart) hiển thị xu hướng dữ liệu.
    - **Báo cáo đa chiều**: So sánh dữ liệu giữa các thiết bị, các phòng hoặc các tầng với nhau.
    - **Báo cáo động**: Tùy chỉnh phạm vi thời gian (Ngày, Tháng, Năm) và lọc theo từng loại chỉ số (Nhiệt độ, Độ ẩm, Ánh sáng).
    - **Phân tích tương quan**: Biểu đồ Scatter phân tích mối liên hệ giữa các thông số (ví dụ: tương quan giữa Nhiệt độ và Độ ẩm).
    - **Phân tích theo khung giờ**: Biểu đồ Bar theo khung giờ thống kê thời điểm nóng/ẩm nhất trong ngày.
    - **Tải/Xuất dữ liệu**: Hỗ trợ xuất báo cáo định dạng **PDF** (chụp ảnh màn hình báo cáo kèm dữ liệu phân tích hệ thống) và xuất dữ liệu **JSON**.
- **Module liên quan**: `ReportsScreen`, `DetailedVisualizationScreen`, `jspdf/html2canvas` integration.
