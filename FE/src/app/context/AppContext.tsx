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
import { buildingApi, devicesApi, alertsApi, schedulesApi, permissionsApi } from '../services/api';

// ─── Mapper helpers ────────────────────────────────────────────────────────────
const SENSOR_KEYWORDS = new Set(['temperature', 'humidity', 'motion', 'smoke', 'co2', 'light_level', 'light_sensor', 'door_sensor']);

function parseDeviceType(dt: string): { type: 'sensor' | 'actuator'; subType: string } {
  const d = (dt || '').toLowerCase().trim();
  const isSensor = SENSOR_KEYWORDS.has(d) || d.includes('sensor') || d.includes('detector');
  let subType = d;
  if (d.includes('temp')) subType = 'temperature';
  else if (d.includes('humid')) subType = 'humidity';
  else if (d.includes('motion')) subType = 'motion';
  else if (isSensor && d.includes('light')) subType = 'light';
  else if (!isSensor && (d === 'light' || d.includes('bulb') || d.includes('lamp') || d.includes('led'))) subType = 'light';
  else if (d.includes('fan') || d.includes('air')) subType = 'fan';
  else if (d.includes('door') || d.includes('lock') || d.includes('gate')) subType = 'door';
  return { type: isSensor ? 'sensor' : 'actuator', subType: subType as any };
}

function mapFloor(f: any): Floor {
  return {
    id: String(f.floor_id),
    name: f.floor_name,
    level: f.level ?? 1,
    roomCount: f.room_count ?? 0,
    homeId: 'home1',
  };
}

function mapRoom(r: any): Room {
  return {
    id: String(r.room_id),
    name: r.room_name,
    floorId: String(r.floor),
    deviceCount: r.device_count ?? 0,
  };
}

function mapDevice(d: any): Device {
  const { type, subType } = parseDeviceType(d.device_type || '');
  return {
    id: String(d.device_id),
    name: d.device_name,
    type,
    subType: subType as any,
    roomId: String(d.room),
    isOn: Boolean(d.status),
    lastUpdated: new Date(d.created_at || Date.now()),
    description: d.description,
  };
}

function mapAlert(a: any): Alert {
  return {
    id: String(a.alert_id),
    deviceId: a.device_id ? String(a.device_id) : '',
    deviceName: a.device_name || 'Unknown Device',
    roomName: a.room_name || 'Unknown Room',
    type: 'threshold_exceeded',
    severity: 'medium',
    message: a.message,
    timestamp: new Date(a.created_at || Date.now()),
    cleared: Boolean(a.is_read),
    homeId: 'home1',
  };
}

function mapSchedule(s: any): Schedule {
  const daysOfWeek = s.repeat_type === 'weekend' ? [0, 6]
    : s.repeat_type === 'weekday' ? [1, 2, 3, 4, 5]
    : s.repeat_type === 'once' ? []
    : [0, 1, 2, 3, 4, 5, 6];
  return {
    id: String(s.schedule_id),
    name: s.device_name ? `${s.device_name} – ${s.action}` : `Schedule ${s.schedule_id}`,
    enabled: Boolean(s.status),
    scope: { type: 'device', id: String(s.device), name: s.device_name || '' },
    action: s.action === 'on' ? 'on' : 'off',
    time: s.schedule_time || '00:00',
    daysOfWeek,
    createdAt: new Date(),
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
  const [historyLogs] = useState<HistoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs] = useState<AuditLog[]>([]);

  // ─── Fetch all data from API ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [floors, rooms, devices, alertsList, schedulesList] = await Promise.all([
        buildingApi.floors().catch(() => []),
        buildingApi.rooms().catch(() => []),
        devicesApi.list().catch(() => []),
        alertsApi.list().catch(() => []),
        schedulesApi.list().catch(() => []),
      ]);
      setAllFloors((floors as any[]).map(mapFloor));
      setAllRooms((rooms as any[]).map(mapRoom));
      setAllDevices((devices as any[]).map(mapDevice));
      setAlerts((alertsList as any[]).map(mapAlert));
      setSchedules((schedulesList as any[]).map(mapSchedule));
    } catch (e) {
      console.error('fetchAll error', e);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    return currentUser.roomPermissions?.includes(roomId) || false;
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
    // Show floors that have at least one accessible room
    return allFloors.filter((f) =>
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
    setAllDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, threshold: { min, max }, lastUpdated: new Date() }
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
        device: Number(schedule.scope.id),
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
    try {
      const res: any = await buildingApi.createFloor({ floor_name: floor.name, level: floor.level });
      setAllFloors(prev => [...prev, mapFloor(res)]);
    } catch (e) { console.error('addFloor error', e); }
  };

  const updateFloor = async (floorId: string, updates: Partial<Floor>) => {
    try {
      const data: any = {};
      if (updates.name) data.floor_name = updates.name;
      if (updates.level !== undefined) data.level = updates.level;
      await buildingApi.updateFloor(Number(floorId), data);
    } catch {}
    setAllFloors(prev => prev.map(f => f.id === floorId ? { ...f, ...updates } : f));
  };

  const deleteFloor = async (floorId: string) => {
    try { await buildingApi.deleteFloor(Number(floorId)); } catch {}
    setAllFloors(prev => prev.filter(f => f.id !== floorId));
    setAllRooms(prev => prev.filter(r => r.floorId !== floorId));
  };

  const addRoom = async (room: Omit<Room, 'id' | 'deviceCount'>) => {
    try {
      const res: any = await buildingApi.createRoom({ room_name: room.name, floor: Number(room.floorId) });
      setAllRooms(prev => [...prev, mapRoom(res)]);
      setAllFloors(prev => prev.map(f => f.id === room.floorId ? { ...f, roomCount: f.roomCount + 1 } : f));
    } catch (e) { console.error('addRoom error', e); }
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    try {
      const data: any = {};
      if (updates.name) data.room_name = updates.name;
      if (updates.floorId) data.floor = Number(updates.floorId);
      await buildingApi.updateRoom(Number(roomId), data);
    } catch {}
    setAllRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
  };

  const deleteRoom = async (roomId: string) => {
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
        device_type: device.subType,
        room: Number(device.roomId),
        status: device.isOn ?? false,
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
      if (updates.subType) data.device_type = updates.subType;
      if (updates.isOn !== undefined) data.status = updates.isOn;
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
  const addAuditLog = (_log: Omit<AuditLog, 'id' | 'timestamp'>) => { /* no-op */ };

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