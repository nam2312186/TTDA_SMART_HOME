import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, FileText, Layers3, Thermometer, Droplets, SunMedium, Wifi } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Badge } from '../components/ui/badge';
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
  { value: 'temperature', label: 'Nhiệt độ', icon: Thermometer },
  { value: 'humidity', label: 'Độ ẩm', icon: Droplets },
  { value: 'light', label: 'Ánh sáng', icon: SunMedium },
  { value: 'device_activity', label: 'Hoạt động thiết bị', icon: Activity },
];

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onNavigate }) => {
  const { devices, rooms, floors, users, alerts, schedules, isAdmin, currentUser } = useApp();
  const [scope, setScope] = useState<ScopeKey>('floor');
  const [metric, setMetric] = useState<MetricKey>('temperature');
  const [period, setPeriod] = useState<PeriodKey>('day');
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [realtime, setRealtime] = useState<Record<string, RealtimeCard>>({});

  useEffect(() => {
    let mounted = true;
    dashboardApi.analytics({ scope, metric, period })
      .then((response) => {
        if (!mounted) return;
        setAnalytics(response.series || []);
      })
      .catch(() => {
        if (!mounted) return;
        setAnalytics([]);
      });

    return () => {
      mounted = false;
    };
  }, [scope, metric, period]);

  useEffect(() => {
    const socket = connectSensorWebSocket((message: any) => {
      if (message?.event !== 'sensor_data') return;
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
    });

    return () => socket.close();
  }, []);

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
      return {
        name: series.scope_name,
        value: latestPoint?.value ?? 0,
        unit: latestPoint?.unit || '',
      };
    });
  }, [analytics]);

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
    return Object.values(realtime)
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
  }, [devices, realtime, rooms]);

  const activeMetric = METRIC_OPTIONS.find((option) => option.value === metric) || METRIC_OPTIONS[0];
  const ActiveMetricIcon = activeMetric.icon;

  return (
    <div className="h-full overflow-y-auto pb-20 bg-slate-50">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isAdmin ? 'Analytics Dashboard' : 'Room Analytics'}</h1>
            <p className="text-sm text-slate-200">
              {isAdmin ? 'Thống kê theo tầng và phòng, không dùng biểu đồ tròn.' : `Theo dõi khu vực của ${currentUser?.name || 'bạn'}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card) => (
            <button
              key={card.label}
              onClick={card.action}
              className="rounded-2xl border border-white/10 bg-white/10 p-4 text-left transition hover:bg-white/15"
            >
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-slate-200 mt-1">{card.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Thống kê theo {scope === 'floor' ? 'tầng' : 'phòng'}</h2>
                <p className="text-sm text-slate-500">Chọn loại thống kê và chu kỳ ngày, tháng, năm.</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <ActiveMetricIcon className="w-3 h-3" />
                {activeMetric.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Phạm vi</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setScope('floor')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${scope === 'floor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Theo tầng</button>
                  <button onClick={() => setScope('room')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${scope === 'room' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Theo phòng</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Metric</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {METRIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMetric(option.value)}
                      className={`min-h-11 rounded-lg px-3 py-2 text-sm ${metric === option.value ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-2">Chu kỳ</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['day', 'month', 'year'] as PeriodKey[]).map((periodValue) => (
                    <button
                      key={periodValue}
                      onClick={() => setPeriod(periodValue)}
                      className={`rounded-lg px-3 py-2 text-sm ${period === periodValue ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {periodValue === 'day' ? 'Ngày' : periodValue === 'month' ? 'Tháng' : 'Năm'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Giá trị hiện tại theo {scope === 'floor' ? 'tầng' : 'phòng'}</h3>
                {chartData.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có dữ liệu cho bộ lọc hiện tại.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={chartData.length > 4 ? -18 : 0} textAnchor={chartData.length > 4 ? 'end' : 'middle'} height={chartData.length > 4 ? 52 : 30} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Xu hướng {activeMetric.label.toLowerCase()}</h3>
                {trendData.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có chuỗi thời gian để hiển thị.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      {analytics.map((series, index) => (
                        <Line
                          key={series.scope_id}
                          type="monotone"
                          dataKey={series.scope_name}
                          stroke={[ '#0f766e', '#2563eb', '#d97706', '#be123c', '#7c3aed', '#0891b2' ][index % 6]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
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
              <p className="text-sm text-slate-500">Đang chờ dữ liệu realtime từ sensor...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {realtimeCards.map((card) => (
                  <div key={`${card.deviceId}-${card.metric}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{card.deviceName}</p>
                    <p className="text-xs text-slate-500">{card.roomName} • {card.metric}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{card.value}{card.unit}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{card.updatedAt.toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900">Admin Shortcuts</h2>
                <Layers3 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => onNavigate('manageAreas')} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50">
                  <Building2 className="w-5 h-5 text-slate-700 mb-2" />
                  <p className="font-medium text-slate-900">Manage Floors & Rooms</p>
                  <p className="text-xs text-slate-500 mt-1">Thêm, sửa, xoá tầng và phòng.</p>
                </button>
                <button onClick={() => onNavigate('auditLogs')} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50">
                  <FileText className="w-5 h-5 text-slate-700 mb-2" />
                  <p className="font-medium text-slate-900">Audit Logs</p>
                  <p className="text-xs text-slate-500 mt-1">Kiểm tra log metadata của user, device và automation.</p>
                </button>
                <button onClick={() => onNavigate('schedule')} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50">
                  <Activity className="w-5 h-5 text-slate-700 mb-2" />
                  <p className="font-medium text-slate-900">Schedules</p>
                  <p className="text-xs text-slate-500 mt-1">Quản lý lịch theo phòng hoặc từng thiết bị.</p>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};