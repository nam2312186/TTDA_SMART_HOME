import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
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
import {
  mockFloors,
  mockRooms,
  mockDevices,
  mockAlerts,
  mockSchedules,
  mockHistoryLogs,
  mockUsers,
  mockHomes,
  mockAuditLogs,
} from '../data/mockData';

interface AppContextType {
  // Auth
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => boolean;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [homes, setHomes] = useState<Home[]>(mockHomes);
  const [allFloors, setAllFloors] = useState<Floor[]>(mockFloors);
  const [allRooms, setAllRooms] = useState<Room[]>(mockRooms);
  const [allDevices, setAllDevices] = useState<Device[]>(mockDevices);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>(mockHistoryLogs);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);

  const isAdmin = currentUser?.role === 'admin' || false;

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
    if (!currentUser) return allFloors;
    if (currentUser.role === 'admin') return allFloors;
    // Show floors that have at least one accessible room
    return allFloors.filter((f) =>
      allRooms.some((r) => r.floorId === f.id && canAccessRoom(r.id))
    );
  }, [currentUser, allFloors, allRooms]);

  const rooms = useMemo(() => {
    if (!currentUser) return allRooms;
    if (currentUser.role === 'admin') return allRooms;
    return allRooms.filter((r) => canAccessRoom(r.id));
  }, [currentUser, allRooms]);

  const devices = useMemo(() => {
    if (!currentUser) return allDevices;
    if (currentUser.role === 'admin') return allDevices;
    return allDevices.filter((d) => canAccessRoom(d.roomId));
  }, [currentUser, allDevices]);

  const toggleDevice = (deviceId: string) => {
    setAllDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, isOn: !d.isOn, lastUpdated: new Date() }
          : d
      )
    );
    
    // Add to history
    const device = allDevices.find((d) => d.id === deviceId);
    if (device) {
      const room = allRooms.find((r) => r.id === device.roomId);
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
    const allOn = deviceIds.every((id) => allDevices.find((d) => d.id === id)?.isOn);
    const newState = !allOn;

    setAllDevices((prev) =>
      prev.map((d) =>
        deviceIds.includes(d.id)
          ? { ...d, isOn: newState, lastUpdated: new Date() }
          : d
      )
    );

    // Add to history
    deviceIds.forEach((deviceId) => {
      const device = allDevices.find((d) => d.id === deviceId);
      if (device) {
        const room = allRooms.find((r) => r.id === device.roomId);
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
    setAllDevices((prev) =>
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
    
    // Add audit log
    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'user_created',
        entityType: 'user',
        entityId: newUser.id,
        entityName: newUser.name,
        details: `Created new user: ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
        homeId: currentUser.homeId,
      });
    }
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    
    // Add audit log
    if (currentUser) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'user_updated',
          entityType: 'user',
          entityId: userId,
          entityName: user.name,
          details: `Updated user: ${user.name}`,
          homeId: currentUser.homeId,
        });
      }
    }
  };

  const deleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    
    // Add audit log
    if (currentUser && user) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'user_deleted',
        entityType: 'user',
        entityId: userId,
        entityName: user.name,
        details: `Deleted user: ${user.name} (${user.email})`,
        homeId: currentUser.homeId,
      });
    }
  };

  const updateUserRoomPermissions = (userId: string, roomIds: string[]) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, roomPermissions: roomIds }
          : u
      )
    );
    
    // Add audit log
    if (currentUser) {
      const user = users.find((u) => u.id === userId);
      const roomNames = roomIds.map((id) => allRooms.find((r) => r.id === id)?.name || id).join(', ');
      if (user) {
        addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'permissions_updated',
          entityType: 'permissions',
          entityId: userId,
          entityName: user.name,
          details: `Updated room permissions for ${user.name}: ${roomNames}`,
          homeId: currentUser.homeId,
        });
      }
    }
  };

  const addFloor = (floor: Omit<Floor, 'id' | 'roomCount'>) => {
    const newFloor: Floor = {
      ...floor,
      id: `f${Date.now()}`,
      roomCount: 0,
    };
    setAllFloors((prev) => [...prev, newFloor]);
  };

  const updateFloor = (floorId: string, updates: Partial<Floor>) => {
    setAllFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, ...updates } : f))
    );
  };

  const deleteFloor = (floorId: string) => {
    setAllFloors((prev) => prev.filter((f) => f.id !== floorId));
    // Also delete associated rooms and devices
    const roomsToDelete = allRooms.filter((r) => r.floorId === floorId);
    roomsToDelete.forEach((room) => deleteRoom(room.id));
  };

  const addRoom = (room: Omit<Room, 'id' | 'deviceCount'>) => {
    const newRoom: Room = {
      ...room,
      id: `r${Date.now()}`,
      deviceCount: 0,
    };
    setAllRooms((prev) => [...prev, newRoom]);
    
    // Update floor room count
    setAllFloors((prev) =>
      prev.map((f) =>
        f.id === room.floorId
          ? { ...f, roomCount: f.roomCount + 1 }
          : f
      )
    );
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setAllRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
    );
  };

  const deleteRoom = (roomId: string) => {
    const room = allRooms.find((r) => r.id === roomId);
    setAllRooms((prev) => prev.filter((r) => r.id !== roomId));
    
    // Delete associated devices
    setAllDevices((prev) => prev.filter((d) => d.roomId !== roomId));
    
    // Update floor room count
    if (room) {
      setAllFloors((prev) =>
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
    setAllDevices((prev) => [...prev, newDevice]);
    
    // Update room device count
    setAllRooms((prev) =>
      prev.map((r) =>
        r.id === device.roomId
          ? { ...r, deviceCount: r.deviceCount + 1 }
          : r
      )
    );
    
    // Add audit log
    if (currentUser) {
      const room = allRooms.find((r) => r.id === device.roomId);
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'device_created',
        entityType: 'device',
        entityId: newDevice.id,
        entityName: newDevice.name,
        details: `Created device: ${newDevice.name} (${newDevice.type}/${newDevice.subType}) in ${room?.name || 'Unknown'}`,
        homeId: currentUser.homeId,
      });
    }
  };

  const updateDevice = (deviceId: string, updates: Partial<Device>) => {
    setAllDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, ...updates, lastUpdated: new Date() }
          : d
      )
    );
    
    // Add audit log
    if (currentUser) {
      const device = allDevices.find((d) => d.id === deviceId);
      if (device) {
        addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'device_updated',
          entityType: 'device',
          entityId: deviceId,
          entityName: device.name,
          details: `Updated device: ${device.name}`,
          homeId: currentUser.homeId,
        });
      }
    }
  };

  const deleteDevice = (deviceId: string) => {
    const device = allDevices.find((d) => d.id === deviceId);
    setAllDevices((prev) => prev.filter((d) => d.id !== deviceId));
    
    // Update room device count
    if (device) {
      setAllRooms((prev) =>
        prev.map((r) =>
          r.id === device.roomId
            ? { ...r, deviceCount: Math.max(0, r.deviceCount - 1) }
            : r
        )
      );
      
      // Add audit log
      if (currentUser) {
        addAuditLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: 'device_deleted',
          entityType: 'device',
          entityId: deviceId,
          entityName: device.name,
          details: `Deleted device: ${device.name}`,
          homeId: currentUser.homeId,
        });
      }
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

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `al${Date.now()}`,
      timestamp: new Date(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const contextValue = useMemo(
    () => ({
      currentUser,
      isAdmin,
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
    [
      currentUser,
      isAdmin,
      homes,
      floors,
      rooms,
      devices,
      alerts,
      schedules,
      historyLogs,
      users,
      auditLogs,
    ]
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