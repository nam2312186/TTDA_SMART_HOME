# Tài Liệu Use Case - Hệ Thống Smart Home IoT

Tài liệu này mô tả hành vi đã được triển khai thực tế trong mã nguồn FE và BE hiện tại.

## 1. Tác nhân

| Tác nhân | Mô tả |
|---|---|
| Admin | Toàn quyền quản lý user, phân quyền phòng, tầng, phòng, thiết bị, lịch, cảnh báo, nhật ký và phân tích dashboard. |
| User | Chỉ được truy cập các phòng đã được gán trong room_managements; chỉ xem và điều khiển tài nguyên trong phạm vi sở hữu. |
| Thiết bị IoT hoặc Gateway | Gửi payload sensor lên backend thông qua các endpoint token IoT. |
| CoreIoT Cloud | Nguồn telemetry bên ngoài và điểm thực thi lệnh RPC theo cấu hình mapping. |

## 2. Xác thực và phiên làm việc

### UC-01 Đăng ký và đăng nhập
- Đăng ký tài khoản, đăng nhập, đăng xuất và lấy thông tin người dùng hiện tại.
- API: auth/register, auth/login, auth/logout, auth/me.
- Màn hình FE: LoginScreen, RegisterScreen, ForgotPasswordScreen.

## 3. Quản lý người dùng và phân quyền

### UC-02 Quản lý user và role
- Admin có thể xem danh sách, cập nhật user và xem role.
- API: users, users/{id}, roles.
- Màn hình FE: AdminManageUsersScreen, ManageUsersScreen.

### UC-03 Gán quyền phòng
- Admin gán một user vào một hoặc nhiều phòng.
- API: users/{id}/room-permissions, admin/assign-manager.
- Màn hình FE: RoomPermissionsScreen.

### UC-04 Áp dụng truy cập theo phạm vi phòng
- Dữ liệu của non-admin được lọc theo các phòng đang sở hữu.
- Áp dụng cho floors, rooms, devices, alerts, logs, schedules, dashboard và cả dữ liệu realtime từ websocket.
- Màn hình FE fallback: AccessDeniedScreen.

## 4. Cấu trúc tòa nhà và danh mục thiết bị

### UC-05 Quản lý tầng và phòng
- CRUD tầng và phòng.
- API: floors, floors/{id}, rooms, rooms/{id}, floors/{id}/rooms.
- Màn hình FE: AreasScreen, RoomsScreen, ManageFloorsScreen.

### UC-06 Quản lý thiết bị và loại thiết bị
- CRUD thiết bị và xem danh sách loại thiết bị.
- API: device-types, devices, devices/{id}, rooms/{id}/devices.
- Màn hình FE: DevicesScreen, AddDeviceScreen, EditDeviceScreen, DeleteDeviceConfirmScreen, DeviceDetailScreen.

## 5. Điều khiển và giám sát thời gian thực

### UC-07 Điều khiển actuator
- Bật, tắt, toggle, chỉnh brightness và chỉnh fan speed.
- API: devices/{id}/on, off, toggle, brightness, fan-speed.
- Hỗ trợ route 2 kênh method và key cho đèn và quạt.
- Màn hình FE: ControlScreen.

### UC-08 Giám sát luồng sensor
- Xem danh sách dữ liệu sensor, bản ghi mới nhất và lịch sử theo từng thiết bị.
- API: sensor-data, sensor-data/latest, sensor-data/device/{id}.
- Màn hình FE: HomeScreen, AdminDashboardScreen, DeviceDetailScreen.

## 6. Ngưỡng, tự động hóa và lịch trình

### UC-09 Cấu hình ngưỡng
- Tạo và cập nhật ngưỡng min/max, có tùy chọn require_motion.
- API: thresholds, thresholds/{id}.

### UC-10 Sinh cảnh báo khi vượt ngưỡng
- Backend tạo alert khi vi phạm ngưỡng, có cơ chế cooldown.
- API: alerts, alerts/{id} delete.
- FE: AlertsScreen, AlertDetailScreen, badge chưa xem được theo dõi phía client.
- Lưu ý: DB không có cột is_read lưu bền.

