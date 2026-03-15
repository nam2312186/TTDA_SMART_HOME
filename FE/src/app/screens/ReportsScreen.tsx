import React from 'react';
import {
  TrendingUp,
  Download,
  Lightbulb,
  Fan,
  Thermometer,
  AlertTriangle,
  Activity,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';

interface ReportsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ onNavigate }) => {
  const { devices, alerts, historyLogs, schedules, floors, rooms } = useApp();

  // Device usage data
  const devicesByType = {
    light: devices.filter((d) => d.subType === 'light'),
    fan: devices.filter((d) => d.subType === 'fan'),
    sensor: devices.filter((d) => d.type === 'sensor'),
  };

  const deviceUsageData = [
    {
      name: 'Lights',
      total: devicesByType.light.length,
      on: devicesByType.light.filter((d) => d.isOn).length,
    },
    {
      name: 'Fans',
      total: devicesByType.fan.length,
      on: devicesByType.fan.filter((d) => d.isOn).length,
    },
    {
      name: 'Sensors',
      total: devicesByType.sensor.length,
      on: devicesByType.sensor.filter((d) => d.isOn).length,
    },
  ];

  // Activity over time (last 7 days)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const activityData = getLast7Days().map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayLogs = historyLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= date && logDate < nextDay;
    });

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      events: dayLogs.length,
      manual: dayLogs.filter((l) => l.eventType === 'manual_control').length,
      scheduled: dayLogs.filter((l) => l.eventType === 'scheduled_action').length,
    };
  });

  // Floor statistics
  const floorStats = floors.map((floor) => {
    const floorRooms = rooms.filter((r) => r.floorId === floor.id);
    const floorDevices = devices.filter((d) => floorRooms.some((r) => r.id === d.roomId));
    return {
      name: floor.name,
      'Devices': floorDevices.length,
      'Active': floorDevices.filter((d) => d.isOn).length,
      'Sensors': floorDevices.filter((d) => d.type === 'sensor').length,
    };
  });

  // Room statistics (top 6 by device count)
  const roomStats = rooms
    .map((room) => {
      const roomDevices = devices.filter((d) => d.roomId === room.id);
      return {
        name: room.name.length > 10 ? room.name.slice(0, 10) + '…' : room.name,
        fullName: room.name,
        'Devices': roomDevices.length,
        'Active': roomDevices.filter((d) => d.isOn).length,
      };
    })
    .sort((a, b) => b['Devices'] - a['Devices'])
    .slice(0, 6);

  // Alerts by severity
  const alertsBySeverity = [
    {
      name: 'High',
      value: alerts.filter((a) => a.severity === 'high').length,
      color: '#ef4444',
    },
    {
      name: 'Medium',
      value: alerts.filter((a) => a.severity === 'medium').length,
      color: '#f97316',
    },
    {
      name: 'Low',
      value: alerts.filter((a) => a.severity === 'low').length,
      color: '#eab308',
    },
  ];

  // Temperature trend
  const temperatureSensors = devices.filter(
    (d) => d.type === 'sensor' && d.subType === 'temperature'
  );
  const avgTempHistory =
    temperatureSensors[0]?.history?.slice(-12).map((h, i) => ({
      time: new Date(h.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
      }),
      temp: h.value,
    })) || [];

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDevices: devices.length,
        devicesOn: devices.filter((d) => d.isOn).length,
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter((a) => !a.cleared).length,
        activeSchedules: schedules.filter((s) => s.enabled).length,
      },
      deviceUsage: deviceUsageData,
      activity: activityData,
      alerts: alertsBySeverity,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-home-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <Button size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
        <div className="mt-3">
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">System-wide insights</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {devices.filter((d) => d.isOn).length}
              </div>
              <div className="text-xs text-gray-500">Devices Active</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {alerts.filter((a) => !a.cleared).length}
              </div>
              <div className="text-xs text-gray-500">Active Alerts</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {schedules.filter((s) => s.enabled).length}
              </div>
              <div className="text-xs text-gray-500">Active Schedules</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {historyLogs.length}
              </div>
              <div className="text-xs text-gray-500">Total Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Device Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deviceUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="total" fill="#94a3b8" name="Total" />
                <Bar dataKey="on" fill="#3b82f6" name="Active" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="manual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Manual"
                />
                <Line
                  type="monotone"
                  dataKey="scheduled"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Scheduled"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Temperature Trend */}
        {avgTempHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temperature Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={avgTempHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Temp (°C)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Alerts by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={alertsBySeverity} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                <Tooltip />
                <Bar dataKey="value" name="Alerts" radius={[0, 4, 4, 0]}>
                  {alertsBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Floor Statistics */}
        {floorStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Floor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(180, floorStats.length * 50)}>
                <BarChart data={floorStats} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Devices" fill="#94a3b8" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Active" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Sensors" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Room Statistics */}
        {roomStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Room</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(200, roomStats.length * 44)}>
                <BarChart data={roomStats} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(val, name, props) => [val, props.payload.fullName || name]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Devices" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Active" fill="#f97316" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Devices</span>
              <span className="font-medium">{devices.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Devices Online</span>
              <span className="font-medium">
                {devices.filter((d) => d.isOn).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Alerts</span>
              <span className="font-medium">{alerts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Schedules</span>
              <span className="font-medium">
                {schedules.filter((s) => s.enabled).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Events</span>
              <span className="font-medium">{historyLogs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};