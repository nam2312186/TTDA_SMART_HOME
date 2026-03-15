import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
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
import { buildingApi, devicesApi, alertsApi, schedulesApi, permissionsApi, logsApi, usersApi } from '../services/api';

function mapFloor(f: any): Floor {
  return {
    id: String(f.floor_id),
    name: f.floor_name,
    level: f.level ?? 1,
    roomCount: f.room_count ?? 0,
    ownerUserId: f.user ? String(f.user) : undefined,
    homeId: 'home1',
  };
}

function mapRoom(r: any): Room {
  return {
    id: String(r.room_id),
    name: r.room_name,
    floorId: String(r.floor),
    ownerUserId: r.user ? String(r.user) : undefined,
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
  return {
    id: String(d.device_id),
    name: d.device_name,
    type: d.device_type,
    subType: d.device_subtype,
    roomId: String(d.room),
    isOn: Boolean(d.status),
    lastUpdated: new Date(d.updated_at || d.created_at || Date.now()),
    description: d.description,
    currentValue: typeof d.current_value === 'number' ? d.current_value : undefined,
    unit: d.unit || undefined,
    threshold: d.threshold
      ? {
          id: String(d.threshold.threshold_id),
          min: d.threshold.min_value ?? undefined,
          max: d.threshold.max_value ?? undefined,
          action: d.threshold.trigger_action,
          targetDeviceId: d.threshold.target_device ? String(d.threshold.target_device) : undefined,
          targetDeviceName: d.threshold.target_device_name || undefined,
        }
      : undefined,
  };
}

function mapAlert(a: any): Alert {
  const direction = a.threshold_direction as 'low' | 'high' | undefined;
  const gap = typeof a.actual_value === 'number' && typeof a.threshold_value === 'number'
    ? Math.abs(a.actual_value - a.threshold_value)
    : 0;
  return {
    id: String(a.alert_id),
    deviceId: a.device ? String(a.device) : '',
    deviceName: a.device_name || 'Unknown Device',
    roomName: a.room_name || 'Unknown Room',
    floorName: a.floor_name || undefined,
    type: 'threshold_exceeded',
    severity: gap >= 10 ? 'high' : gap >= 5 ? 'medium' : 'low',
    message: a.message,
    metric: a.metric || undefined,
    thresholdDirection: direction,
    thresholdValue: a.threshold_value ?? undefined,
    actualValue: a.actual_value ?? undefined,
    unit: a.unit || undefined,
    triggeredAction: a.triggered_action || 'none',
    targetDeviceId: a.target_device ? String(a.target_device) : undefined,
    targetDeviceName: a.target_device_name || undefined,
    metadata: a.metadata || {},
    timestamp: new Date(a.created_at || Date.now()),
    cleared: Boolean(a.is_read),
    homeId: 'home1',
  };
}

function mapSchedule(s: any): Schedule {
  const daysOfWeek = Array.isArray(s.days_of_week)
    ? s.days_of_week
    : s.repeat_type === 'weekend'
    ? [0, 6]
    : s.repeat_type === 'weekday'
    ? [1, 2, 3, 4, 5]
    : s.repeat_type === 'once'
    ? []
    : [0, 1, 2, 3, 4, 5, 6];
  const scopeType = s.scope_type === 'room' ? 'room' : 'device';
  const scopeId = scopeType === 'room' ? s.room : s.device;
  const scopeName = s.scope_name || (scopeType === 'room' ? s.room_name : s.device_name) || '';
  return {
    id: String(s.schedule_id),
    name: s.name || `${scopeName} – ${s.action}`,
    enabled: Boolean(s.status),
    scope: { type: scopeType, id: String(scopeId), name: scopeName },
    action: s.action === 'toggle' ? 'toggle' : s.action === 'on' ? 'on' : 'off',
    time: s.schedule_time || '00:00',
    daysOfWeek,
    createdAt: new Date(s.created_at || Date.now()),
    homeId: 'home1',
  };
}

function mapAuditLog(log: any): AuditLog {
  return {
    id: String(log.log_id),
    timestamp: new Date(log.action_time || Date.now()),
    userId: log.user ? String(log.user) : undefined,
    userName: log.user_name || (log.source === 'device' ? 'Auto Device' : 'System'),
    source: log.source || 'system',
    action: log.action || 'unknown_action',
    category: log.category || 'system',
    entityType: (log.metadata?.entity_type || log.category) as any,
    entityId: log.device ? String(log.device) : undefined,
    entityName: log.device_name || log.room_name || log.floor_name,
    deviceName: log.device_name || undefined,
    roomName: log.room_name || undefined,
    floorName: log.floor_name || undefined,
    details: log.details || log.action || '',
    homeId: 'home1',
    homeName: 'Smart Home',
  };
}

function mapHistoryLog(log: any): HistoryLog {
  const category = log.category || 'system';
  let eventType: HistoryLog['eventType'] = 'system';
  if (category === 'device') eventType = 'manual_control';
  if (category === 'schedule') eventType = 'scheduled_action';
  if (category === 'alert') eventType = 'threshold_alert';

  return {
    id: String(log.log_id),
    timestamp: new Date(log.action_time || Date.now()),
    deviceId: log.device ? String(log.device) : '',
    deviceName: log.device_name || 'Unknown Device',
    roomName: log.room_name || 'Unknown Room',
    eventType,
    details: log.details || log.action || '',
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
  updateDeviceThreshold: (deviceId: string, min?: number, max?: number) => void;
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>([]);

  // ─── Fetch all data from API ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [floors, rooms, devices, alertsList, schedulesList, usersList] = await Promise.all([
        buildingApi.floors().catch(() => []),
        buildingApi.rooms().catch(() => []),
        devicesApi.list().catch(() => []),
        alertsApi.list().catch(() => []),
        schedulesApi.list().catch(() => []),
        usersApi.list().catch(() => []),
      ]);
      setAllFloors((floors as any[]).map(mapFloor));
      setAllRooms((rooms as any[]).map(mapRoom));
      setAllDevices((devices as any[]).map(mapDevice));
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
    const room = allRooms.find((r) => r.id === roomId);
    const floor = room ? allFloors.find((f) => f.id === room.floorId) : undefined;
    const isOwner = room?.ownerUserId === currentUser.id || floor?.ownerUserId === currentUser.id;
    return Boolean(isOwner || currentUser.roomPermissions?.includes(roomId));
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
    // Show floors that user owns OR has at least one accessible room
    return allFloors.filter((f) =>
      f.ownerUserId === currentUser.id ||
      allRooms.some((r) => r.floorId === f.id && canAccessRoom(r.id))
    );
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

    const ownedFloorIds = new Set(
      allFloors.filter((f) => f.ownerUserId === currentUser.id).map((f) => f.id)
    );
    const ownedRoomIds = new Set(
      allRooms
        .filter((r) => r.ownerUserId === currentUser.id || ownedFloorIds.has(r.floorId))
        .map((r) => r.id)
    );
    const ownedDeviceNames = new Set(
      allDevices
        .filter((d) => ownedRoomIds.has(d.roomId))
        .map((d) => d.name)
    );

    return allAuditLogs.filter((log) => {
      if (log.userId === currentUser.id) return true;

      if (log.floorName) {
        const floor = allFloors.find((f) => f.name === log.floorName);
        if (floor?.ownerUserId === currentUser.id) return true;
      }

      if (log.roomName) {
        const room = allRooms.find((r) => r.name === log.roomName);
        if (room && (room.ownerUserId === currentUser.id || ownedFloorIds.has(room.floorId))) return true;
      }

      if (log.deviceName && ownedDeviceNames.has(log.deviceName)) return true;

      return false;
    });
  }, [currentUser, allAuditLogs, allFloors, allRooms, allDevices]);

  const devices = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allDevices;
    return allDevices.filter((d) => canAccessRoom(d.roomId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, allDevices]);

  const toggleDevice = async (deviceId: string) => {
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

  const updateDeviceThreshold = (deviceId: string, min?: number, max?: number) => {
    const device = allDevices.find((d) => d.id === deviceId);
    const threshold = device?.threshold;
    const payload = {
      threshold: {
        threshold_id: threshold?.id ? Number(threshold.id) : undefined,
        min_value: min,
        max_value: max,
        trigger_action: threshold?.action || 'none',
        target_device: threshold?.targetDeviceId ? Number(threshold.targetDeviceId) : null,
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
              },
              lastUpdated: new Date(),
            }
          : d
      )
    );
  };

  const clearAlert = async (alertId: string) => {
    try {
      await alertsApi.markRead(Number(alertId));
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, cleared: true, clearedAt: new Date() } : a));
    } catch (e) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, cleared: true, clearedAt: new Date() } : a));
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await alertsApi.delete(Number(alertId));
    } catch {}
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const addSchedule = async (schedule: Omit<Schedule, 'id' | 'createdAt'>) => {
    try {
      const data = {
        name: schedule.name,
        scope_type: schedule.scope.type,
        device: schedule.scope.type === 'device' ? Number(schedule.scope.id) : null,
        room: schedule.scope.type === 'room' ? Number(schedule.scope.id) : null,
        action: schedule.action,
        schedule_time: schedule.time,
        days_of_week: schedule.daysOfWeek,
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
      if (updates.name) data.name = updates.name;
      if (updates.enabled !== undefined) data.status = updates.enabled;
      if (updates.action) data.action = updates.action;
      if (updates.time) data.schedule_time = updates.time;
      if (updates.daysOfWeek) {
        data.days_of_week = updates.daysOfWeek;
        data.repeat_type = updates.daysOfWeek.length === 0 ? 'once'
          : updates.daysOfWeek.length === 2 ? 'weekend'
          : updates.daysOfWeek.length === 5 ? 'weekday' : 'daily';
      }
      if (updates.scope) {
        data.scope_type = updates.scope.type;
        data.device = updates.scope.type === 'device' ? Number(updates.scope.id) : null;
        data.room = updates.scope.type === 'room' ? Number(updates.scope.id) : null;
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
      const res: any = await devicesApi.create({
        device_name: device.name,
        device_type: device.type,
        device_subtype: device.subType,
        room: Number(device.roomId),
        status: device.isOn ?? false,
        description: device.description || '',
        unit: device.unit || null,
        threshold: device.threshold
          ? {
              min_value: device.threshold.min,
              max_value: device.threshold.max,
              trigger_action: device.threshold.action || 'none',
              target_device: device.threshold.targetDeviceId ? Number(device.threshold.targetDeviceId) : null,
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
      if (updates.name) data.device_name = updates.name;
      if (updates.type) data.device_type = updates.type;
      if (updates.subType) data.device_subtype = updates.subType;
      if (updates.isOn !== undefined) data.status = updates.isOn;
      if (updates.unit !== undefined) data.unit = updates.unit;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.threshold) {
        data.threshold = {
          threshold_id: updates.threshold.id ? Number(updates.threshold.id) : undefined,
          min_value: updates.threshold.min,
          max_value: updates.threshold.max,
          trigger_action: updates.threshold.action || 'none',
          target_device: updates.threshold.targetDeviceId ? Number(updates.threshold.targetDeviceId) : null,
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