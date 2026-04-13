# 🐛 Bug Report - Smart Home IoT System

**Ngày kiểm tra:** 13/04/2026  
**Hệ thống:** Smart Home TTDA (FE + BE + CoreIoT)

---

## 🔴 LỖI 1: Fan Control - Thiếu hàm setValue riêng

**Ưu tiên:** 🔴 **HIGH** | **Thời gian fix:** ~30 phút | **Impact:** Fan không dimming đúng

### Vấn đề:
- Chỉ có 1 hàm: `CoreIoTClient.set_brightness()` - dùng RPC method `setState`
- Không có hàm `CoreIoTClient.set_value()` - được yêu cầu cho fan (RPC method `setValue`)
- Cả đèn và quạt dùng cùng endpoint / cùng method → không phân biệt

### Ảnh hưởng:
```
Frontend: setBrightness(fan_id, 50%) 
  → value = 128 (0-255)
  → Backend clamp: 128 → 100
  → CoreIoT gọi: setState(100)  ❌ Sai - nên dùng setValue(128)
  → Fan nhận value sai
```

### Fix cần làm:
**File:** `backend/iot_app/coreiot_client.py`

Thêm hàm mới sau `set_brightness()`:
```python
def set_value(self, coreiot_device_id: str, value: int) -> bool:
    """Fan control - RPC method: setValue (0-255 PWM)"""
    template = getattr(settings, "COREIOT_SETSTATE_URL_TEMPLATE", "").strip()
    if not template or not coreiot_device_id:
        return False

    encoded_device_id = urllib.parse.quote(str(coreiot_device_id), safe="")
    path = template.replace("{device_id}", encoded_device_id)
    url = _join_url(self.base_url, path)

    # Giữ nguyên 0-255, không clamp
    value = max(0, min(255, int(value)))
    mode = getattr(settings, "COREIOT_SETSTATE_MODE", "rpc").strip().lower()

    if mode == "direct":
        body = {"pwm": value}  # hoặc tên key phù hợp
    else:
        method_name = getattr(settings, "COREIOT_SETSTATE_VALUE_METHOD", "setValue")
        body = {
            "method": method_name,
            "params": value,
        }

    result = self._request("POST", url, body=body)
    return result is not None
```

---

## 🔴 LỖI 2: Backend Double Clamp - Mất độ chính xác PWM

**Ưu tiên:** 🔴 **HIGH** | **Thời gian fix:** ~20 phút | **Impact:** LED/Fan control không chính xác

### Vấn đề:
Value bị clamp 2 lần, làm mất độ chính xác:
```
Frontend: 50% → 128 (0-255)
  ↓ DeviceBrightnessView.post():
    brightness = max(0, min(100, 128)) = 100  ❌ Clamp 1
  ↓ CoreIoTClient.set_brightness():
    value = max(0, min(100, 100)) = 100  ❌ Clamp 2
  ↓ CoreIoT RPC: setState(100)  ❌ Sai
```

### Ảnh hưởng:
- Slider 0-100% có 101 giá trị, nhưng backend chỉ giữ 0-100
- Mất độ chính xác PWM
- LED/Fan không dimming đúng theo slider

### Fix cần làm:

**File 1:** `backend/devices_app/views.py` (DeviceBrightnessView.post)

Thay đổi:
```python
# ❌ Cũ:
brightness = max(0, min(100, int(brightness)))

# ✅ Mới:
brightness = max(0, min(255, int(brightness)))  # Giữ nguyên 0-255
```

**File 2:** `backend/iot_app/coreiot_client.py` (set_brightness)

Thay đổi:
```python
# ❌ Cũ:
value = max(0, min(100, int(brightness)))

# ✅ Mới:
value = max(0, min(255, int(brightness)))  # Giữ nguyên 0-255
```

---

## 🔴 LỖI 3: Backend không phân biệt Light vs Fan

**Ưu tiên:** 🔴 **HIGH** | **Thời gian fix:** ~40 phút | **Impact:** Không thể gọi method khác nhau

### Vấn đề:
```python
class DeviceBrightnessView(APIView):
    def post(self, request, pk):
        # ❌ Không check device.type
        # ❌ Tất cả devices dùng endpoint: /devices/{id}/brightness/
        # ❌ Luôn gọi: CoreIoTClient().set_brightness()
```

### Ảnh hưởng:
- Không phân biệt light vs fan
- Cảng không gọi method RPC khác nhau (`setState` vs `setValue`)
- Cả fan và light đều dùng `setState` ❌

### Fix cần làm:
**File:** `backend/devices_app/views.py` + `backend/devices_app/urls.py`

