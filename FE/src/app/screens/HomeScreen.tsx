import React from 'react';
import {
  Thermometer,
  Droplets,
  Lightbulb,
  Fan,
  AlertTriangle,
  TrendingUp,
  Power,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

interface HomeScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { devices, alerts, schedules, currentUser } = useApp();
  const displayName = currentUser?.name || localStorage.getItem('username') || 'User';

  const devicesOn = devices.filter((d) => d.isOn).length;
  const alertsToday = alerts.filter((a) => !a.cleared).length;
  const schedulesActive = schedules.filter((s) => s.enabled).length;

  // Get key sensor values
  const temperatureSensors = devices.filter(
    (d) => d.type === 'sensor' && d.subType === 'temperature'
  );
  const avgTemp =
    temperatureSensors.reduce((sum, d) => sum + (d.currentValue || 0), 0) /
    temperatureSensors.length;

  const humiditySensors = devices.filter(
    (d) => d.type === 'sensor' && d.subType === 'humidity'
  );
  const avgHumidity =
    humiditySensors.reduce((sum, d) => sum + (d.currentValue || 0), 0) /
    humiditySensors.length;

  // Recent alerts
  const recentAlerts = alerts.filter((a) => !a.cleared).slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome back,</h1>
            <p className="text-blue-100 text-sm">{displayName} 👋</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{devices.length}</div>
            <div className="text-xs text-blue-100 mt-1">Devices</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{devicesOn}</div>
            <div className="text-xs text-blue-100 mt-1">Active</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{alertsToday}</div>
            <div className="text-xs text-blue-100 mt-1">Alerts</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Key Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {avgTemp.toFixed(1)}°C
                </div>
                <div className="text-xs text-gray-500">Avg Temperature</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {avgHumidity.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Avg Humidity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => onNavigate('control')}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm">All Lights</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => onNavigate('control')}
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Fan className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm">All Fans</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => onNavigate('schedule')}
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm">Schedules</span>
              <Badge variant="secondary" className="text-xs">
                {schedulesActive} active
              </Badge>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => onNavigate('reports')}
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm">Reports</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Alerts</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('alerts')}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => onNavigate('alertDetail', alert)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'high'
                        ? 'bg-red-100'
                        : alert.severity === 'medium'
                        ? 'bg-orange-100'
                        : 'bg-yellow-100'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        alert.severity === 'high'
                          ? 'text-red-600'
                          : alert.severity === 'medium'
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {alert.deviceName}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {alert.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Power Usage</span>
              </div>
              <Badge variant="secondary">Normal</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Active Schedules</span>
              </div>
              <span className="text-sm font-medium">{schedulesActive}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Pending Alerts</span>
              </div>
              <span className="text-sm font-medium">{alertsToday}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
