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
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alerts</h1>
            <p className="text-sm text-gray-500">
              {activeAlerts.length} active, {clearedAlerts.length} cleared
            </p>
          </div>
          <Button
            variant={showThresholdPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowThresholdPanel((prev) => !prev)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Alert Devices
          </Button>
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
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-gray-900">
                {alerts.length}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-orange-600">
                {activeAlerts.length}
              </div>
              <div className="text-xs text-gray-500">Active</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-green-600">
                {clearedAlerts.length}
              </div>
              <div className="text-xs text-gray-500">Cleared</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            All ({alerts.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="flex-1"
          >
            Active ({activeAlerts.length})
          </Button>
          <Button
            variant={filter === 'cleared' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cleared')}
            className="flex-1"
          >
            Cleared ({clearedAlerts.length})
          </Button>
        </div>

        {/* Alerts List */}
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  alert.cleared ? 'opacity-60' : ''
                }`}
                onClick={() => onNavigate('alertDetail', alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getSeverityColor(
                        alert.severity
                      )}`}
                    >
                      {alert.cleared ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {alert.deviceName}
                        </h3>
                        <Badge
                          variant={alert.cleared ? 'secondary' : 'default'}
                          className="text-xs capitalize flex-shrink-0"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {alert.message}
                      </p>
                      {(alert.metric || alert.thresholdValue !== undefined || alert.actualValue !== undefined) && (
                        <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <div>
                            {alert.metric ? `${alert.metric} threshold` : 'Threshold'}
                            {alert.thresholdDirection === 'high' ? ' exceeded ' : alert.thresholdDirection === 'low' ? ' dropped below ' : ' '}
                            {alert.thresholdValue ?? '--'}{alert.unit || ''}
                          </div>
                          <div>
                            Recorded value: {alert.actualValue ?? '--'}{alert.unit || ''}
                          </div>
                          {alert.triggeredAction && alert.triggeredAction !== 'none' && (
                            <div>
                              Auto action: {alert.triggeredAction}
                              {alert.targetDeviceName ? ` -> ${alert.targetDeviceName}` : ''}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.cleared && alert.clearedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              Cleared {new Date(alert.clearedAt).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