**✅ RECOMMENDED:** Tạo 2 endpoint riêng (phân biệt rõ ràng):

#### 1️⃣ Giữ lại endpoint Light:
```python
# /devices/{id}/brightness/ - cho LIGHT ONLY

class DeviceBrightnessView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        
        # ONLY accept light devices
        if device.type.name_type != 'light':
            return Response(
                {'error': 'This endpoint is for light devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        brightness = request.data.get('brightness', 0)
        brightness = max(0, min(255, int(brightness)))  # 0-255

        coreiot_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
        
        try:
            ok = CoreIoTClient().set_state(coreiot_device_id, brightness)  # ✨ setState
        except Exception as e:
            logger.error(f'CoreIoT setState error: {e}')
            return Response({'error': 'Failed to set brightness'}, status=status.HTTP_502_BAD_GATEWAY)
        
        device.brightness = brightness
        device.status = (brightness > 0)
        device.save(update_fields=['brightness', 'status'])
        
        broadcast_device_status(device.device_id, device.status, device.device_name, brightness)
        
        return Response({
            'message': f'{device.device_name} brightness set to {brightness}/255',
            'brightness': brightness,
            'status': device.status,
        })
```

#### 2️⃣ Thêm NEW endpoint Fan:
```python
# /devices/{id}/fan-speed/ - cho FAN ONLY

class DeviceFanSpeedView(APIView):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        
        # ONLY accept fan devices
        if device.type.name_type != 'fan':
            return Response(
                {'error': 'This endpoint is for fan devices only'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        speed = request.data.get('speed', 0)
        speed = max(0, min(255, int(speed)))  # 0-255 PWM

        coreiot_fan_device_id = getattr(settings, 'COREIOT_DEVICE_ID', '').strip()
        
        try:
            ok = CoreIoTClient().set_value(coreiot_fan_device_id, speed)  # ✨ setValue
        except Exception as e:
            logger.error(f'CoreIoT setValue error: {e}')
            return Response({'error': 'Failed to set fan speed'}, status=status.HTTP_502_BAD_GATEWAY)
        
        device.brightness = speed  # Dùng cột brightness để lưu PWM value (0-255)
        device.status = (speed > 0)
        device.save(update_fields=['brightness', 'status'])
        
        broadcast_device_status(device.device_id, device.status, device.device_name, speed)
        
        return Response({
            'message': f'{device.device_name} fan speed set to {speed}/255',
            'speed': speed,
            'status': device.status,
        })
```

#### 3️⃣ Update URLs routing:
```python
# devices_app/urls.py

urlpatterns = [
    # ... existing paths ...
    
    path("devices/<int:pk>/brightness/", DeviceBrightnessView.as_view()),  # Light
    path("devices/<int:pk>/fan-speed/", DeviceFanSpeedView.as_view()),      # ✨ Fan (NEW)
]
```

#### 4️⃣ Update Frontend API:
```typescript
// FE/src/app/services/api.ts

export const devicesApi = {
  // ... existing methods ...
  
  // Light control
  setBrightness: (id: number, brightness: number) => 
    request(`/devices/${id}/brightness/`, { 
      method: 'POST', 
      body: JSON.stringify({ brightness }) 
    }),
  
  // Fan control (NEW)
  setFanSpeed: (id: number, speed: number) => 
    request(`/devices/${id}/fan-speed/`, { 
      method: 'POST', 
      body: JSON.stringify({ speed }) 
    }),
}
```

---

## 🔴 LỖI 4: Backend không sync Motion Sensor từ CoreIoT

**Ưu tiên:** 🟠 **MEDIUM** | **Thời gian fix:** ~15 phút | **Impact:** Smart Automation không hoạt động

### Vấn đề:
```python
def sync_once() -> bool:
    telemetry = client.fetch_latest_telemetry(...)
    
    # ✅ Có sync:
    if brightness_key in telemetry: ...
    if temperature_key in telemetry: ...
    if humidity_key in telemetry: ...
    if light_key in telemetry: ...
    
    # ❌ THIẾU:
    # Motion không được sync!
```

### Ảnh hưởng:
- Motion data từ CoreIoT không lưu vào DB
- `/api/sensor-data/latest/` không có motion
- Frontend không nhận motion data
- Smart Automation (motion-triggered light/fan) không hoạt động
- Dashboard không hiển thị trạng thái motion

### Fix cần làm:
**File:** `backend/iot_app/coreiot_sync.py` (trong hàm `sync_once()`)