### UC-11 Định nghĩa rule tự động hóa
- Hành động của rule liên kết với threshold và quan hệ monitor.
- API: automation-rules, automation-rules/{id}, is-monitor.

### UC-12 Lập lịch theo phòng
- Thiết lập hành động theo thời gian cho thiết bị trong phòng với repeat type như once, daily, weekday, weekend.
- API: schedules, schedules/{id}.
- Màn hình FE: ScheduleScreen, ScheduleFormScreen.

## 7. Nhật ký và kiểm toán

### UC-13 Theo dõi hoạt động
- Ghi nhận thao tác thủ công và thao tác hệ thống kèm thông tin actor và thiết bị.
- API: logs, logs/device/{id}, logs/user/{id}.
- Màn hình FE: AuditLogsScreen.

## 8. Dashboard và báo cáo

### UC-14 Dashboard vận hành
- Thẻ tổng quan, trạng thái thiết bị, metric nhiệt độ, độ ẩm, ánh sáng và phân tích tổng hợp.
- API: dashboard/summary, dashboard/device-status, dashboard/temperature, dashboard/humidity, dashboard/light, dashboard/analytics.
- Màn hình FE: HomeScreen, AdminDashboardScreen.

### UC-15 Trực quan hóa nâng cao và xuất báo cáo
- So sánh chi tiết theo thiết bị, phòng, tầng và chu kỳ ngày, tháng, năm.
- Biểu đồ báo cáo và xuất PDF bằng html2canvas và jspdf.
- Màn hình FE: DetailedVisualizationScreen, ReportsScreen.

## 9. Nhận dữ liệu IoT và tích hợp cloud

### UC-16 Đẩy dữ liệu IoT theo token
- Thiết bị hoặc gateway đẩy payload đơn hoặc theo lô.
- API: iot/push, iot/push/batch.

### UC-17 Quản lý token IoT
- Admin có thể xem danh sách, chỉnh sửa và regenerate token theo từng thiết bị.
- API: iot/tokens, iot/tokens/{id}, iot/tokens/{id}/regenerate.

### UC-18 Đồng bộ CoreIoT và cầu nối RPC
- Kéo telemetry từ CoreIoT và map vào sensor hoặc actuator local.
- Gửi lệnh RPC theo method mapping đã cấu hình, bao gồm cả method ở kênh phụ.

## 10. Giới hạn hiện tại và lưu ý

- Kiểm tra ngưỡng có require_motion chỉ hoạt động khi local DB có thiết bị hỗ trợ motion.
- Trạng thái đã đọc/chưa đọc của alert hiện xử lý phía FE, không lưu trong bảng alerts.
- Phân loại sensor/actuator được suy ra từ device type, threshold hoặc env mapping; không có cột is_sensor trong DB.

## 11. Danh sách chức năng bám theo module đề tài

### 11.1 Hiển thị dữ liệu tổng hợp toàn hệ thống
- Có dashboard tổng quan cho trạng thái thiết bị, chỉ số môi trường, cảnh báo và analytics.
- Dữ liệu có phân quyền theo phạm vi user và toàn quyền cho admin.
- Thành phần liên quan: UC-14, HomeScreen, AdminDashboardScreen, dashboard/summary, dashboard/analytics.

### 11.2 Quản lý theo khu vực, máy móc, tầng, phòng
- Quản lý cây phân cấp Floor -> Room -> Device.
- Lọc và xem dữ liệu theo từng tầng, phòng, thiết bị.
- Thành phần liên quan: UC-05, UC-06, AreasScreen, RoomsScreen, RoomDevicesScreen, DevicesScreen.

### 11.3 Quản lý chi tiết từng thiết bị và điều khiển
- Thiết bị điều khiển được hỗ trợ bật, tắt, toggle, brightness, fan speed.
- Thiết bị cảm biến hiển thị dữ liệu mới nhất và dữ liệu lịch sử để vẽ biểu đồ.
- Thành phần liên quan: UC-07, UC-08, DeviceDetailScreen, ControlScreen.

