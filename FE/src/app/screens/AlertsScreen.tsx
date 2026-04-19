import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApp } from '../context/AppContext';

interface AlertsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onNavigate }) => {
  const { alerts, devices, rooms, floors, updateDeviceThreshold } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'cleared'>('all');
  const [showThresholdPanel, setShowThresholdPanel] = useState(false);
  const [draftThresholds, setDraftThresholds] = useState<Record<string, { min: string; max: string }>>({});
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    if (selectedFloorId === 'all') return rooms;
    return rooms.filter((r) => r.floorId === selectedFloorId);
  }, [rooms, selectedFloorId]);

  const visibleDevices = useMemo(() => {
    return devices.filter((d) => {
      if (selectedRoomId !== 'all') return d.roomId === selectedRoomId;
      if (selectedFloorId !== 'all') {
        const room = rooms.find((r) => r.id === d.roomId);
        return room?.floorId === selectedFloorId;
      }
      return true;
    });
  }, [devices, rooms, selectedFloorId, selectedRoomId]);

  const configuredAlertDevices = useMemo(
    () => devices.filter((d) => Number.isFinite(d.threshold?.min) || Number.isFinite(d.threshold?.max)),
    [devices]
  );

  const filteredAlerts =
    filter === 'all'
      ? alerts
      : filter === 'active'
      ? alerts.filter((a) => !a.cleared)
      : alerts.filter((a) => a.cleared);

  const activeAlerts = alerts.filter((a) => !a.cleared);
  const clearedAlerts = alerts.filter((a) => a.cleared);

  const getDraftThreshold = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return { min: '', max: '' };
    const existing = draftThresholds[deviceId];
    if (existing) return existing;
    return {
      min: Number.isFinite(device.threshold?.min) ? String(device.threshold?.min) : '',
      max: Number.isFinite(device.threshold?.max) ? String(device.threshold?.max) : '',
    };
  };

  const updateDraftThreshold = (deviceId: string, field: 'min' | 'max', value: string) => {
    const current = getDraftThreshold(deviceId);
    setDraftThresholds((prev) => ({
      ...prev,
      [deviceId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const saveThreshold = (deviceId: string) => {
    const draft = getDraftThreshold(deviceId);
    const min = draft.min.trim() === '' ? undefined : Number(draft.min);
    const max = draft.max.trim() === '' ? undefined : Number(draft.max);

    if ((draft.min.trim() !== '' && !Number.isFinite(min)) || (draft.max.trim() !== '' && !Number.isFinite(max))) {
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      return;
    }

    updateDeviceThreshold(deviceId, min, max);
  };

  const clearThreshold = (deviceId: string) => {
    updateDeviceThreshold(deviceId, undefined, undefined);
    setDraftThresholds((prev) => ({
      ...prev,
      [deviceId]: { min: '', max: '' },
    }));
  };

  const sortedAlerts = [...filteredAlerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-600';
      case 'medium':
        return 'bg-orange-100 text-orange-600';
      case 'low':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div
        className="text-white p-5 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7c2d12 0%,#c2410c 50%,#ea580c 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20"
          style={{ background: 'rgba(253,186,116,0.4)' }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
              <p className="text-orange-200 text-sm mt-0.5">
                {activeAlerts.length} active · {clearedAlerts.length} cleared
              </p>
            </div>
            <button
              onClick={() => setShowThresholdPanel((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={showThresholdPanel
                ? { background: 'rgba(255,255,255,0.9)', color: '#c2410c' }
                : { background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
              }
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Alert Devices
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {showThresholdPanel && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Alert Settings</h2>
                <Badge variant="secondary">{configuredAlertDevices.length} configured</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedFloorId}
                  onValueChange={(value) => {
                    setSelectedFloorId(value);
                    setSelectedRoomId('all');
                    setSelectedDeviceId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedRoomId}
                  onValueChange={(value) => {
                    setSelectedRoomId(value);
                    setSelectedDeviceId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rooms</SelectItem>
                    {filteredRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visibleDevices.length === 0 ? (
                <p className="text-sm text-gray-500">No devices found in the selected area.</p>
              ) : (
                <div className="space-y-3">
                  {visibleDevices.map((device) => {
                    const draft = getDraftThreshold(device.id);
                    const minInvalid = draft.min.trim() !== '' && !Number.isFinite(Number(draft.min));
                    const maxInvalid = draft.max.trim() !== '' && !Number.isFinite(Number(draft.max));
                    const rangeInvalid =
                      !minInvalid &&
                      !maxInvalid &&
                      draft.min.trim() !== '' &&
                      draft.max.trim() !== '' &&
                      Number(draft.min) > Number(draft.max);

                    const isConfigured = Number.isFinite(device.threshold?.min) || Number.isFinite(device.threshold?.max);
                    const roomName = rooms.find((r) => r.id === device.roomId)?.name || 'Unknown Room';
                    const isExpanded = selectedDeviceId === device.id;

                    return (
                      <div key={device.id} className="rounded-lg border border-gray-200 p-3">
                        <button
                          type="button"
                          className="mb-2 flex w-full items-center justify-between gap-2 text-left"
                          onClick={() => setSelectedDeviceId((prev) => (prev === device.id ? null : device.id))}
                        >
                          <p className="font-medium text-gray-900 truncate">{device.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{device.subType}</Badge>
                            {isConfigured && (
                              <Badge variant="secondary">Configured</Badge>
                            )}
                            {!isConfigured && <Badge variant="outline">Not Set</Badge>}
                          </div>
                        </button>

                        <p className="mb-2 text-xs text-gray-500">{roomName}</p>

                        {isExpanded && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                value={draft.min}
                                onChange={(e) => updateDraftThreshold(device.id, 'min', e.target.value)}
                                placeholder="Min"
                              />
                              <Input
                                type="number"
                                value={draft.max}
                                onChange={(e) => updateDraftThreshold(device.id, 'max', e.target.value)}
                                placeholder="Max"
                              />
                            </div>

                            {(minInvalid || maxInvalid || rangeInvalid) && (
                              <p className="text-xs text-red-600">
                                {rangeInvalid
                                  ? 'Min threshold cannot be greater than max threshold.'
                                  : 'Threshold values must be valid numbers.'}
                              </p>
                            )}

                            <div className="mt-2 flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => clearThreshold(device.id)}
                              >
                                Remove Threshold
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveThreshold(device.id)}
                                disabled={minInvalid || maxInvalid || rangeInvalid}
                              >
                                Save Threshold
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: alerts.length, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#6366f1' },
            { label: 'Active', value: activeAlerts.length, gradient: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#ef4444' },
            { label: 'Cleared', value: clearedAlerts.length, gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)', color: '#10b981' },
          ].map(({ label, value, gradient, color }, i) => (
            <div
              key={label}
              className={`rounded-2xl p-3.5 text-center animate-float-up stagger-${i + 1}`}
              style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div
                className="text-2xl font-bold animate-count"
                style={{ color }}
              >
                {value}
              </div>
              <div className="text-xs font-semibold mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {(['all', 'active', 'cleared'] as const).map((f) => {
            const labels: Record<string, string> = { all: `All (${alerts.length})`, active: `Active (${activeAlerts.length})`, cleared: `Cleared (${clearedAlerts.length})` };
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                style={isActive
                  ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: 'var(--shadow-glow)' }
                  : { background: '#fff', color: '#6b7280', border: '1px solid var(--border)' }
                }
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Alerts List */}
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#f97316' }} />
            <p className="text-gray-400 font-medium">No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedAlerts.map((alert, idx) => {
              const sMap: Record<string, { bg: string; border: string; iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
                high: { bg: '#fff5f5', border: '#fecaca', iconBg: '#fee2e2', iconText: '#ef4444', badgeBg: '#fee2e2', badgeText: '#ef4444' },
                medium: { bg: '#fff7ed', border: '#fed7aa', iconBg: '#ffedd5', iconText: '#f97316', badgeBg: '#ffedd5', badgeText: '#f97316' },
                low: { bg: '#fefce8', border: '#fde68a', iconBg: '#fef9c3', iconText: '#eab308', badgeBg: '#fef9c3', badgeText: '#eab308' },
              };
              const s = sMap[alert.severity] || sMap.low;
              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] animate-float-up stagger-${Math.min(idx + 1, 6)} ${alert.cleared ? 'opacity-60' : ''}`}
                  style={{ background: s.bg, border: `1px solid ${s.border}`, boxShadow: 'var(--shadow-sm)' }}
                  onClick={() => onNavigate('alertDetail', alert)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!alert.cleared ? 'pulse-danger' : ''}`}
                        style={{ background: s.iconBg }}
                      >
                        {alert.cleared ? (
                          <CheckCircle2 className="w-5 h-5" style={{ color: '#10b981' }} />
                        ) : (
                          <AlertTriangle className="w-5 h-5" style={{ color: s.iconText }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">
                            {alert.deviceName}
                          </h3>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                            style={{ background: s.badgeBg, color: s.badgeText }}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {alert.message}
                        </p>
                        {(alert.metric || alert.thresholdValue !== undefined || alert.actualValue !== undefined) && (
                          <div
                            className="mb-2 rounded-xl px-3 py-2 text-xs"
                            style={{ background: 'rgba(15,14,26,0.05)', color: '#6b7280' }}
                          >
                            <div>
                              {alert.metric ? `${alert.metric} threshold` : 'Threshold'}
                              {alert.thresholdDirection === 'high' ? ' exceeded ' : alert.thresholdDirection === 'low' ? ' dropped below ' : ' '}
                              <strong>{alert.thresholdValue ?? '--'}{alert.unit || ''}</strong>
                            </div>
                            <div>Recorded: <strong>{alert.actualValue ?? '--'}{alert.unit || ''}</strong></div>
                            {alert.triggeredAction && alert.triggeredAction !== 'none' && (
                              <div>Auto: {alert.triggeredAction}{alert.targetDeviceName ? ` → ${alert.targetDeviceName}` : ''}</div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)', fontSize: '11px' }}>
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          {alert.cleared && alert.clearedAt && (
                            <>
                              <span>·</span>
                              <span style={{ color: '#10b981' }}>Cleared {new Date(alert.clearedAt).toLocaleTimeString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