Thêm code sau phần light sensor sync:
```python
# Motion sensor sync
motion_key = getattr(settings, "COREIOT_MOTION_KEY", "motion")
motion_sensor_id = getattr(settings, "COREIOT_LOCAL_MOTION_SENSOR_ID", "")

if motion_key in telemetry:
    value = _to_int(telemetry.get(motion_key))  # 0 hoặc 1
    device = _get_device(motion_sensor_id)
    if value is not None and device is not None:
        _upsert_sensor(device, "motion", value, "")
```

---

## 🟠 LỖI 5: Frontend - Motion không hiển thị trên Dashboard

**Ưu tiên:** 🟠 **MEDIUM** | **Thời gian fix:** ~1 giờ | **Impact:** UX thiếu feedback

### Vấn đề:
Motion được sync từ backend, được dùng trong automation logic, nhưng **không hiển thị giao diện**:
```typescript
// ✅ Backend sync motion data
// ✅ AppContext nhận motion value
// ✅ Motion dùng trong automation logic
// ❌ NHƯNG không có Motion Card / Indicator trên Dashboard
```

### Ảnh hưởng:
- User không biết có người hay không
- Không thể debug motion-triggered actions
- Dashboard không đầy đủ thông tin

### Fix cần làm:
**File:** `FE/src/app/screens/DashboardScreen.tsx` (hoặc Home screen)

Thêm Motion Card/Indicator:
```typescript
// Hiển thị Motion status
const motionSensor = devices.find(d => d.type === 'sensor' && d.subType === 'motion');
const hasMotion = motionSensor?.currentValue > 0;

<div className="motion-indicator">
  {hasMotion ? (
    <span className="pulse-green">🟢 Person Detected</span>
  ) : (
    <span className="motion-none">⚫ No Person</span>
  )}
</div>
```

---

## � LỖI 6: Fan Speed không sync từ CoreIoT khi thay đổi từ server

**Ưu tiên:** 🔴 **HIGH** | **Thời gian fix:** ~45 phút | **Impact:** Fan control bị out-of-sync

### Vấn đề:
```
Scenario:
1. User chỉnh fan bằng dashboard CoreIoT (thay vì FE app)
2. CoreIoT device thay đổi fan_speed (e.g., 128/255)
3. CoreIoT publish giá trị mới trên telemetry
4. ❌ Backend KHÔNG sync fan speed từ telemetry CoreIoT
5. ❌ Frontend không cập nhật slider fan hiện tại
6. ❌ FE slider giá trị cũ, device thực tế khác
```

### Ảnh hưởng:
- **Backend:** Fan speed không được lưu vào DB (device.brightness field)
- **Frontend UI:** Slider hiển thị giá trị cũ, không match với device thực tế
- **User Experience:** User thấy slider ở 30% nhưng fan đang chạy 80% → bị nhầm lẫn
- **Sync issue:** Nếu user kéo slider sau đó → gửi sai giá trị

### Flow hiện tại (SAI):
```
CoreIoT Device: Fan speed = 200/255
    ↓
CoreIoT publish telemetry: {"fan_speed": 200}
    ↓
Backend sync (coreiot_sync.py):
    ❌ Không sync fan_speed, chỉ sync brightness (light)
    
FE sensorDataApi.latest():
    ❌ Không có fan_speed data
    
FE Dashboard:
    ❌ Fan slider vẫn hiển thị giá trị cũ (e.g., 50%)
```

### Fix cần làm:

#### 1️⃣ Backend - Sync fan_speed từ CoreIoT telemetry:
**File:** `backend/iot_app/coreiot_sync.py`

Thêm code sau phần brightness sync:
```python
def sync_once() -> bool:
    # ... existing code ...
    
    # ✅ Brightness (light) sync
    if brightness_key in telemetry:
        brightness = _to_int(telemetry.get(brightness_key))
        actuator = _get_device(light_actuator_id)
        if brightness is not None and actuator is not None:
            brightness = max(0, min(255, brightness))  # ✨ Giữ 0-255
            status = brightness > 0
            if actuator.brightness != brightness or actuator.status != status:
                actuator.brightness = brightness
                actuator.status = status
                actuator.save(update_fields=["brightness", "status"])
                broadcast_device_status(actuator.device_id, status, actuator.device_name, brightness)
    
    # ✨ FAN SPEED SYNC (NEW)
    fan_speed_key = getattr(settings, "COREIOT_FAN_SPEED_KEY", "fan_speed")
    fan_actuator_id = getattr(settings, "COREIOT_LOCAL_FAN_ACTUATOR_ID", "")
    
    if fan_speed_key in telemetry:
        fan_speed = _to_int(telemetry.get(fan_speed_key))  # 0-255
        fan_device = _get_device(fan_actuator_id)
        if fan_speed is not None and fan_device is not None:
            fan_speed = max(0, min(255, fan_speed))  # ✨ Giữ 0-255
            status = fan_speed > 0
            if fan_device.brightness != fan_speed or fan_device.status != status:
                fan_device.brightness = fan_speed
                fan_device.status = status
                fan_device.save(update_fields=["brightness", "status"])
                
                create_activity_log(
                    device=fan_device,
                    action="coreiot_fan_speed_synced",
                    details=f"CoreIoT fan speed synced -> {fan_speed}/255",
                )
                broadcast_device_status(fan_device.device_id, status, fan_device.device_name, fan_speed)
```

