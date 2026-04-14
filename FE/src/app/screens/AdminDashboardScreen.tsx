import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Building2, FileText, Layers3, Thermometer, Droplets, SunMedium, Wifi, Users, Lightbulb, Fan } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, LabelList, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { connectSensorWebSocket, dashboardApi } from '../services/api';

interface AdminDashboardScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

interface RealtimeCard {
  deviceId: number;
  metric: string;
  value: number;
  unit: string;
  updatedAt: Date;
}

type MetricKey = 'temperature' | 'humidity' | 'light' | 'device_activity';
type ScopeKey = 'floor' | 'room';
type PeriodKey = 'day' | 'month' | 'year';

const METRIC_OPTIONS: Array<{ value: MetricKey; label: string; icon: typeof Thermometer }> = [
  { value: 'temperature', label: 'Temperature', icon: Thermometer },
  { value: 'humidity', label: 'Humidity', icon: Droplets },
  { value: 'light', label: 'Light', icon: SunMedium },
  { value: 'device_activity', label: 'Device Activity', icon: Activity },
];

const normalizeUnit = (rawUnit: string, metric: MetricKey): string => {
  const unit = (rawUnit || '').trim();
  if (metric === 'temperature') {
    if (!unit || unit.toLowerCase() === 'c' || unit.toLowerCase() === 'degc' || unit.toLowerCase() === '°c') {
      return '°C';
    }
    if (unit.toLowerCase() === 'f' || unit.toLowerCase() === 'degf' || unit.toLowerCase() === '°f') {
      return '°F';
    }
  }
  if (metric === 'humidity' && !unit) return '%';
  if (metric === 'light' && !unit) return 'lux';
  return unit;
};

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onNavigate }) => {
  const { devices, rooms, floors, users, alerts, schedules, isAdmin, currentUser } = useApp();
  const [scope, setScope] = useState<ScopeKey>('floor');
  const [metric, setMetric] = useState<MetricKey>('temperature');
  const [period, setPeriod] = useState<PeriodKey>('day');
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [realtime, setRealtime] = useState<Record<string, RealtimeCard>>({});
  const refreshTimerRef = useRef<number | null>(null);

  const loadAnalytics = useCallback(() => {
    dashboardApi.analytics({ scope, metric, period })
      .then((response) => {
        setAnalytics(response.series || []);
      })
      .catch(() => {
        setAnalytics([]);
      });
  }, [scope, metric, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const socket = connectSensorWebSocket((message: any) => {
      const eventType = message?.event;
      if (eventType === 'sensor_data') {
        const key = String(message.device_id || message.sensor_id);
        const value = Number(message.value);
        if (!Number.isFinite(value)) return;
        setRealtime((prev) => ({
          ...prev,
          [key]: {
            deviceId: Number(message.device_id || message.sensor_id),
            metric: message.metric || 'sensor',
            value,
            unit: message.unit || '',
            updatedAt: new Date(),
          },
        }));
      }

      if (eventType === 'sensor_data' || eventType === 'alert' || eventType === 'device_status') {
        if (refreshTimerRef.current) {
          window.clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          loadAnalytics();
        }, 500);
      }
    });

    return () => {
      socket.close();
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadAnalytics]);

  const summaryCards = [
    {
      label: isAdmin ? 'Users' : 'My Rooms',
      value: isAdmin ? users.length : rooms.length,
      action: () => onNavigate(isAdmin ? 'manageUsers' : 'areas'),
    },
    {
      label: 'Floors / Rooms',
      value: `${floors.length} / ${rooms.length}`,
      action: () => onNavigate(isAdmin ? 'manageAreas' : 'areas'),
    },
    {
      label: 'Devices / Schedules',
      value: `${devices.length} / ${schedules.length}`,
      action: () => onNavigate('schedule'),
    },
    {
      label: 'Active Alerts',
      value: alerts.filter((alert) => !alert.cleared).length,
      action: () => onNavigate('alerts'),
    },
  ];

  const chartData = useMemo(() => {
    return analytics.map((series) => {
      const latestPoint = series.points?.[series.points.length - 1];
      const rawValue = Number(latestPoint?.value ?? 0);
      const inferredUnit = metric === 'temperature' ? '°C' : metric === 'humidity' ? '%' : metric === 'light' ? 'lux' : '';
      const pointUnit = normalizeUnit(latestPoint?.unit || inferredUnit, metric);
      const precision = metric === 'device_activity' ? 0 : 2;
      return {
        name: series.scope_name,
        value: rawValue,
        unit: pointUnit,
        displayValue: `${rawValue.toFixed(precision)}${pointUnit}`,
      };
    });
  }, [analytics, metric]);

  const trendData = useMemo(() => {
    const buckets = new Map<string, Record<string, string | number>>();
    analytics.forEach((series) => {
      series.points?.forEach((point: any) => {
        const label = new Date(point.bucket).toLocaleDateString();
        const entry = buckets.get(label) || { bucket: label };
        entry[series.scope_name] = point.value;
        buckets.set(label, entry);
      });
    });
    return Array.from(buckets.values());
  }, [analytics]);

  const realtimeCards = useMemo(() => {
    const liveCards = Object.values(realtime)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 6)
      .map((item) => {
        const device = devices.find((deviceEntry) => Number(deviceEntry.id) === item.deviceId);
        const room = device ? rooms.find((roomEntry) => roomEntry.id === device.roomId) : undefined;
        return {
          ...item,
          deviceName: device?.name || `Device ${item.deviceId}`,
          roomName: room?.name || 'Unknown room',
        };
      });

    if (liveCards.length > 0) {
      return liveCards;
    }

    return devices
      .filter((device) => device.type === 'sensor' && typeof device.currentValue === 'number' && Number.isFinite(device.currentValue))
      .slice(0, 6)
      .map((device) => {
        const room = rooms.find((roomEntry) => roomEntry.id === device.roomId);
        return {
          deviceId: Number(device.id),
          metric: device.subType,
          value: Number(device.currentValue),
          unit: device.unit || '',
          updatedAt: device.lastUpdated || new Date(),
          deviceName: device.name,
          roomName: room?.name || 'Unknown room',
        };
      });
  }, [devices, realtime, rooms]);

  const activeMetric = METRIC_OPTIONS.find((option) => option.value === metric) || METRIC_OPTIONS[0];
  const ActiveMetricIcon = activeMetric.icon;

  const sensorAverages = useMemo(() => {
    const averageByMetric = (metricName: 'temperature' | 'humidity' | 'light') => {
      const values = devices
        .filter((device) => device.type === 'sensor' && device.subType === metricName)
        .map((device) => {
          const realtimePoint = realtime[String(device.id)];
          if (realtimePoint && Number.isFinite(realtimePoint.value)) {
            return realtimePoint.value;
          }
          if (typeof device.currentValue === 'number' && Number.isFinite(device.currentValue)) {
            return device.currentValue;
          }
          return null;
        })
        .filter((value): value is number => value !== null);

      if (values.length === 0) {
        return null;
      }
      const sum = values.reduce((acc, value) => acc + value, 0);
      return Number((sum / values.length).toFixed(1));
    };

    return {
      temperature: averageByMetric('temperature'),
      humidity: averageByMetric('humidity'),
      light: averageByMetric('light'),
    };
  }, [devices, realtime]);



  return (
    <div className="h-full overflow-y-auto pb-20 bg-slate-50">
      {/* ── Premium Hero Header ── */}
      <div
        className="relative text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 80%,#6d28d9 100%)', paddingBottom: 28 }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-20" style={{ background: 'rgba(167,139,250,0.5)' }} />
        <div className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full opacity-15" style={{ background: 'rgba(99,102,241,0.6)' }} />
        <div className="absolute top-16 right-8 w-16 h-16 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.4)' }} />

        <div className="relative z-10 px-5 pt-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-indigo-300 text-xs font-medium tracking-wide uppercase">
                {isAdmin ? '⚡ Admin Dashboard' : '🏠 My Dashboard'}
              </p>
              <h1 className="text-2xl font-bold mt-0.5 tracking-tight">
                Hello, {currentUser?.name || (isAdmin ? 'Admin' : 'User')} 👋
              </h1>
            </div>
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Inline quick-stats row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: 'Devices',
                value: `${devices.filter(d => d.isOn).length}/${devices.length}`,
                sub: 'online',
                color: '#a5f3fc',
              },
              {
                label: 'Alerts',
                value: alerts.filter(a => !a.cleared).length,
                sub: 'open',
                color: alerts.filter(a => !a.cleared).length > 0 ? '#fca5a5' : '#86efac',
              },
              {
                label: 'Schedules',
                value: schedules.filter(s => s.enabled).length,
                sub: 'active',
                color: '#c4b5fd',
              },
            ].map(({ label, value, sub, color }) => (
              <div
                key={label}
                className="rounded-2xl px-3 py-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
              >
                <div className="text-xl font-bold leading-tight" style={{ color }}>{value}</div>
                <div className="text-[10px] text-indigo-200 mt-0.5 font-medium">{label}</div>
                <div className="text-[9px] text-indigo-300 opacity-80">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Home Sensor Averages</h2>
                <p className="text-xs text-slate-500">Live average from currently owned devices.</p>
              </div>
              <Button
                onClick={() => onNavigate('detailedVisualization')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                View Detailed Visualization
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">

              {/* ===== TEMPERATURE ===== */}
              {(() => {
                const val = sensorAverages.temperature;
                const CIRC = 2 * Math.PI * 32; // r=32
                const pct = val !== null ? Math.min(1, Math.max(0, (val - 10) / 40)) : 0;
                const dash = pct * CIRC;
                return (
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
                    style={{ background: 'linear-gradient(160deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa', boxShadow: '0 4px 16px rgba(249,115,22,0.12)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ea580c' }}>Temperature</p>
                    {/* Circular gauge */}
                    <div className="relative" style={{ width: 88, height: 88 }}>
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        {/* Track */}
                        <circle cx="44" cy="44" r="32" fill="none" stroke="#fed7aa" strokeWidth="7" />
                        {/* Progress arc */}
                        <circle
                          cx="44" cy="44" r="32" fill="none"
                          stroke="url(#tempGrad)" strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${CIRC}`}
                          strokeDashoffset={0}
                          transform="rotate(-90 44 44)"
                          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                        />
                        <defs>
                          <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fb923c" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        {/* Center text */}
                        <text x="44" y="40" textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: 18, fontWeight: 700, fill: '#9a3412', fontFamily: 'Inter,sans-serif' }}>
                          {val !== null ? val : '--'}
                        </text>
                        <text x="44" y="57" textAnchor="middle"
                          style={{ fontSize: 11, fontWeight: 600, fill: '#ea580c', fontFamily: 'Inter,sans-serif' }}>
                          °C
                        </text>
                      </svg>
                      {/* Flame icon top center */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#fb923c,#ef4444)', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                        <Thermometer className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-center" style={{ color: '#c2410c' }}>Avg across sensors</p>
                  </div>
                );
              })()}

              {/* ===== HUMIDITY ===== */}
              {(() => {
                const val = sensorAverages.humidity;
                const CIRC = 2 * Math.PI * 32;
                const pct = val !== null ? Math.min(1, Math.max(0, val / 100)) : 0;
                const dash = pct * CIRC;
                return (
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
                    style={{ background: 'linear-gradient(160deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe', boxShadow: '0 4px 16px rgba(59,130,246,0.12)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1d4ed8' }}>Humidity</p>
                    <div className="relative" style={{ width: 88, height: 88 }}>
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="32" fill="none" stroke="#bfdbfe" strokeWidth="7" />
                        <circle
                          cx="44" cy="44" r="32" fill="none"
                          stroke="url(#humGrad)" strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${CIRC}`}
                          strokeDashoffset={0}
                          transform="rotate(-90 44 44)"
                          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                        />
                        <defs>
                          <linearGradient id="humGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <text x="44" y="40" textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: 18, fontWeight: 700, fill: '#1e3a8a', fontFamily: 'Inter,sans-serif' }}>
                          {val !== null ? val : '--'}
                        </text>
                        <text x="44" y="57" textAnchor="middle"
                          style={{ fontSize: 11, fontWeight: 600, fill: '#1d4ed8', fontFamily: 'Inter,sans-serif' }}>
                          %
                        </text>
                      </svg>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}>
                        <Droplets className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-center" style={{ color: '#1d4ed8' }}>Relative humidity</p>
                  </div>
                );
              })()}

              {/* ===== LIGHT ===== */}
              {(() => {
                const val = sensorAverages.light;
                const CIRC = 2 * Math.PI * 32;
                const pct = val !== null ? Math.min(1, Math.max(0, val / 2000)) : 0;
                const dash = pct * CIRC;
                const isOn = val !== null && val > 0;
                return (
                  <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
                    style={{ background: 'linear-gradient(160deg,#fffbeb,#fef3c7)', border: '1px solid #fde68a', boxShadow: `0 4px 16px rgba(245,158,11,${isOn ? '0.25' : '0.08'})` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#92400e' }}>Light</p>
                    <div className="relative" style={{ width: 88, height: 88 }}>
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="32" fill="none" stroke="#fde68a" strokeWidth="7" />
                        <circle
                          cx="44" cy="44" r="32" fill="none"
                          stroke="url(#lightGrad)" strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={`${dash} ${CIRC}`}
                          strokeDashoffset={0}
                          transform="rotate(-90 44 44)"
                          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: isOn ? 'drop-shadow(0 0 4px #f59e0b)' : 'none' }}
                        />
                        <defs>
                          <linearGradient id="lightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>
                        <text x="44" y="38" textAnchor="middle" dominantBaseline="middle"
                          style={{ fontSize: val !== null && val >= 1000 ? 14 : 17, fontWeight: 700, fill: '#78350f', fontFamily: 'Inter,sans-serif' }}>
                          {val !== null ? val : '--'}
                        </text>
                        <text x="44" y="56" textAnchor="middle"
                          style={{ fontSize: 11, fontWeight: 600, fill: '#d97706', fontFamily: 'Inter,sans-serif' }}>
                          lux
                        </text>
                      </svg>
                      {/* Spinning sun icon when light > 0 */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg,#fcd34d,#f59e0b)',
                          boxShadow: isOn ? '0 0 10px rgba(245,158,11,0.7)' : 'none',
                          animation: isOn ? 'spin 4s linear infinite' : 'none',
                        }}
                      >
                        <SunMedium className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-center" style={{ color: '#d97706' }}>Avg illuminance</p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>





        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Analytics by {scope === 'floor' ? 'Floor' : 'Room'}</h2>
                <p className="text-sm text-slate-500">Select metric and time period.</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <ActiveMetricIcon className="w-3 h-3" />
                {activeMetric.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Scope</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setScope('floor')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${scope === 'floor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>By Floor</button>
                  <button onClick={() => setScope('room')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${scope === 'room' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>By Room</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Metric</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {METRIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMetric(option.value)}
                      className={`min-h-11 rounded-lg px-2 py-2 text-xs leading-tight ${metric === option.value ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Period</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['day', 'month', 'year'] as PeriodKey[]).map((periodValue) => (
                    <button
                      key={periodValue}
                      onClick={() => setPeriod(periodValue)}
                      className={`rounded-lg px-3 py-2 text-sm ${period === periodValue ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {periodValue === 'day' ? 'Day' : periodValue === 'month' ? 'Month' : 'Year'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4" style={{ overflow: 'visible' }}>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Current values by {scope === 'floor' ? 'floor' : 'room'}</h3>
                {chartData.length === 0 ? (
                  <p className="text-sm text-slate-500">No data available for the selected filter.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 8, right: 24, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={chartData.length > 4 ? -18 : 0} textAnchor={chartData.length > 4 ? 'end' : 'middle'} height={chartData.length > 4 ? 52 : 30} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15,23,42,0.92)',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 12,
                          color: '#f1f5f9',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}
                        labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                        formatter={(value: number, _name: string, props: any) => {
                          const unit = props?.payload?.unit || '';
                          const precision = metric === 'device_activity' ? 0 : 2;
                          return [`${Number(value).toFixed(precision)}${unit}`, activeMetric.label];
                        }}
                      />
                      <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]}>
                        <LabelList dataKey="displayValue" position="insideTop" style={{ fontSize: 12, fill: '#ffffff', fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4" style={{ overflow: 'visible' }}>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">{activeMetric.label} trend</h3>
                {trendData.length === 0 ? (
                  <p className="text-sm text-slate-500">No timeseries data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 8, right: 32, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(15,23,42,0.92)',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 12,
                          color: '#f1f5f9',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        }}
                        labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                        wrapperStyle={{ zIndex: 100 }}
                      />
                      {analytics.map((series, index) => {
                        const color = [ '#0f766e', '#2563eb', '#d97706', '#be123c', '#7c3aed', '#0891b2' ][index % 6];
                        const pts = trendData.filter(d => d[series.scope_name] != null).length;
                        return (
                          <Line
                            key={series.scope_id}
                            type="monotone"
                            dataKey={series.scope_name}
                            stroke={color}
                            strokeWidth={2}
                            dot={pts <= 5 ? { r: 4, fill: color, stroke: '#fff', strokeWidth: 2 } : { r: 2, fill: color, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Realtime Sensor Stream</h2>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
            {realtimeCards.length === 0 ? (
              <p className="text-sm text-slate-500">Waiting for realtime sensor data...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {realtimeCards.map((card, idx) => {
                  const metricStyles: Record<string, { gradient: string; color: string; bg: string; border: string }> = {
                    temperature: { gradient: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
                    humidity:    { gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                    light:       { gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                  };
                  const ms = metricStyles[card.metric] || { gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' };
                  const MetIcon = card.metric === 'temperature' ? Thermometer : card.metric === 'humidity' ? Droplets : SunMedium;
                  return (
                    <div
                      key={`${card.deviceId}-${card.metric}`}
                      className={`rounded-2xl p-3.5 animate-slide-in stagger-${Math.min(idx + 1, 6)}`}
                      style={{ background: ms.bg, border: `1px solid ${ms.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: ms.gradient }}
                        >
                          <MetIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        {/* Live pulse dot */}
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: '#10b981', animation: 'pulse 1.5s ease-in-out infinite' }}
                          />
                          <span className="text-[10px] font-medium" style={{ color: '#10b981' }}>LIVE</span>
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{card.deviceName}</p>
                      <p className="text-[11px] capitalize" style={{ color: ms.color }}>{card.roomName} · {card.metric}</p>
                      <p
                        className="mt-1.5 text-2xl font-bold animate-count"
                        style={{ color: ms.color, lineHeight: 1, transition: 'all 0.4s ease' }}
                      >
                        {card.value}<span className="text-sm font-medium ml-0.5">{card.unit}</span>
                      </p>
                      <p className="text-[10px] mt-1.5" style={{ color: '#94a3b8' }}>
                        Updated {card.updatedAt.toLocaleTimeString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  );
};