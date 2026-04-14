# 🐛 Bug Report - Smart Home IoT System

**Ngày kiểm tra:** 14/04/2026  
**Hệ thống:** Smart Home TTDA (FE + BE + CoreIoT)

---

## 🔴 LỖI 1: Slider bị reset về 0% sau khi kéo

**Ưu tiên:** 🔴 **CRITICAL** | **Thời gian fix:** ~2 giờ | **Impact:** UX rối loạn - slider không giữ giá trị

### Vấn đề:
- User kéo slider lên 25%
- Backend publish dữ liệu đúng (25%)
- Nhưng sau ~60 giây, slider tự động reset về 0% trên FE
- Xảy ra cả khi không có thao tác từ CoreIoT

### Nguyên nhân:
1. Frontend gửi request API: `setBrightness(25%)`
2. Backend nhận ✅, publish to CoreIoT ✅
3. CoreIoT sync về lại brightness=0 (hoặc giá trị khác)
4. WebSocket broadcast event đến FE
5. FE cập nhật brightness = 0 ❌ (ghi đè giá trị user vừa set)

### Root cause:
- Khi user thao tác slider, FE cần phải có **manual override period** để ngăn server sync ghi đè
- Hiện tại FE không có cơ chế để ignore WebSocket updates trong khoảng thời gian này

### Data flow sai:
```
FE Slider: 25% 
  ↓ (API request)
Backend: brightness = 25 ✅
  ↓ (Publish to CoreIoT)
CoreIoT: nhận 25 ✅
  ↓ (Telemetry sync)
Backend sync thread: brightness = 0 ❌
  ↓ (WebSocket broadcast)
FE App: brightness = 0 ❌ (OVERWRITE user's 25%)
```

### Fix cần làm:

**File:** `FE/src/app/context/AppContext.tsx`

Thêm **manual override tracking**:
```typescript
// Khi user thao tác slider
const setBrightness = (deviceId: string, brightness: number) => {
  // 1) Set manual override flag
  setManualOverrideEndTime(deviceId, Date.now() + 120_000);  // 120s
  
  // 2) Optimistic update
  updateDeviceSnapshot(deviceId, { brightness });
  
  // 3) Send to backend
  await DevicesAPI.setBrightness(id, brightness);
  
  // 4) Extend override on success
  setManualOverrideEndTime(deviceId, Date.now() + 120_000);
};

// Khi WebSocket update đến
const updateDeviceStatusFromEvent = (eventData) => {
  // Kiểm tra: có phải trong manual override period không?
  const isManualOverride = isInManualOverridePeriod(eventData.device_id);
  
  if (!isManualOverride) {
    // An toàn để update
    updateDeviceSnapshot(eventData.device_id, eventData);
  } else {
    // Trong override period → IGNORE WebSocket update
    console.log(`⏳ Ignoring server update - manual override period active`);
  }
};
```

---

## 🔴 LỖI 2: Không đồng bộ với Server - CoreIoT → FE không hoạt động

**Ưu tiên:** 🔴 **CRITICAL** | **Thời gian fix:** ~2 giờ | **Impact:** FE không cập nhật real-time khi device thay đổi từ CoreIoT

### Vấn đề:
- User kéo slider trên **CoreIoT dashboard** (chỉnh brightness = 50%)
- Backend sync lấy dữ liệu từ CoreIoT ✅
- **Nhưng FE không nhận được update** ❌
- FE vẫn hiển thị brightness cũ

### Nguyên nhân:
1. Backend có thread sync (mỗi 2s fetch telemetry từ CoreIoT) ✅
2. Nhưng **broadcast_device_status** không được gọi với brightness value
3. FE WebSocket receiver không nhận được brightness data
4. Hoặc brightness được đổi sang 0-100 format nhưng không được convert lại

### Data flow sai:
```
CoreIoT: brightness = 128 (PWM 0-255)
  ↓ (Backend sync fetch)
Backend coreiot_sync.py: ✅ Nhận 128
  ↓ (Conversion?)
Backend: brightness = ? (mất ngữ cảnh - có convert sang 0-100 không?)
  ↓ (Broadcast?)
FE: brightness = ??? (không hiển thị hoặc hiển thị sai)
```

### Fix cần làm:

**File 1:** `backend/iot_app/coreiot_sync.py`

Đảm bảo:
```python
def sync_once():
    # ... fetch telemetry ...
    
    # Brightness sync (0-255 → 0-100)
    brightness_raw = max(0, min(255, telemetry.get('brightness', 0)))
    brightness_normalized = round((brightness_raw / 255) * 100) if brightness_raw > 0 else 0
    
    device.brightness = brightness_normalized  # Store 0-100 in DB
    device.save()
    
    # ✅ IMPORTANT: Broadcast normalized value to FE
    broadcast_device_status(device.device_id, device.status, device.device_name, brightness_normalized)
```

**File 2:** `FE/src/app/context/AppContext.tsx`

Kiểm tra:
```typescript
const updateDeviceStatusFromEvent = (eventData) => {
  // ✅ Phải nhận được brightness from server
  if (eventData.brightness !== undefined) {
    // Nếu không trong manual override → update
    if (!isInManualOverridePeriod(eventData.device_id)) {
      updateDeviceSnapshot(eventData.device_id, {
        brightness: eventData.brightness  // 0-100 format
      });
    }
  }
};
```

