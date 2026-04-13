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
  Zap,
  Shield,
  Activity,
  Eye,
  EyeOff,
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
    temperatureSensors.length > 0
      ? temperatureSensors.reduce((sum, d) => sum + (d.currentValue || 0), 0) /
        temperatureSensors.length
      : 0;

  const humiditySensors = devices.filter(
    (d) => d.type === 'sensor' && d.subType === 'humidity'
  );
  const avgHumidity =
    humiditySensors.length > 0
      ? humiditySensors.reduce((sum, d) => sum + (d.currentValue || 0), 0) /
        humiditySensors.length
      : 0;

  // Motion sensor
  const motionSensor = devices.find((d) => d.type === 'sensor' && d.subType === 'motion');
  const hasMotion = typeof motionSensor?.currentValue === 'number' && motionSensor.currentValue > 0;
  const motionAvailable = motionSensor !== undefined;

  // Recent alerts
  const recentAlerts = alerts.filter((a) => !a.cleared).slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pb-20" style={{ background: 'var(--background)' }}>
      {/* Header – Premium gradient */}
      <div
        className="text-white p-6 pb-10 relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-15"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Welcome back 👋</p>
              <h1 className="text-2xl font-bold tracking-tight mt-0.5">{displayName}</h1>
            </div>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg"
              style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: devices.length, icon: Zap },
              { label: 'Active', value: devicesOn, icon: Power },
              { label: 'Alerts', value: alertsToday, icon: Shield },
            ].map(({ label, value, icon: Icon }, i) => (
              <div
                key={label}
                className={`rounded-2xl p-3 text-center animate-float-up stagger-${i + 1}`}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                <Icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-indigo-200 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Environment Sensors */}
        <Card
          className="shadow-brand animate-float-up"
          style={{ border: '1px solid var(--border)', animationDelay: '0.1s' }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Thermometer className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              </span>
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}
            >
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shadow-sm">
                <Thermometer className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 animate-count">
                  {avgTemp.toFixed(1)}°C
                </div>
                <div className="text-xs text-orange-500 font-medium">Temperature</div>
              </div>
            </div>

            <div
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)', border: '1px solid #bfdbfe' }}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 animate-count">
                  {avgHumidity.toFixed(0)}%
                </div>
                <div className="text-xs text-blue-500 font-medium">Humidity</div>
              </div>
            </div>

            {/* Motion Indicator — spans full width */}
            {motionAvailable && (
              <div
                className="col-span-2 flex items-center gap-3 p-3 rounded-xl transition-all"
                style={hasMotion
                  ? { background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #86efac' }
                  : { background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0' }
                }
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 relative"
                  style={{ background: hasMotion ? '#dcfce7' : '#f1f5f9' }}
                >
                  {hasMotion ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                  {/* Pulse animation khi có người */}
                  {hasMotion && (
                    <span
                      className="absolute inset-0 rounded-xl animate-ping opacity-30"
                      style={{ background: '#4ade80' }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm"
                      style={{ color: hasMotion ? '#16a34a' : '#64748b' }}
                    >
                      {hasMotion ? 'Person Detected' : 'No Motion'}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: hasMotion ? '#22c55e' : '#94a3b8' }}
                    />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
                    {hasMotion
                      ? 'Automation will activate with threshold rules'
                      : 'Automation requires motion (if enabled)'}
                  </p>
                </div>
                <Activity
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: hasMotion ? '#4ade80' : '#cbd5e1' }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card
          className="shadow-brand animate-float-up"
          style={{ border: '1px solid var(--border)', animationDelay: '0.15s' }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              </span>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: 'All Lights', icon: Lightbulb, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', screen: 'control' },
              { label: 'All Fans', icon: Fan, color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', screen: 'control' },
              { label: 'Schedules', icon: Calendar, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', screen: 'schedule', badge: schedulesActive },
              { label: 'Reports', icon: TrendingUp, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', screen: 'reports' },
            ].map(({ label, icon: Icon, color, bg, border, screen, badge }, i) => (
              <button
                key={label}
                onClick={() => onNavigate(screen)}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] animate-float-up stagger-${i + 1}`}
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>{label}</span>
                {badge !== undefined && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}
                  >
                    {badge} active
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <Card
            className="shadow-brand animate-float-up"
            style={{ border: '1px solid var(--border)', animationDelay: '0.2s' }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                </span>
                Recent Alerts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('alerts')}
                className="text-xs"
                style={{ color: 'var(--primary)' }}
              >
                View All →
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAlerts.map((alert, i) => {
                const severityMap: Record<string, { bg: string; text: string; dot: string }> = {
                  high: { bg: '#fef2f2', text: '#ef4444', dot: '#ef4444' },
                  medium: { bg: '#fff7ed', text: '#f97316', dot: '#f97316' },
                  low: { bg: '#fefce8', text: '#eab308', dot: '#eab308' },
                };
                const s = severityMap[alert.severity] || severityMap.low;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] animate-slide-in stagger-${i + 1}`}
                    style={{ background: s.bg, border: `1px solid ${s.text}26` }}
                    onClick={() => onNavigate('alertDetail', alert)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 pulse-danger"
                      style={{ background: s.dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {alert.deviceName}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {alert.message}
                      </div>
                    </div>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: s.text }}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card
          className="shadow-brand animate-float-up"
          style={{ border: '1px solid var(--border)', animationDelay: '0.25s' }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              </span>
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Power, label: 'Power Usage', value: 'Normal', color: '#10b981', valueBg: '#ecfdf5' },
              { icon: Calendar, label: 'Active Schedules', value: schedulesActive, color: '#6366f1', valueBg: '#eef2ff' },
              { icon: AlertTriangle, label: 'Pending Alerts', value: alertsToday, color: alertsToday > 0 ? '#ef4444' : '#10b981', valueBg: alertsToday > 0 ? '#fef2f2' : '#ecfdf5' },
            ].map(({ icon: Icon, label, value, color, valueBg }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color, background: valueBg }}
                >
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