### 11.4 Quản lý lịch trình điều khiển tự động
- Lập lịch theo ngày và thời điểm trong ngày, áp dụng theo cấp phòng.
- Hỗ trợ repeat type: once, daily, weekday, weekend.
- Thành phần liên quan: UC-12, ScheduleScreen, ScheduleFormScreen, schedules API.

### 11.5 Quản lý thiết lập ngưỡng và hành động đi kèm
- Cấu hình ngưỡng min hoặc max cho sensor.
- Gắn rule hành động tự động hóa theo ngưỡng.
- Tùy chọn require_motion khi có thiết bị motion trong hệ thống.
- Thành phần liên quan: UC-09, UC-11, thresholds API, automation-rules API.

### 11.6 Cảnh báo vượt ngưỡng
- Tạo cảnh báo khi dữ liệu vượt ngưỡng, có cooldown chống lặp cảnh báo quá dày.
- Có màn danh sách và chi tiết cảnh báo, kèm badge chưa xem phía FE.
- Thành phần liên quan: UC-10, AlertsScreen, AlertDetailScreen.

### 11.7 Quản lý nhật ký hành động ứng dụng
- Ghi nhận log thao tác user và thao tác hệ thống ở tầng ứng dụng backend.
- Không phụ thuộc vào log tự động của IoT server.
- Thành phần liên quan: UC-13, logs API, AuditLogsScreen.

### 11.8 Quản lý user và phân quyền
- Tách rõ vai trò Admin và User.
- Phân quyền theo phòng để giới hạn dữ liệu và thao tác đúng phạm vi.
- Thành phần liên quan: UC-02, UC-03, UC-04, RoomPermissionsScreen.

### 11.9 Chức năng chuyên biệt HTTT
- Báo cáo trực quan: dashboard card, chart theo thời gian, bảng phân tích.
- Báo cáo đa chiều: so sánh theo thiết bị, phòng, tầng.
- Báo cáo động: thay đổi khung thời gian ngày, tháng, năm; lọc theo metric.
- Tùy chỉnh hiển thị: chọn chế độ so sánh và tập đối tượng hiển thị.
- Tải và xuất báo cáo: xuất PDF từ màn report.
- Thành phần liên quan: UC-15, ReportsScreen, DetailedVisualizationScreen.

### 11.10 Chức năng chuyên biệt CNPM
- Design pattern đang áp dụng:
- Context pattern ở FE để quản lý trạng thái toàn cục trong AppContext.
- Event-driven pattern qua websocket để cập nhật realtime.
- Strategy theo cấu hình cho điều khiển IoT qua mapping method và telemetry key.
- Khả năng mở rộng đa thiết bị:
- Bảng device_type và devices cho phép mở rộng loại thiết bị mà không đổi cấu trúc lớn.
- API điều khiển tách theo hành vi, hỗ trợ mở rộng kênh điều khiển bổ sung.
- Khả năng triển khai linh động:
- Phân quyền room-based phù hợp hộ gia đình hoặc tổ chức nhiều khu vực.
- Dùng env mapping và bảng cấu hình dữ liệu để giảm sửa code khi triển khai.
- Tùy biến qua cài đặt và CSDL:
- Điều chỉnh ngưỡng, lịch, rule, quyền phòng, mapping IoT chủ yếu qua DB và biến môi trường.

### 11.11 Chức năng chuyên biệt AI
- Trạng thái hiện tại: chưa tích hợp mô hình AI hoặc ML chuyên dụng trong runtime.
- Hiện có lớp thông minh theo luật: cảnh báo vượt ngưỡng, tự động hóa theo threshold và lịch.
- Hướng mở rộng phù hợp đề tài:
- Dự báo xu hướng nhiệt độ và độ ẩm theo lịch sử sensor.
- Gợi ý ngưỡng tối ưu theo từng phòng hoặc nhóm thiết bị.
- Phát hiện bất thường theo hành vi sử dụng thiết bị và chuỗi sự kiện.

