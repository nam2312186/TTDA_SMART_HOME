import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Floor,
  Room,
  Device,
  Alert,
  Schedule,
  HistoryLog,
  User,
  Home,
  AuditLog,
} from '../types';
import { buildingApi, devicesApi, alertsApi, schedulesApi, permissionsApi, logsApi, usersApi, connectSensorWebSocket, sensorDataApi } from '../services/api';

function mapFloor(f: any): Floor {
  return {
    id: String(f.floor_id),
    name: f.floor_name,
    level: f.level ?? 1,
    roomCount: f.room_count ?? 0,
    ownerUserId: undefined,
    homeId: 'home1',
  };
}

function mapRoom(r: any): Room {
  return {
    id: String(r.room_id),
    name: r.room_name,
    floorId: String(r.floor),
    ownerUserId: undefined,
    deviceCount: r.device_count ?? 0,
  };
}

function mapUser(u: any): User {
  return {
    id: String(u.user_id),
    name: u.username,
    email: u.email || '',
    role: (u.role_name === 'admin' ? 'admin' : 'user'),
    homeId: 'home1',
    createdAt: new Date(u.created_at || Date.now()),
    lastActive: new Date(),
    roomPermissions: [],
  };
}

function mapDevice(d: any): Device {
  const rawTypeName = String(d.type_name || '').toLowerCase();
  const sensorTypes = ['sensor', 'temperature', 'humidity', 'motion'];

  // Backend now sends explicit is_sensor field — use it when available.
  // Fallback to old heuristic for backward compatibility.
  let isSensor: boolean;
  if (typeof d.is_sensor === 'boolean') {
    isSensor = d.is_sensor;
  } else {
    const hasThreshold = Boolean(d.threshold_data || d.threshold);
    const isLightSensor = rawTypeName === 'light' && hasThreshold;
    isSensor = sensorTypes.includes(rawTypeName) || isLightSensor;
  }

  const mappedType: Device['type'] = isSensor ? 'sensor' : 'actuator';
  const mappedSubType = isSensor
    ? (['temperature', 'humidity', 'light', 'motion'].includes(rawTypeName) ? rawTypeName : 'temperature')
    : (['light', 'fan', 'door'].includes(rawTypeName) ? rawTypeName : 'light');
  const thresholdData = d.threshold_data || d.threshold;

  return {
    id: String(d.device_id),
    name: d.device_name,
    type: mappedType,
    subType: mappedSubType as any,
    roomId: String(d.room),
    isOn: Boolean(d.status),
    brightness: typeof d.brightness === 'number' ? d.brightness : 0,
    lastUpdated: new Date(d.created_at || Date.now()),
    description: d.description,
    currentValue: typeof d.current_value === 'number' ? d.current_value : undefined,
    unit: d.unit || undefined,
    threshold: thresholdData
      ? {
          id: String(thresholdData.threshold_id),
          // Chỉ nhận threshold nếu giá trị > 0 (0 = chưa set, backend gửi default)
          min: (typeof thresholdData.min_value === 'number' && thresholdData.min_value > 0)
                ? thresholdData.min_value
                : undefined,
          max: (typeof thresholdData.max_value === 'number' && thresholdData.max_value > 0)
                ? thresholdData.max_value
                : undefined,
          requireMotion: typeof thresholdData.require_motion === 'boolean' 
                ? thresholdData.require_motion 
                : true,
        }
      : undefined,
  };
}

function mapAlert(a: any): Alert {
  return {
    id: String(a.alert_id),
    deviceId: a.device ? String(a.device) : '',
    deviceName: a.device_name || 'Unknown Device',
    roomName: a.room_name || 'Unknown Room',
    floorName: a.floor_name || undefined,
    type: 'threshold_exceeded',
    severity: 'medium',
    message: a.message,
    actualValue: a.value ?? undefined,
    timestamp: new Date(a.created_at || Date.now()),
    cleared: false,
    homeId: 'home1',
  };
}

function mapSchedule(s: any): Schedule {
  const daysOfWeek = s.repeat_type === 'weekend'
    ? [0, 6]
    : s.repeat_type === 'weekday'
    ? [1, 2, 3, 4, 5]
    : s.repeat_type === 'once'
    ? []
    : [0, 1, 2, 3, 4, 5, 6];
  const scopeId = s.room;
  const scopeName = s.room_name || '';
  return {
    id: String(s.schedule_id),
    name: `${scopeName} – ${s.action}`,
    enabled: Boolean(s.status),
    scope: { type: 'room', id: String(scopeId), name: scopeName },
    action: s.action === 'toggle' ? 'toggle' : s.action === 'on' ? 'on' : 'off',
    time: s.schedule_time || '00:00',
    daysOfWeek,
    createdAt: new Date(Date.now()),
    homeId: 'home1',
  };
}