#### 2️⃣ Environment config - Thêm fan_speed key:
**File:** `.env.example` + `.env` (production)

```env
# Khai báo key telemetry cho fan speed (phải match với tên key trên device CoreIoT)
COREIOT_FAN_SPEED_KEY=fan_speed
```

#### 3️⃣ Frontend - Subscribe và cập nhật fan slider thực time:
**File:** `FE/src/app/context/AppContext.tsx`

Đã có realtime bridge qua WebSocket, cần đảm bảo:
```typescript
// Trong updateDeviceStatusFromEvent():
const updateDeviceStatusFromEvent = (eventData: any) => {
  if (!eventData?.device_id) return;
  setAllDevices((prev) =>
    prev.map((device) =>
      device.id === String(eventData.device_id)
        ? {
            ...device,
            isOn: Boolean(eventData.status),
            brightness:
              typeof eventData.brightness === 'number'
                ? Math.max(0, Math.min(255, Math.round(eventData.brightness)))
                : device.brightness,
            lastUpdated: new Date(),
          }
        : device
    )
  );
};

// Cái này được gọi từ WebSocket event 'device_status'
// ✅ Đã cập nhật brightness (dùng cho cả light và fan)
// ✅ Frontend slider sẽ re-render với giá trị mới
```

**Luồng real-time đầy đủ:**
```
CoreIoT Device: User chỉnh fan → fan_speed = 200
    ↓
CoreIoT Telemetry: {"fan_speed": 200}
    ↓
Backend (coreiot_sync.py): 
    ✓ sync_once() đọc telemetry
    ✓ Lưu fan_device.brightness = 200
    ✓ Gọi broadcast_device_status(device_id, status, name, 200)
    ↓
WebSocket broadcast:
    ✓ Publish event: { event: "device_status", device_id: 7, brightness: 200, status: true }
    ↓
Frontend WebSocket listener:
    ✓ Nhận event
    ✓ Call updateDeviceStatusFromEvent()
    ✓ Update state: devices[fan].brightness = 200
    ↓
FE Slider:
    ✓ Re-render với giá trị 200/255 ≈ 78%
    ✓ UI match device thực tế
```

---

## 📊 Tóm tắt Tất cả Lỗi

| # | Lỗi | Ưu tiên | Thời gian | Impact | File |
|---|-----|--------|----------|--------|------|
| 1 | Thiếu hàm `set_value()` | 🔴 HIGH | 30min | Fan không dimming | coreiot_client.py |
| 2 | Double clamp PWM | 🔴 HIGH | 20min | Control sai value | devices_app/views.py + coreiot_client.py |
| 3 | Không phân biệt Light vs Fan | 🔴 HIGH | 40min | Method RPC sai | devices_app/views.py |
| 6 | Fan speed không sync từ Coreiot | 🔴 HIGH | 45min | Out-of-sync UI | coreiot_sync.py |
| 4 | Motion không sync | 🟠 MED | 15min | Automation không hoạt | coreiot_sync.py |
| 5 | Motion không hiển thị | 🟠 MED | 60min | UX thiếu feedback | Dashboard |

---

## ✅ Kiến nghị thứ tự fix:

1. **Lỗi 2** (Double clamp) - căn bản nhất, blocking các loại
2. **Lỗi 1** (Thiếu set_value) - cần ngay cho fan control
3. **Lỗi 3** (Phân biệt Light vs Fan) - architecture fix
4. **Lỗi 6** (Fan speed sync) - real-time sync from CoreIoT
5. **Lỗi 4** (Motion sync) - backend + FE data flow
6. **Lỗi 5** (Motion UI) - UX polish

---

**Người kiểm tra:** GitHub Copilot  
**Ngày:** 13/04/2026  
**Phiên bản code:** v2 (TTDA_SMART_HOME)