## 12. Chức năng bổ sung ngoài yêu cầu cốt lõi

- Tài liệu API tự động qua Swagger và Redoc.
- Token IoT theo từng thiết bị để bảo vệ luồng push dữ liệu.
- Đồng bộ hai chiều với CoreIoT cho cả telemetry và RPC control.

## 13. Bảng module và hàm chức năng app đã đáp ứng

Phần này bám sát đúng các module bạn yêu cầu, liệt kê theo mức hàm hoặc class xử lý chính ở Backend và FE.

### Module 1 - Nhận và hiển thị dữ liệu từ thiết bị

- Chức năng: nhận dữ liệu IoT từ thiết bị hoặc cloud và hiển thị realtime trên Web or Mobile.
- Backend hàm đáp ứng:
- iot_app.views._get_device_by_token
- iot_app.views.IoTPushView.post
- iot_app.views.IoTPushBatchView.post
- iot_app.coreiot_sync.sync_once
- iot_app.coreiot_sync._upsert_sensor
- monitoring_app.views.SensorDataListView.get
- monitoring_app.views.SensorDataLatestView.get
- monitoring_app.views.SensorDataByDeviceView.get
- dashboard_app.views.DashboardSummaryView.get
- dashboard_app.views.DashboardTemperatureView.get
- dashboard_app.views.DashboardHumidityView.get
- dashboard_app.views.DashboardLightView.get
- FE hàm đáp ứng:
- AppContext.refreshAll
- AppContext.updateDeviceFromEvent
- AppContext.updateDeviceStatusFromEvent
- AppContext.connect (websocket)
- HomeScreen render sensor averages
- AdminDashboardScreen render realtime cards and line charts
- DeviceDetailScreen render sensor history chart

### Module 2 - Kiểm tra dữ liệu nhận được vượt quá ngưỡng cho phép

- Chức năng: kiểm tra dữ liệu theo threshold và tạo cảnh báo.
- Backend hàm đáp ứng:
- monitoring_app.views._check_threshold
- monitoring_app.views.ThresholdListView.get
- monitoring_app.views.ThresholdListView.post
- monitoring_app.views.ThresholdDetailView.get
- monitoring_app.views.ThresholdDetailView.put
- monitoring_app.views.ThresholdDetailView.delete
- monitoring_app.views.AlertListView.get
- monitoring_app.views.AlertDetailView.delete
- iot_app.coreiot_sync._upsert_sensor (gọi _check_threshold khi có bản ghi mới)
- FE hàm đáp ứng:
- AppContext.updateDeviceThreshold
- AlertsScreen render danh sách cảnh báo
- AlertDetailScreen render chi tiết cảnh báo
- App.tsx unseen alert badge logic

### Module 3 - Điều khiển thiết bị

- Chức năng: điều khiển thiết bị actuator tại chỗ và đồng bộ lệnh ra CoreIoT.
- Backend hàm đáp ứng:
- devices_app.views.DeviceTurnOnView.post
- devices_app.views.DeviceTurnOffView.post
- devices_app.views.DeviceToggleView.post
- devices_app.views.DeviceBrightnessView.post
- devices_app.views.DeviceFanSpeedView.post
- devices_app.views._resolve_light_channel
- devices_app.views._resolve_fan_channel
- iot_app.coreiot_client.CoreIoTClient.set_brightness
- iot_app.coreiot_client.CoreIoTClient.set_value
- iot_app.coreiot_sync.record_actuator_command
- FE hàm đáp ứng:
- AppContext.toggleDevice
- AppContext.toggleDevices
- AppContext.setDeviceOn
- AppContext.setBrightness
- AppContext.setFanSpeed
- ControlScreen.handleSlider

### Module 4 - Ghi nhận hoạt động

