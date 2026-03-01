// Core data types for the Smart Home app

export interface Home {
  id: string;
  name: string;
  ownerId: string; // User who owns this home
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  homeId: string; // Link to their home
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
  lastUpdated: Date;
  description?: string;
  // Sensor specific
  currentValue?: number;
  unit?: string;
  threshold?: {
    min?: number;
    max?: number;
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
  icon?: string;
  deviceCount: number;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  roomCount: number;
  homeId: string; // Link to home
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  roomName: string;
  type: 'threshold_exceeded' | 'device_offline' | 'motion_detected' | 'system';
  severity: 'low' | 'medium' | 'high';
  message: string;
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
    type: 'device' | 'room' | 'floor';
    id: string;
    name: string;
  };
  action: 'on' | 'off';
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