### Checklist debug:
- [ ] Backend logs có `🔄 CoreIoT sync brightness: ...` không?
- [ ] Backend logs có `📤 Broadcasting ...` không?
- [ ] FE console có `📥 WebSocket event: brightness=...` không?
- [ ] brightness value có phải 0-100 format không?

---

## 🔴 LỖI 3: Motion Sensor không hoạt động - không nhận motion data từ server

**Ưu tiên:** 🔴 **CRITICAL** | **Thời gian fix:** ~1.5 giờ | **Impact:** Smart automation không trigger - không thể detect motion

### Vấn đề:
- CoreIoT có motion sensor data ✅
- Backend sync thread không sync motion ❌
- FE không nhận được motion events ❌
- Automation rules không trigger

### Dữ liệu flow hiện tại:
```
CoreIoT telemetry: motion=1 (hoặc 0)
  ↓ (Backend fetch)
Backend coreiot_sync.py: ✅ Nhận motion=1
  ↓ (Sync to DB?)
Backend: ??? (không clear motion được lưu ở đâu)
  ↓ (Broadcast?)
FE: ??? (không nhận motion data)
  ↓ (Automation?)
Automation: ❌ không trigger
```

### Nguyên nhân:
1. Backend sync code có fetch motion nhưng **logging không rõ ràng**
2. Không chắc motion được lưu vào SensorData model không
3. Không chắc WebSocket broadcast motion event không
4. FE automation rule dùng `motionSensor.currentValue` nhưng có data không?

### Fix cần làm:

**File 1:** `backend/iot_app/coreiot_sync.py`

Thêm logging để debug motion:
```python
def sync_once():
    # ... brightness sync ...
    
    # Motion sensor sync (NEW - with logging)
    motion_key = getattr(settings, "COREIOT_MOTION_KEY", "motion")
    motion_sensor_id = getattr(settings, "COREIOT_LOCAL_MOTION_SENSOR_ID", "")
    
    logger.info(f"🔍 Checking motion: key={motion_key}, sensor_id={motion_sensor_id}")
    
    if motion_key in telemetry:
        value = telemetry.get(motion_key, 0)
        device = _get_device(motion_sensor_id)
        
        if device:
            logger.info(f"✅ Motion detected: device={device.device_name}, value={value}")
            _upsert_sensor(device, "motion", float(value), "")  # Save to DB
            # ✨ Broadcast to FE
            broadcast_sensor_update(device.device_id, value, "", device.device_id, "motion")
        else:
            logger.error(f"❌ Motion sensor device not found: {motion_sensor_id}")
    else:
        logger.warning(f"⚠️  Motion key not in telemetry. Available: {list(telemetry.keys())}")
```

**File 2:** `FE/src/app/context/AppContext.tsx`

Thêm logging khi nhận motion:
```typescript
const updateDeviceFromEvent = (eventData: any) => {
  if (eventData.metric === "motion") {
    console.log(`📊 Motion event received: device_id=${eventData.device_id}, value=${eventData.value}`);
    
    // Update motion sensor in state
    setSensorData(prev => ({
      ...prev,
      [eventData.device_id]: {
        ...prev[eventData.device_id],
        currentValue: eventData.value
      }
    }));
  }
};
```

### Checklist debug:
- [ ] Backend logs có `🔍 Checking motion:` không?
- [ ] Backend logs có `✅ Motion detected:` hoặc `❌ Motion sensor device not found:` không?
- [ ] `.env` có `COREIOT_LOCAL_MOTION_SENSOR_ID=4` không?
- [ ] FE console có `📊 Motion event received:` log không?
- [ ] FE DevTools có thấy motion value thay đổi không?

### Testing:
```bash
# Terminal 1: Backend
python manage.py runserver

# Terminal 2: Check motion sensor exist
python manage.py shell
>>> from devices_app.models import Device, DeviceType
>>> Device.objects.all().values('device_id', 'device_name', 'type')
>>> # Kiểm tra có device với ID=4 không?

# Terminal 3: FE
npm run dev

# Browser: Mở DevTools Console → tìm motion logs
# Trigger motion trên CoreIoT → xem console có log không
```

---

## 📋 Summary - Cần fix gì

| Bug | Status | Priority | Root Cause | Fix Point |
|-----|--------|----------|-----------|-----------|
| Slider reset 0% | ❌ Open | 🔴 CRITICAL | Manual override period missing | FE/AppContext |
| No CoreIoT→FE sync | ❌ Open | 🔴 CRITICAL | brightness not broadcast or wrong format | BE/coreiot_sync.py + FE/AppContext |
| Motion not working | ❌ Open | 🔴 CRITICAL | Motion sync logging unclear, no broadcast | BE/coreiot_sync.py + FE/AppContext |

---

## 🧪 Test Plan

### Phase 1: Fix Motion Sync (điều kiện cho phase 2)
```
1. Add logging to backend coreiot_sync.py
2. Run backend + check logs for motion
3. Check motion appears in FE console
4. ✅ Motion events flow end-to-end
```

### Phase 2: Fix Slider Reset (nếu motion OK)
```
1. Implement manual override period in FE (120s)
2. Kéo slider → kiểm tra dùng remain 120s ✅
3. CoreIoT change brightness → FE không update ✅ (trong 120s)
4. Sau 120s → FE cập nhật CoreIoT value ✅
```

### Phase 3: Fix Server Sync (if both above OK)
```
1. Ensure brightness synced with 0-100 format
2. Verify broadcast includes brightness
3. FE updates real-time from CoreIoT ✅
```
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