- Chức năng: ghi log ứng dụng cho thao tác user hoặc hệ thống, không dùng log tự động của IoT server.
- Backend hàm đáp ứng:
- logs_app.utils.create_activity_log
- logs_app.views.LogListView.get
- logs_app.views.LogByDeviceView.get
- logs_app.views.LogByUserView.get
- devices_app.views.DeviceListView.post (ghi log tạo device)
- devices_app.views.DeviceDetailView.put (ghi log cập nhật device)
- devices_app.views.DeviceDetailView.delete (ghi log xóa device)
- devices_app.views.DeviceTurnOnView.post (ghi log bật thiết bị)
- devices_app.views.DeviceTurnOffView.post (ghi log tắt thiết bị)
- devices_app.views.DeviceToggleView.post (ghi log toggle)
- FE hàm đáp ứng:
- AppContext.auditLogs
- AuditLogsScreen filter và hiển thị log

### Module 5 - Ứng dụng Web or Mobile

- Chức năng: giao diện sử dụng và quản trị, có phân quyền người dùng và quản trị riêng biệt.
- Backend hàm đáp ứng:
- auth_app.views.RegisterView.post
- auth_app.views.LoginView.post
- auth_app.views.LogoutView.post
- auth_app.views.MeView.get
- users_app.views.UserListView.get
- users_app.views.UserDetailView.put
- users_app.views.RoleListView.get
- users_app.views.AssignManagerView.post
- users_app.views.UserRoomPermissionsView.get
- users_app.views.UserRoomPermissionsView.put
- building_app.views.FloorListView.get/post
- building_app.views.RoomListView.get/post
- devices_app.views.DeviceListView.get/post
- FE hàm đáp ứng:
- AppContext.login
- AppContext.loginContext
- AppContext.logout
- AppContext.canAccessRoom
- AppContext.canAccessDevice
- AppContext.updateUserRoomPermissions
- RoomPermissionsScreen.handleSave
- ManageUsersScreen, AdminManageUsersScreen, ManageFloorsScreen

### Tính năng đặc trưng - Hướng HTTT

- Chức năng đạt được:
- Báo cáo trực quan qua dashboard và chart nhiều dạng.
- Báo cáo đa chiều theo thiết bị, phòng, tầng.
- Báo cáo động theo chu kỳ ngày, tháng, năm.
- Tùy chỉnh phạm vi hiển thị theo scope và metric.
- Tải hoặc xuất báo cáo PDF.
- Hàm đáp ứng chính:
- dashboard_app.views.DashboardAnalyticsView.get
- dashboard_app.views.DashboardSummaryView.get
- ReportsScreen.handleExportPDF
- DetailedVisualizationScreen.aggregateSeries

### Tính năng đặc trưng - Hướng CNPM

- Design pattern hoặc kiến trúc áp dụng:
- Context pattern ở FE qua AppContext để quản lý state tập trung.
- Event-driven pattern qua websocket cho cập nhật realtime.
- Strategy qua mapping channel method/key cho CoreIoT control.
- Khả năng mở rộng đa thiết bị:
- devices_app.models.DeviceType và API device-types.
- resolver kênh _resolve_light_channel, _resolve_fan_channel cho mở rộng actuator.
- Khả năng triển khai linh động, hạn chế sửa code:
- Cấu hình qua .env cho CoreIoT URL, method, key, local ID mapping.
- Rule và ngưỡng cấu hình qua DB: Threshold, AutomationRule, Schedule, RoomManagement.

### Tính năng đặc trưng - Hướng AI

- Trạng thái hiện tại của app:
- Chưa tích hợp machine learning runtime hoặc voice assistant hoặc chatbot điều khiển thiết bị.
- Đã có lớp thông minh rule-based:
- threshold + automation + schedule + alert cooldown.
- Hướng mở rộng AI để đạt yêu cầu bonus 3 hướng:
- dự báo nhiệt độ hoặc độ ẩm theo lịch sử SensorData bằng mô hình ML.
- phát hiện bất thường thiết bị theo time-series và hành vi sử dụng.
- chatbot hỗ trợ hỏi đáp trạng thái thiết bị và điều khiển bằng ngôn ngữ tự nhiên.
