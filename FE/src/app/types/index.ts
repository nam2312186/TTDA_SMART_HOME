// Core data types for the Smart Home app

export interface Home {
  id: string;
  name: string;
  ownerId: string; // User who owns this home
  createdAt: Date;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Admin or User
  homeId: string; // Link to their home
  roomPermissions?: string[]; // Array of room IDs user has access to (only for role: 'user')
  createdAt: Date;
  lastActive: Date;
}

export type DeviceType = 'sensor' | 'actuator';
export type SensorType = 'temperature' | 'humidity' | 'light' | 'motion';
export type ActuatorType = 'light' | 'fan' | 'door';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  subType: SensorType | ActuatorType;
  roomId: string;
  isOn: boolean;
  brightness?: number; // For light actuators: 0-255
  lastUpdated: Date;
  description?: string;
  // Sensor specific
  currentValue?: number;
  unit?: string;
  threshold?: {
    id?: string;
    min?: number;
    max?: number;
    requireMotion?: boolean;
    action?: 'none' | 'turn_on' | 'turn_off' | 'toggle';
    targetDeviceId?: string;
    targetDeviceName?: string;
  };
  // Historical data
  history?: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export interface Room {
  id: string;
  name: string;
  floorId: string;
  ownerUserId?: string;
  icon?: string;
  deviceCount: number;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  roomCount: number;
  ownerUserId?: string;
  homeId: string; // Link to home
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  roomName: string;
  floorName?: string;
  type: 'threshold_exceeded' | 'device_offline' | 'motion_detected' | 'system';
  severity: 'low' | 'medium' | 'high';
  message: string;
  metric?: string;
  thresholdDirection?: 'low' | 'high';
  thresholdValue?: number;
  actualValue?: number;
  unit?: string;
  triggeredAction?: 'none' | 'turn_on' | 'turn_off' | 'toggle';
  targetDeviceId?: string;
  targetDeviceName?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  cleared: boolean;
  clearedAt?: Date;
  homeId: string; // Link to home
}

export interface Schedule {
  id: string;
  name: string;
  enabled: boolean;
  scope: {
    type: 'device' | 'room';
    id: string;
    name: string;
  };
  action: 'on' | 'off' | 'toggle';
  time: string; // HH:mm format
  daysOfWeek: number[]; // 0-6, Sunday is 0
  createdAt: Date;
  lastExecuted?: Date;
  homeId: string; // Link to home
}

export interface HistoryLog {
  id: string;
  timestamp: Date;
  deviceId: string;
  deviceName: string;
  roomName: string;
  eventType: 'manual_control' | 'scheduled_action' | 'threshold_alert' | 'system';
  action?: 'on' | 'off';
  details: string;
  userId?: string;
  userName?: string;
  homeId: string; // Link to home
}

export interface DashboardStats {
  totalDevices: number;
  devicesOn: number;
  alertsToday: number;
  schedulesActive: number;
  energyStatus: 'low' | 'normal' | 'high';
}

export interface DashboardAnalyticsPoint {
  bucket: string | Date;
  value: number;
  unit?: string | null;
}

export interface DashboardAnalyticsSeries {
  scopeId: string;
  scopeName: string;
  points: DashboardAnalyticsPoint[];
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userName: string;
  source: 'user' | 'device' | 'system';
  action: string;
  category: 'device' | 'room' | 'floor' | 'user' | 'schedule' | 'alert' | 'automation' | 'system';
  entityType?: 'user' | 'device' | 'room' | 'floor' | 'permissions';
  entityId?: string;
  entityName?: string;
  deviceName?: string;
  roomName?: string;
  floorName?: string;
  details: string;
  homeId: string;
  homeName?: string;
}