function mapAuditLog(log: any): AuditLog {
  const rawAction = String(log.action || 'unknown_action');
  const actionParts = rawAction.split(' | ');
  const actionName = actionParts.shift();
  const detailsPart = actionParts.join(' | ');

  let source: AuditLog['source'] = 'system';
  if (log.user) source = 'user';
  else if (log.device) source = 'device';

  const actionForCategory = actionName || rawAction;
  let category: AuditLog['category'] = 'system';
  if (actionForCategory.startsWith('device_')) category = 'device';
  else if (actionForCategory.startsWith('room_') || actionForCategory.includes('permission')) category = 'room';
  else if (actionForCategory.startsWith('floor_')) category = 'floor';
  else if (actionForCategory.startsWith('schedule_')) category = 'schedule';
  else if (actionForCategory.includes('alert') || actionForCategory.includes('threshold')) category = 'alert';
  else if (actionForCategory.startsWith('user_')) category = 'user';

  return {
    id: String(log.log_id),
    timestamp: new Date(log.action_time || Date.now()),
    userId: log.user ? String(log.user) : undefined,
    userName: log.user_name || (source === 'device' ? 'Auto Device' : 'System'),
    source,
    action: actionName || rawAction,
    category,
    entityType: category as any,
    entityId: log.device ? String(log.device) : undefined,
    entityName: log.device_name || log.room_name || log.floor_name,
    deviceName: log.device_name || undefined,
    roomName: log.room_name || undefined,
    floorName: log.floor_name || undefined,
    details: detailsPart || actionName || rawAction,
    homeId: 'home1',
    homeName: 'Smart Home',
  };
}

function mapHistoryLog(log: any): HistoryLog {
  const action = String(log.action || '');
  let eventType: HistoryLog['eventType'] = 'system';
  if (action.startsWith('device_')) eventType = 'manual_control';
  if (action.startsWith('schedule_')) eventType = 'scheduled_action';
  if (action.includes('alert') || action.includes('threshold')) eventType = 'threshold_alert';

  const historyParts = String(log.action || '').split(' | ');
  historyParts.shift();
  const detailsPart = historyParts.join(' | ');

  return {
    id: String(log.log_id),
    timestamp: new Date(log.action_time || Date.now()),
    deviceId: log.device ? String(log.device) : '',
    deviceName: log.device_name || 'Unknown Device',
    roomName: log.room_name || 'Unknown Room',
    eventType,
    details: detailsPart || action || '',
    userId: log.user ? String(log.user) : undefined,
    userName: log.user_name || undefined,
    homeId: 'home1',
  };
}

interface AppContextType {
  // Auth
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => boolean;
  loginContext: (userData: { id: string; name: string; email: string; role: 'admin' | 'user' }) => void;
  logout: () => void;
  
  // Data (filtered based on user permissions)
  homes: Home[];
  floors: Floor[];
  rooms: Room[];
  devices: Device[];
  alerts: Alert[];
  schedules: Schedule[];
  historyLogs: HistoryLog[];
  users: User[];
  auditLogs: AuditLog[];
  
  // Helper functions
  canAccessRoom: (roomId: string) => boolean;
  canAccessDevice: (deviceId: string) => boolean;
  
