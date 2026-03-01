import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Floor,
  Room,
  Device,
  Alert,
  Schedule,
  HistoryLog,
  User,
  Home,
} from '../types';
import {
  mockFloors,
  mockRooms,
  mockDevices,
  mockAlerts,
  mockSchedules,
  mockHistoryLogs,
  mockUsers,
  mockHomes,
} from '../data/mockData';

interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  
  // Data
  homes: Home[];
  floors: Floor[];
  rooms: Room[];
  devices: Device[];
  alerts: Alert[];
  schedules: Schedule[];
  historyLogs: HistoryLog[];
  users: User[];
  
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [homes, setHomes] = useState<Home[]>(mockHomes);
  const [floors, setFloors] = useState<Floor[]>(mockFloors);
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>(mockHistoryLogs);
  const [users, setUsers] = useState<User[]>(mockUsers);

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

  const toggleDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, isOn: !d.isOn, lastUpdated: new Date() }
          : d
      )
    );
    
    // Add to history
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      const room = rooms.find((r) => r.id === device.roomId);
      const newLog: HistoryLog = {
        id: `h${Date.now()}`,
        timestamp: new Date(),
        deviceId: device.id,
        deviceName: device.name,
        roomName: room?.name || 'Unknown',
        eventType: 'manual_control',
        action: device.isOn ? 'off' : 'on',
        details: `Device turned ${device.isOn ? 'off' : 'on'} manually`,
        userId: currentUser?.id,
        userName: currentUser?.name,
        homeId: currentUser?.homeId || 'home1',
      };
      setHistoryLogs((prev) => [newLog, ...prev]);
    }
  };

  const toggleDevices = (deviceIds: string[]) => {
    const allOn = deviceIds.every((id) => devices.find((d) => d.id === id)?.isOn);
    const newState = !allOn;

    setDevices((prev) =>
      prev.map((d) =>
        deviceIds.includes(d.id)
          ? { ...d, isOn: newState, lastUpdated: new Date() }
          : d
      )
    );

    // Add to history
    deviceIds.forEach((deviceId) => {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        const room = rooms.find((r) => r.id === device.roomId);
        const newLog: HistoryLog = {
          id: `h${Date.now()}-${deviceId}`,
          timestamp: new Date(),
          deviceId: device.id,
          deviceName: device.name,
          roomName: room?.name || 'Unknown',
          eventType: 'manual_control',
          action: newState ? 'on' : 'off',
          details: `Bulk action: Device turned ${newState ? 'on' : 'off'}`,
          userId: currentUser?.id,
          userName: currentUser?.name,
          homeId: currentUser?.homeId || 'home1',
        };
        setHistoryLogs((prev) => [newLog, ...prev]);
      }
    });
  };

  const updateDeviceThreshold = (deviceId: string, min?: number, max?: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, threshold: { min, max }, lastUpdated: new Date() }
          : d
      )
    );
  };

  const clearAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, cleared: true, clearedAt: new Date() }
          : a
      )
    );
  };

  const deleteAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const addSchedule = (schedule: Omit<Schedule, 'id' | 'createdAt'>) => {
    const newSchedule: Schedule = {
      ...schedule,
      id: `s${Date.now()}`,
      createdAt: new Date(),
    };
    setSchedules((prev) => [newSchedule, ...prev]);
  };

  const updateSchedule = (scheduleId: string, updates: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, ...updates } : s))
    );
  };

  const deleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  const toggleSchedule = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt' | 'lastActive'>) => {
    const newUser: User = {
      ...user,
      id: `u${Date.now()}`,
      createdAt: new Date(),
      lastActive: new Date(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
  };

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const addFloor = (floor: Omit<Floor, 'id' | 'roomCount'>) => {
    const newFloor: Floor = {
      ...floor,
      id: `f${Date.now()}`,
      roomCount: 0,
    };
    setFloors((prev) => [...prev, newFloor]);
  };

  const updateFloor = (floorId: string, updates: Partial<Floor>) => {
    setFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, ...updates } : f))
    );
  };

  const deleteFloor = (floorId: string) => {
    setFloors((prev) => prev.filter((f) => f.id !== floorId));
    // Also delete associated rooms and devices
    const roomsToDelete = rooms.filter((r) => r.floorId === floorId);
    roomsToDelete.forEach((room) => deleteRoom(room.id));
  };

  const addRoom = (room: Omit<Room, 'id' | 'deviceCount'>) => {
    const newRoom: Room = {
      ...room,
      id: `r${Date.now()}`,
      deviceCount: 0,
    };
    setRooms((prev) => [...prev, newRoom]);
    
    // Update floor room count
    setFloors((prev) =>
      prev.map((f) =>
        f.id === room.floorId
          ? { ...f, roomCount: f.roomCount + 1 }
          : f
      )
    );
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
    );
  };

  const deleteRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    
    // Delete associated devices
    setDevices((prev) => prev.filter((d) => d.roomId !== roomId));
    
    // Update floor room count
    if (room) {
      setFloors((prev) =>
        prev.map((f) =>
          f.id === room.floorId
            ? { ...f, roomCount: Math.max(0, f.roomCount - 1) }
            : f
        )
      );
    }
  };

  const addDevice = (device: Omit<Device, 'id' | 'lastUpdated'>) => {
    const newDevice: Device = {
      ...device,
      id: `d${Date.now()}`,
      lastUpdated: new Date(),
    };
    setDevices((prev) => [...prev, newDevice]);
    
    // Update room device count
    setRooms((prev) =>
      prev.map((r) =>
        r.id === device.roomId
          ? { ...r, deviceCount: r.deviceCount + 1 }
          : r
      )
    );
  };

  const updateDevice = (deviceId: string, updates: Partial<Device>) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, ...updates, lastUpdated: new Date() }
          : d
      )
    );
  };

  const deleteDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    
    // Update room device count
    if (device) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === device.roomId
            ? { ...r, deviceCount: Math.max(0, r.deviceCount - 1) }
            : r
        )
      );
    }
  };

  const addHome = (home: Omit<Home, 'id' | 'createdAt'>) => {
    const newHome: Home = {
      ...home,
      id: `h${Date.now()}`,
      createdAt: new Date(),
    };
    setHomes((prev) => [...prev, newHome]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        homes,
        floors,
        rooms,
        devices,
        alerts,
        schedules,
        historyLogs,
        users,
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
      }}
    >
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