/**
 * API Service - gọi Django Backend
 * Base URL: /api (proxy qua Vite → http://localhost:8000/api)
 */

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const userId = localStorage.getItem('user_id');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || err.detail || res.statusText), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { username: string; password: string }) =>
    request<{ user_id: number; username: string; email: string; message: string }>(
      '/auth/login/', { method: 'POST', body: JSON.stringify(data) }
    ),

  logout: () =>
    request('/auth/logout/', { method: 'POST' }),

  me: (userId: number) =>
    request<{ user_id: number; username: string; email: string; role_id: number }>(
      `/auth/me/?user_id=${userId}`
    ),
};

// ─── USERS ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => request<any[]>('/users/'),
  get: (id: number) => request<any>(`/users/${id}/`),
  create: (data: object) => request('/users/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) => request(`/users/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/users/${id}/`, { method: 'DELETE' }),
  roles: () => request<any[]>('/roles/'),
};

// ─── PERMISSIONS ─────────────────────────────────────────────────────────────
export const permissionsApi = {
  /** Get rooms a user has been granted access to */
  getUserRooms: (userId: number) =>
    request<Array<{ room_id: number; room_name: string; floor_id: number }>>(
      `/users/${userId}/room-permissions/`
    ),
  /** Replace user's room permissions with the given list of room IDs */
  setUserRooms: (userId: number, roomIds: number[]) =>
    request<Array<{ room_id: number; room_name: string; floor_id: number }>>(
      `/users/${userId}/room-permissions/`,
      { method: 'POST', body: JSON.stringify({ room_ids: roomIds }) }
    ),
};

// ─── FLOORS & ROOMS ──────────────────────────────────────────────────────────
export const buildingApi = {
  floors: () => request<any[]>('/floors/'),
  floor: (id: number) => request<any>(`/floors/${id}/`),
  createFloor: (data: object) => request('/floors/', { method: 'POST', body: JSON.stringify(data) }),
  updateFloor: (id: number, data: object) => request(`/floors/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFloor: (id: number) => request(`/floors/${id}/`, { method: 'DELETE' }),
  floorRooms: (floorId: number) => request<any[]>(`/floors/${floorId}/rooms/`),
  rooms: () => request<any[]>('/rooms/'),
  room: (id: number) => request<any>(`/rooms/${id}/`),
  createRoom: (data: object) => request('/rooms/', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: number, data: object) => request(`/rooms/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: number) => request(`/rooms/${id}/`, { method: 'DELETE' }),
};

// ─── DEVICES ─────────────────────────────────────────────────────────────────
export const devicesApi = {
  list: () => request<any[]>('/devices/'),
  types: () => request<any[]>('/device-types/'),
  get: (id: number) => request<any>(`/devices/${id}/`),
  create: (data: object) => request('/devices/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) => request(`/devices/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/devices/${id}/`, { method: 'DELETE' }),
  turnOn: (id: number) => request(`/devices/${id}/on/`, { method: 'POST' }),
  turnOff: (id: number) => request(`/devices/${id}/off/`, { method: 'POST' }),
  toggle: (id: number) => request(`/devices/${id}/toggle/`, { method: 'POST' }),
  setBrightness: (id: number, brightness: number) => request(`/devices/${id}/brightness/`, { method: 'POST', body: JSON.stringify({ brightness }) }),
  byRoom: (roomId: number) => request<any[]>(`/rooms/${roomId}/devices/`),
};

// ─── SENSORS ─────────────────────────────────────────────────────────────────
export const sensorsApi = {
  byDevice: (deviceId: number) => request<any[]>(`/sensor-data/device/${deviceId}/`),
  get: (id: number) => request<any[]>(`/sensor-data/device/${id}/`),
  create: (data: { device: number; value: number; unit?: string }) =>
    request('/sensor-data/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (_id: number) => Promise.resolve(undefined),
};

// ─── SENSOR DATA ─────────────────────────────────────────────────────────────
export const sensorDataApi = {
  byDevice: (deviceId: number) => request<any[]>(`/sensor-data/device/${deviceId}/`),
  bySensor: (sensorId: number) => request<any[]>(`/sensor-data/device/${sensorId}/`),
  latest: () => request<any[]>(`/sensor-data/latest/`),
  add: (data: { device: number; value: number; unit?: string; metric?: string }) =>
    request('/sensor-data/', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── ALERTS ──────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: () => request<any[]>('/alerts/'),
  unread: () => request<any[]>('/alerts/'),
  delete: (id: number) => request(`/alerts/${id}/`, { method: 'DELETE' }),
};

// ─── THRESHOLDS ──────────────────────────────────────────────────────────────
export const thresholdsApi = {
  list: () => request<any[]>('/thresholds/'),
  set: (data: { device: number; min_value?: number; max_value?: number; trigger_action?: string; target_device?: number | null }) =>
    request('/thresholds/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) =>
    request(`/thresholds/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── SCHEDULES ───────────────────────────────────────────────────────────────
export const schedulesApi = {
  list: () => request<any[]>('/schedules/'),
  get: (id: number) => request<any>(`/schedules/${id}/`),
  create: (data: object) => request('/schedules/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: object) => request(`/schedules/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/schedules/${id}/`, { method: 'DELETE' }),
};

// ─── LOGS ─────────────────────────────────────────────────────────────────────
export const logsApi = {
  list: () => request<any[]>('/logs/'),
  byDevice: (deviceId: number) => request<any[]>(`/logs/device/${deviceId}/`),
  byUser: (userId: number) => request<any[]>(`/logs/user/${userId}/`),
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => request<any>('/dashboard/summary/'),
  temperature: () => request<any[]>('/dashboard/temperature/'),
  humidity: () => request<any[]>('/dashboard/humidity/'),
  light: () => request<any[]>('/dashboard/light/'),
  deviceStatus: () => request<any>('/dashboard/device-status/'),
  analytics: (params: { scope: 'floor' | 'room'; metric: 'temperature' | 'humidity' | 'light' | 'device_activity'; period: 'day' | 'month' | 'year' }) =>
    request<any>(`/dashboard/analytics/?scope=${params.scope}&metric=${params.metric}&period=${params.period}`),
};

// ─── IOT TOKENS (admin quản lý) ──────────────────────────────────────────────
export const iotApi = {
  tokens: () => request<any[]>('/iot/tokens/'),
  createToken: (data: { device: number; label?: string }) =>
    request('/iot/tokens/', { method: 'POST', body: JSON.stringify(data) }),
  deleteToken: (id: number) => request(`/iot/tokens/${id}/`, { method: 'DELETE' }),
  regenerateToken: (id: number) =>
    request<{ token: string }>(`/iot/tokens/${id}/regenerate/`, { method: 'POST' }),
};

// ─── WEBSOCKET REALTIME ────────────────────────────────────────────────────────
/**
 * Kết nối WebSocket để nhận dữ liệu realtime từ IoT.
 *
 * Ví dụ dùng trong component:
 *   const ws = connectSensorWebSocket((msg) => {
 *     if (msg.event === 'sensor_data') console.log(msg.value);
 *     if (msg.event === 'alert')       console.log(msg.message);
 *     if (msg.event === 'device_status') console.log(msg.status);
 *   });
 *   // Cleanup: ws.close();
 */
export function connectSensorWebSocket(
  onMessage: (data: any) => void,
  onClose?: () => void,
): WebSocket {
  const envWsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = envWsUrl || `${wsProtocol}://${window.location.hostname}:8000/ws/sensors/`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (_) {}
  };

  ws.onclose = () => onClose?.();

  ws.onerror = (err) => console.error('WebSocket error:', err);

  return ws;
}