  // Actions
  toggleDevice: (deviceId: string) => void;
  toggleDevices: (deviceIds: string[]) => void;
  setBrightness: (deviceId: string, brightness: number) => void;
  setFanSpeed: (deviceId: string, speedPercent: number) => void;
  setDeviceOn: (deviceId: string, on: boolean) => void;
  updateDeviceThreshold: (deviceId: string, min?: number, max?: number, requireMotion?: boolean) => void;
  clearAlert: (alertId: string) => void;
  deleteAlert: (alertId: string) => void;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => void;
  updateSchedule: (scheduleId: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (scheduleId: string) => void;
  toggleSchedule: (scheduleId: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'lastActive'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  updateUserRoomPermissions: (userId: string, roomIds: string[]) => void;
  addFloor: (floor: Omit<Floor, 'id' | 'roomCount'>) => void;
  updateFloor: (floorId: string, updates: Partial<Floor>) => void;
  deleteFloor: (floorId: string) => void;
  addRoom: (room: Omit<Room, 'id' | 'deviceCount'>) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  deleteRoom: (roomId: string) => void;
  addDevice: (device: Omit<Device, 'id' | 'lastUpdated'>) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  deleteDevice: (deviceId: string) => void;
  addHome: (home: Omit<Home, 'id' | 'createdAt'>) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// For better HMR support
AppContext.displayName = 'AppContext';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const uid = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const role = (localStorage.getItem('role') || 'user') as 'admin' | 'user';
    if (!uid || !username) return null;
    return {
      id: uid,
      name: username,
      email: email || '',
      role,
      homeId: 'home1',
      createdAt: new Date(),
      lastActive: new Date(),
      roomPermissions: [],
    };
  });
  const [homes] = useState<Home[]>([{ id: 'home1', name: 'Smart Home', ownerId: '1', createdAt: new Date() }]);
  const [allFloors, setAllFloors] = useState<Floor[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>([]);
  const brightnessSyncTimersRef = useRef<Record<string, number>>({});
  const devicesSnapshotRef = useRef<Device[]>([]);
  const roomsSnapshotRef = useRef<Room[]>([]);
  const lastManualActionsRef = useRef<Map<string, { isOn: boolean; brightness?: number; timestamp: number }>>(new Map());
  const PROTECTION_WINDOW_MS = 10_000;

  const syncLatestSensorValues = useCallback(async () => {
    const [latestSensorData, latestDevicesRaw] = await Promise.all([
      sensorDataApi.latest().catch(() => []),
      devicesApi.list().catch(() => []),
    ]);
    if (!Array.isArray(latestSensorData) && !Array.isArray(latestDevicesRaw)) return;

    const latestByDeviceId = new Map<string, { value: number; unit?: string }>();
    (latestSensorData as any[]).forEach((entry) => {
      const deviceId = String(entry.device);
      const value = Number(entry.value);
      if (!Number.isFinite(value)) return;
      if (!latestByDeviceId.has(deviceId)) {
        latestByDeviceId.set(deviceId, { value, unit: entry.unit || undefined });
      }
    });

    const latestDeviceById = new Map<string, Device>();
    (latestDevicesRaw as any[]).forEach((raw) => {
      const mapped = mapDevice(raw);
      latestDeviceById.set(mapped.id, mapped);
    });

    if (latestByDeviceId.size === 0 && latestDeviceById.size === 0) return;

    setAllDevices((prev) => prev.map((device) => {
      const latest = latestByDeviceId.get(device.id);
      const serverDevice = latestDeviceById.get(device.id);

      const now = Date.now();
      const lastAction = lastManualActionsRef.current.get(device.id);
      const isProtected = lastAction && (now - lastAction.timestamp < PROTECTION_WINDOW_MS);

      if (!latest && !serverDevice) return device;

      return {
        ...device,
        ...(serverDevice
          ? {
              name: serverDevice.name,
              roomId: serverDevice.roomId,
              type: serverDevice.type,
              subType: serverDevice.subType,
              description: serverDevice.description,
              threshold: serverDevice.threshold,
              isOn: isProtected ? lastAction.isOn : serverDevice.isOn,
              brightness:
                (isProtected && lastAction.brightness !== undefined)
                  ? lastAction.brightness
                  : serverDevice.brightness,
            }
          : {}),
        currentValue: latest ? latest.value : device.currentValue,
        unit: latest ? (latest.unit || device.unit) : device.unit,
        lastUpdated: new Date(),
      };
    }));
  }, []);

  // ─── Fetch all data from API ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [floors, rooms, devices, alertsList, schedulesList, usersList, deviceTypesRes, latestSensorData] = await Promise.all([
        buildingApi.floors().catch(() => []),
        buildingApi.rooms().catch(() => []),
        devicesApi.list().catch(() => []),
        alertsApi.list().catch(() => []),
        schedulesApi.list().catch(() => []),
        usersApi.list().catch(() => []),
        devicesApi.types().catch(() => []),
        sensorDataApi.latest().catch(() => []),
      ]);

      const latestByDeviceId = new Map<string, { value: number; unit?: string }>();
      (latestSensorData as any[]).forEach((entry) => {
        const deviceId = String(entry.device);
        const value = Number(entry.value);
        if (!Number.isFinite(value)) return;
        if (!latestByDeviceId.has(deviceId)) {
          latestByDeviceId.set(deviceId, { value, unit: entry.unit || undefined });
        }
      });

      const mappedDevices = (devices as any[]).map((raw) => {
        const mapped = mapDevice(raw);
        const latest = latestByDeviceId.get(mapped.id);
        
        // 🛡️ Short-term Memory Guard (10s) to prevent snap-back on refocus/switch
        const now = Date.now();
        const lastAction = lastManualActionsRef.current.get(mapped.id);
        const isProtected = lastAction && (now - lastAction.timestamp < PROTECTION_WINDOW_MS);

        return {
          ...mapped,
          isOn: isProtected ? lastAction.isOn : mapped.isOn,
          brightness: (isProtected && lastAction.brightness !== undefined) ? lastAction.brightness : mapped.brightness,
          currentValue: latest ? latest.value : mapped.currentValue,
          unit: (latest && latest.unit) ? latest.unit : mapped.unit,
        };
      });

      setAllFloors((floors as any[]).map(mapFloor));
      setAllRooms((rooms as any[]).map(mapRoom));
      setAllDevices(mappedDevices);
      setDeviceTypes(deviceTypesRes as any[]);
      setAlerts((alertsList as any[]).map(mapAlert));
      setSchedules((schedulesList as any[]).map(mapSchedule));
      setUsers((usersList as any[]).map(mapUser));
      const logs = await logsApi.list().catch(() => []);
      const mappedAuditLogs = (logs as any[]).map(mapAuditLog);
      setAllAuditLogs(mappedAuditLogs);
      setHistoryLogs(
        (logs as any[])
          .filter((l) => Boolean(l.device))
          .map(mapHistoryLog)
      );
    } catch (e) {
      console.error('fetchAll error', e);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, currentUser?.id]);

  useEffect(() => {
    devicesSnapshotRef.current = allDevices;
  }, [allDevices]);

  useEffect(() => {
    roomsSnapshotRef.current = allRooms;
  }, [allRooms]);

  useEffect(() => {
    return () => {
      Object.values(brightnessSyncTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      brightnessSyncTimersRef.current = {};
    };
  }, []);

  // Fallback anti-delay: nếu websocket miss event thì vẫn sync latest data mỗi 5s.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      syncLatestSensorValues();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [syncLatestSensorValues]);

  // Global realtime bridge: cập nhật trực tiếp từ websocket để giảm độ trễ UI.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let alertsRefreshTimer: number | null = null;

    const scheduleAlertsRefresh = () => {
      if (alertsRefreshTimer) return;
      alertsRefreshTimer = window.setTimeout(async () => {
        alertsRefreshTimer = null;
        try {
          const alertsList = await alertsApi.list();
          setAlerts((alertsList as any[]).map(mapAlert));
        } catch (e) {
          console.error('alerts refresh error', e);
        }
      }, 120);
    };

    const updateDeviceFromEvent = (eventData: any) => {
      if (!eventData?.device_id) return;


      
      setAllDevices(prev => prev.map(device => {
        if (device.id === String(eventData.device_id)) {
          return {
            ...device,
            currentValue: Number(eventData.value),
            unit: eventData.unit || device.unit,
            lastUpdated: new Date(),
          };
        }
        return device;
      }));
    };

    const updateDeviceStatusFromEvent = (eventData: any) => {
      if (!eventData?.device_id) return;
      
      const deviceId = String(eventData.device_id);
      
      // 🛡️ Short-term Memory Guard (10s)
      const now = Date.now();
      const lastAction = lastManualActionsRef.current.get(deviceId);
      const isProtected = lastAction && (now - lastAction.timestamp < PROTECTION_WINDOW_MS);

      console.log(`📥 WebSocket event: device_id=${deviceId}, brightness=${eventData.brightness}, isProtected=${isProtected}`);
      
      setAllDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId
            ? {
                ...device,
                isOn: isProtected
                    ? lastAction.isOn
                    : (typeof eventData.status === 'boolean'
                        ? eventData.status
                        : (typeof eventData.status === 'number'
                            ? eventData.status > 0
                            : device.isOn)),
                brightness:
                  isProtected && lastAction.brightness !== undefined
                    ? lastAction.brightness
                    : (typeof eventData.brightness !== 'number'
                        ? device.brightness
                        : Math.max(0, Math.min(100, Math.round(eventData.brightness)))),
                lastUpdated: new Date(),
              }
            : device
        )
      );
    };

    const addAlertFromEvent = (eventData: any) => {
      const deviceId = String(eventData?.device_id || '');
      const matchedDevice = devicesSnapshotRef.current.find((d) => d.id === deviceId);
      const matchedRoom = matchedDevice
        ? roomsSnapshotRef.current.find((r) => r.id === matchedDevice.roomId)
        : undefined;

      const liveAlert: Alert = {
        id: String(eventData?.alert_id || Date.now()),
        deviceId,
        deviceName: matchedDevice?.name || 'Unknown Device',
        roomName: matchedRoom?.name || 'Unknown Room',
        type: 'threshold_exceeded',
        severity: 'medium',
        message: String(eventData?.message || 'Threshold exceeded'),
        timestamp: new Date(),
        cleared: false,
        homeId: 'home1',
      };

      setAlerts((prev) => {
        if (prev.some((a) => a.id === liveAlert.id)) return prev;
        return [liveAlert, ...prev];
      });
    };

    const connect = () => {
      ws = connectSensorWebSocket(
        (message: any) => {
          const eventType = message?.event;
          const payload = message;

          if (eventType === 'sensor_data') {
            updateDeviceFromEvent(payload);

          } else if (eventType === 'device_status') {
            updateDeviceStatusFromEvent(payload);
          } else if (eventType === 'alert') {
            addAlertFromEvent(payload);
            scheduleAlertsRefresh();
          }
        },
        () => {
          if (reconnectTimer) return;
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2000);
        }
      );
    };

    connect();

    return () => {
      if (alertsRefreshTimer) window.clearTimeout(alertsRefreshTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchAll();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchAll]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const logs = await logsApi.list().catch(() => []);
      const mappedAuditLogs = (logs as any[]).map(mapAuditLog);
      setAllAuditLogs(mappedAuditLogs);
      setHistoryLogs(
        (logs as any[])
          .filter((l) => Boolean(l.device))
          .map(mapHistoryLog)
      );
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Fetch room permissions for non-admin users whenever the user changes
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;
    permissionsApi.getUserRooms(Number(currentUser.id)).then((perms) => {
      const roomIds = perms.map(p => String(p.room_id));
      setCurrentUser(prev => prev ? { ...prev, roomPermissions: roomIds } : prev);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const isAdmin = currentUser?.role === 'admin' || false;

  const loginContext = useCallback((userData: { id: string; name: string; email: string; role: 'admin' | 'user' }) => {
    setCurrentUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      homeId: 'home1',
      createdAt: new Date(),
      lastActive: new Date(),
      roomPermissions: [],
    });
  }, []);

  const login = (email: string, password: string): boolean => {
    const user = users.find((u) => u.email === email);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const canAccessRoom = (roomId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return Boolean(currentUser.roomPermissions?.includes(roomId));
  };

  const canAccessDevice = (deviceId: string): boolean => {
    const device = allDevices.find((d) => d.id === deviceId);
    if (!device) return false;
    return canAccessRoom(device.roomId);
  };

  // Filter data based on user permissions
  const floors = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allFloors;
    return allFloors.filter((f) => allRooms.some((r) => r.floorId === f.id && canAccessRoom(r.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, allFloors, allRooms]);

  const rooms = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allRooms;
    return allRooms.filter((r) => canAccessRoom(r.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, allRooms]);

  const auditLogs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allAuditLogs;
    const allowedRoomIds = new Set(currentUser.roomPermissions || []);
    const allowedDeviceNames = new Set(
      allDevices.filter((d) => allowedRoomIds.has(d.roomId)).map((d) => d.name)
    );
    const usernameMarker = `"${String(currentUser.name || '').toLowerCase()}"`;

    return allAuditLogs.filter((log) => {
      if (log.userId === currentUser.id) {
        return true;
      }
      if (log.action === 'room_permissions_updated' || log.action === 'room_permission_assigned') {
        const details = String(log.details || '').toLowerCase();
        if (usernameMarker !== '""' && details.includes(usernameMarker)) {
          return true;
        }
      }
      if (!log.userId && log.deviceName && allowedDeviceNames.has(log.deviceName)) {
        return true;
      }
      return false;
    });
  }, [currentUser, allAuditLogs, allDevices]);

  const devices = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allDevices;
    return allDevices.filter((d) => canAccessRoom(d.roomId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, allDevices]);

  const toggleDevice = async (deviceId: string) => {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    // 🛡️ Record Intent for 10s protection
    const nextOn = !device.isOn;
    lastManualActionsRef.current.set(deviceId, { isOn: nextOn, brightness: device.brightness, timestamp: Date.now() });

    try {
      await devicesApi.toggle(Number(deviceId));
      setAllDevices(prev => prev.map(d =>
        d.id === deviceId ? { ...d, isOn: !d.isOn, lastUpdated: new Date() } : d
      ));
    } catch (e) {
      console.error('toggleDevice error', e);
    }
  };

  const toggleDevices = async (deviceIds: string[]) => {
    const allOn = deviceIds.every(id => allDevices.find(d => d.id === id)?.isOn);
    await Promise.all(deviceIds.map(id =>
      allOn ? devicesApi.turnOff(Number(id)) : devicesApi.turnOn(Number(id))
    )).catch(console.error);
    setAllDevices(prev => prev.map(d =>
      deviceIds.includes(d.id) ? { ...d, isOn: !allOn, lastUpdated: new Date() } : d
    ));
  };

  const setBrightness = async (deviceId: string, brightness: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(brightness)));
    const isOn = clamped > 0;

    // 🛡️ Record Intent for 10s protection
    lastManualActionsRef.current.set(deviceId, { isOn, brightness: clamped, timestamp: Date.now() });

    const previousDevice = allDevices.find((d) => d.id === deviceId);
    const previousBrightness = previousDevice?.brightness ?? 0;
    const previousIsOn = previousDevice?.isOn ?? false;

    console.log(`📤 setBrightness request: deviceId=${deviceId}, brightness=${clamped}%`);

    // Optimistic UI update
    setAllDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, brightness: clamped, isOn, lastUpdated: new Date() }
          : d
      )
    );

    const existingTimer = brightnessSyncTimersRef.current[deviceId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    brightnessSyncTimersRef.current[deviceId] = window.setTimeout(async () => {
      try{
        console.log(`📡 Sending brightness API: deviceId=${deviceId}, brightness=${clamped}%`);
        // ✅ Send 0-100% directly
        await devicesApi.setBrightness(Number(deviceId), clamped);
      } catch (e) {
        console.error('setBrightness error', e);
        const statusCode = (e as any)?.status;
        // Keep optimistic state when CoreIoT is unavailable; don't snap back to Off.
        if (statusCode === 502 || statusCode === 503) {
          return;
        }
        setAllDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId
              ? { ...d, brightness: previousBrightness, isOn: previousIsOn, lastUpdated: new Date() }
              : d
          )
        );
      }
    }, 120);
  };

  // ✅ Fan speed: 0-100% published to server (no conversion)
  const fanSpeedTimersRef = useRef<Record<string, number>>({});
  const setFanSpeed = async (deviceId: string, speedPercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(speedPercent)));
    const isOn = clamped > 0;

    // 🛡️ Record Intent for 10s protection
    lastManualActionsRef.current.set(deviceId, { isOn, brightness: clamped, timestamp: Date.now() });

    const previousDevice = allDevices.find(d => d.id === deviceId);

    setAllDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, brightness: clamped, isOn, lastUpdated: new Date() } : d
    ));

    const existingTimer = fanSpeedTimersRef.current[deviceId];
    if (existingTimer) window.clearTimeout(existingTimer);

    fanSpeedTimersRef.current[deviceId] = window.setTimeout(async () => {
      try {
        // ✅ Send only 0-100% to server (no conversion)
        await devicesApi.setFanSpeed(Number(deviceId), clamped);
      } catch (e) {
        console.error('setFanSpeed error', e);
        const statusCode = (e as any)?.status;
        // Keep optimistic state when CoreIoT is unavailable; don't snap back to Off.
        if (statusCode === 502 || statusCode === 503) {
          return;
        }
        setAllDevices(prev => prev.map(d =>
          d.id === deviceId
            ? { ...d, brightness: previousDevice?.brightness ?? 0, isOn: previousDevice?.isOn ?? false, lastUpdated: new Date() }
            : d
        ));
      }
    }, 120);
  };

  // Direct on/off – does NOT toggle, just forces state
  const setDeviceOn = async (deviceId: string, on: boolean) => {
    const device = allDevices.find(d => d.id === deviceId);
    
    // 🛡️ Record Intent for 10s protection
    lastManualActionsRef.current.set(deviceId, { isOn: on, brightness: device?.brightness, timestamp: Date.now() });

    try {
      if (on) await devicesApi.turnOn(Number(deviceId));
      else    await devicesApi.turnOff(Number(deviceId));
      setAllDevices(prev => prev.map(d =>
        d.id === deviceId ? { ...d, isOn: on, lastUpdated: new Date() } : d
      ));
    } catch (e) {
      console.error('setDeviceOn error', e);
    }
  };

  const updateDeviceThreshold = (deviceId: string, min?: number, max?: number, requireMotion: boolean = true) => {
    const device = allDevices.find((d) => d.id === deviceId);
    const threshold = device?.threshold;
    const payload = {
      threshold_data: {
        min_value: min,
        max_value: max,
        require_motion: requireMotion,
      },
    };
    devicesApi.update(Number(deviceId), payload).catch(console.error);
    setAllDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              threshold: {
                id: threshold?.id,
                min,
                max,
                action: threshold?.action || 'none',
                targetDeviceId: threshold?.targetDeviceId,
                targetDeviceName: threshold?.targetDeviceName,
                requireMotion,
              },
              lastUpdated: new Date(),
            }
          : d
      )
    );
  };

  const clearAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, cleared: true, clearedAt: new Date() } : a));
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await alertsApi.delete(Number(alertId));
    } catch {}
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const addSchedule = async (schedule: Omit<Schedule, 'id' | 'createdAt'>) => {
    try {
      const roomId = schedule.scope.type === 'room'
        ? schedule.scope.id
        : allDevices.find((d) => d.id === schedule.scope.id)?.roomId;
      if (!roomId) {
        return;
      }
      const data = {
        room: Number(roomId),
        action: schedule.action,
        schedule_time: schedule.time,
        repeat_type: schedule.daysOfWeek.length === 0 ? 'once'
          : schedule.daysOfWeek.length === 2 ? 'weekend'
          : schedule.daysOfWeek.length === 5 ? 'weekday' : 'daily',
        status: schedule.enabled,
      };
      const res: any = await schedulesApi.create(data);
      setSchedules(prev => [...prev, mapSchedule(res)]);
    } catch (e) {
      console.error('addSchedule error', e);
    }
  };

  const updateSchedule = async (scheduleId: string, updates: Partial<Schedule>) => {
    try {
      const data: any = {};
      if (updates.enabled !== undefined) data.status = updates.enabled;
      if (updates.action) data.action = updates.action;
      if (updates.time) data.schedule_time = updates.time;
      if (updates.daysOfWeek) {
        data.repeat_type = updates.daysOfWeek.length === 0 ? 'once'
          : updates.daysOfWeek.length === 2 ? 'weekend'
          : updates.daysOfWeek.length === 5 ? 'weekday' : 'daily';
      }
      if (updates.scope) {
        const roomId = updates.scope.type === 'room'
          ? updates.scope.id
          : allDevices.find((d) => d.id === updates.scope?.id)?.roomId;
        if (roomId) data.room = Number(roomId);
      }
      await schedulesApi.update(Number(scheduleId), data);
    } catch {}
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, ...updates } : s));
  };

  const deleteSchedule = async (scheduleId: string) => {
    try { await schedulesApi.delete(Number(scheduleId)); } catch {}
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  const toggleSchedule = async (scheduleId: string) => {
    const s = schedules.find(s => s.id === scheduleId);
    if (!s) return;
    await updateSchedule(scheduleId, { enabled: !s.enabled });
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt' | 'lastActive'>) => {
    // handled by AdminManageUsersScreen directly via usersApi
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const updateUserRoomPermissions = async (userId: string, roomIds: string[]) => {
    try {
      await permissionsApi.setUserRooms(Number(userId), roomIds.map(Number));
    } catch (e) { console.error('updateUserRoomPermissions error', e); }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, roomPermissions: roomIds } : u));
    // If the updated user is the current user, refresh their permissions too
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, roomPermissions: roomIds } : prev);
    }
  };

  const addFloor = async (floor: Omit<Floor, 'id' | 'roomCount'>) => {
    if (!isAdmin) return;
    try {
      const res: any = await buildingApi.createFloor({ floor_name: floor.name, level: floor.level });
      setAllFloors(prev => [...prev, mapFloor(res)]);
    } catch (e) { console.error('addFloor error', e); }
  };

  const updateFloor = async (floorId: string, updates: Partial<Floor>) => {
    if (!isAdmin) return;
    try {
      const data: any = {};
      if (updates.name) data.floor_name = updates.name;
      if (updates.level !== undefined) data.level = updates.level;
      await buildingApi.updateFloor(Number(floorId), data);
    } catch {}
    setAllFloors(prev => prev.map(f => f.id === floorId ? { ...f, ...updates } : f));
  };

  const deleteFloor = async (floorId: string) => {
    if (!isAdmin) return;
    try { await buildingApi.deleteFloor(Number(floorId)); } catch {}
    setAllFloors(prev => prev.filter(f => f.id !== floorId));
    setAllRooms(prev => prev.filter(r => r.floorId !== floorId));
  };

  const addRoom = async (room: Omit<Room, 'id' | 'deviceCount'>) => {
    if (!isAdmin) return;
    try {
      const res: any = await buildingApi.createRoom({ room_name: room.name, floor: Number(room.floorId) });
      setAllRooms(prev => [...prev, mapRoom(res)]);
      setAllFloors(prev => prev.map(f => f.id === room.floorId ? { ...f, roomCount: f.roomCount + 1 } : f));
    } catch (e) { console.error('addRoom error', e); }
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    if (!isAdmin) return;
    try {
      const data: any = {};
      if (updates.name) data.room_name = updates.name;
      if (updates.floorId) data.floor = Number(updates.floorId);
      await buildingApi.updateRoom(Number(roomId), data);
    } catch {}
    setAllRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
  };

  const deleteRoom = async (roomId: string) => {
    if (!isAdmin) return;
    const room = allRooms.find(r => r.id === roomId);
    try { await buildingApi.deleteRoom(Number(roomId)); } catch {}
    setAllRooms(prev => prev.filter(r => r.id !== roomId));
    if (room) setAllFloors(prev => prev.map(f => f.id === room.floorId ? { ...f, roomCount: Math.max(0, f.roomCount - 1) } : f));
  };

  const addDevice = async (device: Omit<Device, 'id' | 'lastUpdated'>) => {
    if (!isAdmin && !canAccessRoom(device.roomId)) return;
    try {
      const typeName = device.subType || device.type;
      const matchedType = deviceTypes.find((t) => String(t.name_type).toLowerCase() === String(typeName).toLowerCase())
        || deviceTypes.find((t) => String(t.name_type).toLowerCase() === String(device.type).toLowerCase());
      const res: any = await devicesApi.create({
        device_name: device.name,
        type: matchedType?.type_id,
        room: Number(device.roomId),
        status: device.isOn ?? false,
        threshold_data: device.threshold
          ? {
              min_value: device.threshold.min,
              max_value: device.threshold.max,
            }
          : undefined,
      });
      setAllDevices(prev => [...prev, mapDevice(res)]);
      setAllRooms(prev => prev.map(r => r.id === device.roomId ? { ...r, deviceCount: r.deviceCount + 1 } : r));
    } catch (e) { console.error('addDevice error', e); }
  };

  const updateDevice = async (deviceId: string, updates: Partial<Device>) => {
    const device = allDevices.find(d => d.id === deviceId);
    if (!isAdmin && device && !canAccessRoom(device.roomId)) return;
    try {
      const data: any = {};
      const nextTypeName = updates.subType || updates.type || device?.subType || device?.type;
      const matchedType = deviceTypes.find((t) => String(t.name_type).toLowerCase() === String(nextTypeName).toLowerCase());
      if (updates.name) data.device_name = updates.name;
      if (matchedType) data.type = matchedType.type_id;
      if (updates.isOn !== undefined) data.status = updates.isOn;
      if (updates.threshold) {
        data.threshold_data = {
          min_value: updates.threshold.min,
          max_value: updates.threshold.max,
        };
      }
      await devicesApi.update(Number(deviceId), data);
    } catch {}
    setAllDevices(prev => prev.map(d => d.id === deviceId ? { ...d, ...updates, lastUpdated: new Date() } : d));
  };

  const deleteDevice = async (deviceId: string) => {
    const device = allDevices.find(d => d.id === deviceId);
    if (!isAdmin && device && !canAccessRoom(device.roomId)) return;
    try { await devicesApi.delete(Number(deviceId)); } catch {}
    setAllDevices(prev => prev.filter(d => d.id !== deviceId));
    if (device) setAllRooms(prev => prev.map(r => r.id === device.roomId ? { ...r, deviceCount: Math.max(0, r.deviceCount - 1) } : r));
  };

  const addHome = (_home: Omit<Home, 'id' | 'createdAt'>) => { /* no-op */ };
  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    setAllAuditLogs((prev) => [
      {
        ...log,
        id: String(Date.now()),
        timestamp: new Date(),
      },
      ...prev,
    ]);
  };

  const contextValue = useMemo(
    () => ({
      currentUser,
      isAdmin,
      login,
      loginContext,
      logout,
      homes,
      floors,
      rooms,
      devices,
      alerts,
      schedules,
      historyLogs,
      users,
      auditLogs,
      canAccessRoom,
      canAccessDevice,
      toggleDevice,
      toggleDevices,
      setBrightness,
      setFanSpeed,
      setDeviceOn,
      updateDeviceThreshold,
      clearAlert,
      deleteAlert,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      toggleSchedule,
      addUser,
      updateUser,
      deleteUser,
      updateUserRoomPermissions,
      addFloor,
      updateFloor,
      deleteFloor,
      addRoom,
      updateRoom,
      deleteRoom,
      addDevice,
      updateDevice,
      deleteDevice,
      addHome,
      addAuditLog,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, isAdmin, homes, floors, rooms, devices, alerts, schedules, historyLogs, users, auditLogs]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};