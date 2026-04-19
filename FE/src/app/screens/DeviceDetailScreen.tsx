import React, { useState } from 'react';
import {
  ChevronLeft,
  Thermometer,
  Droplets,
  Sun,
  Eye,
  Lightbulb,
  Fan,
  DoorOpen,
  Calendar,
  History,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';
import { Device } from '../types';

interface DeviceDetailScreenProps {
  device: Device;
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

const sensorIconMap: Record<string, React.FC<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  light: Sun,
  motion: Eye,
};

const actuatorIconMap: Record<string, React.FC<{ className?: string }>> = {
  light: Lightbulb,
  fan: Fan,
  door: DoorOpen,
};

export const DeviceDetailScreen: React.FC<DeviceDetailScreenProps> = ({
  device: initialDevice,
  onBack,
  onNavigate,
}) => {
  const { devices, rooms, toggleDevice, updateDevice, historyLogs } = useApp();
  const device = devices.find((d) => d.id === initialDevice.id) || initialDevice;
  const room = rooms.find((r) => r.id === device.roomId);
  const [minThreshold, setMinThreshold] = useState(device.threshold?.min?.toString() || '');
  const [maxThreshold, setMaxThreshold] = useState(device.threshold?.max?.toString() || '');


  const Icon = device.type === 'sensor'
    ? sensorIconMap[device.subType] || Thermometer
    : actuatorIconMap[device.subType] || Lightbulb;

  const deviceLogs = historyLogs
    .filter((log) => log.deviceId === device.id)
    .slice(0, 5);

  const actuatorTargets = devices.filter((d) => d.type === 'actuator' && d.roomId === device.roomId);

  const handleSaveThreshold = () => {
    const min = minThreshold ? parseFloat(minThreshold) : undefined;
    const max = maxThreshold ? parseFloat(maxThreshold) : undefined;
    updateDevice(device.id, {
      threshold: {
        id: device.threshold?.id,
        min,
        max,
      },
    });
  };

  // Sensor view
  if (device.type === 'sensor') {
    const chartData = device.history?.map((h) => ({
      time: new Date(h.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: h.value,
    })) || [];

    return (
      <div className="h-full overflow-y-auto pb-20">
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{device.name}</h1>
              <p className="text-sm text-blue-100">{room?.name}</p>
            </div>
            <Badge
              variant={device.isOn ? 'default' : 'secondary'}
              className="bg-white/20"
            >
              {device.isOn ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Current Value - Big Display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <Icon className="w-12 h-12 mx-auto mb-3 text-white" />
            <div className="text-5xl font-bold mb-2">
              {device.currentValue?.toFixed(1)}
              <span className="text-2xl ml-1">{device.unit}</span>
            </div>
            <div className="text-sm text-blue-100">Current Reading</div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">24-Hour Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Threshold Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alert Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum {device.unit}</Label>
                  <Input
                    id="min"
                    type="number"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    placeholder="Min"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Maximum {device.unit}</Label>
                  <Input
                    id="max"
                    type="number"
                    value={maxThreshold}
                    onChange={(e) => setMaxThreshold(e.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>

              <Button onClick={handleSaveThreshold} className="w-full">
                Save Thresholds
              </Button>
            </CardContent>
          </Card>

          {/* Recent Logs */}
          {deviceLogs.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('history', { deviceId: device.id })}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {deviceLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0"
                  >
                    <History className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">{log.details}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{device.subType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">
                  {device.isOn ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">
                  {new Date(device.lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Actuator view
  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div
        className={`p-4 ${
          device.isOn
            ? 'bg-gradient-to-b from-green-600 to-green-700'
            : 'bg-gradient-to-b from-gray-600 to-gray-700'
        } text-white`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{device.name}</h1>
            <p className="text-sm opacity-90">{room?.name}</p>
          </div>
          <Badge variant={device.isOn ? 'default' : 'secondary'} className="bg-white/20">
            {device.isOn ? 'On' : 'Off'}
          </Badge>
        </div>

        {/* Big Toggle */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
          <Icon className="w-16 h-16 mx-auto mb-4 text-white" />
          <div className="text-3xl font-bold mb-4">
            {device.isOn ? 'Device is On' : 'Device is Off'}
          </div>
          <Button
            size="lg"
            onClick={() => toggleDevice(device.id)}
            className={`w-full ${
              device.isOn
                ? 'bg-white text-green-600 hover:bg-gray-100'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Turn {device.isOn ? 'Off' : 'On'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onNavigate('scheduleCreate', { deviceId: device.id })}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to Schedule
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onNavigate('history', { deviceId: device.id })}
            >
              <History className="w-4 h-4 mr-2" />
              View Activity Log
            </Button>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        {deviceLogs.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('history', { deviceId: device.id })}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {deviceLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 ${
                      log.action === 'on' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900">{log.details}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                      {log.userName && ` • ${log.userName}`}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Device Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium capitalize">{device.subType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium">{device.isOn ? 'On' : 'Off'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="font-medium">
                {new Date(device.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
