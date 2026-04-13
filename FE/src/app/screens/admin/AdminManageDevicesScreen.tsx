import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Cpu,
  Lightbulb,
  Fan,
  Thermometer,
  Droplets,
  Sun,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { useApp } from '../../context/AppContext';
import { Device, DeviceType, SensorType, ActuatorType } from '../../types';
import { toast } from '../../components/InAppToast';

interface AdminManageDevicesScreenProps {
  onBack: () => void;
}

const SENSOR_THRESHOLD_CONFIG: Record<string, {
  hasMin: boolean; hasMax: boolean;
  minLabel: string; maxLabel: string;
  minPlaceholder: string; maxPlaceholder: string;
  hint: string;
}> = {
  temperature: {
    hasMin: false, hasMax: true,
    minLabel: '', maxLabel: 'Maximum temperature threshold (°C)',
    minPlaceholder: 'e.g., 30 → fan auto turns on > 30°C', maxPlaceholder: '',
    hint: 'When temperature ≥ threshold + people present → auto turn on fan.',
  },
  humidity: {
    hasMin: false, hasMax: true,
    minLabel: '', maxLabel: 'Maximum humidity threshold (%)',
    minPlaceholder: 'e.g., 70 → fan auto turns on > 70%', maxPlaceholder: '',
    hint: 'When humidity ≥ threshold + people present → auto turn on fan.',
  },
  light: {
    hasMin: true, hasMax: false,
    minLabel: 'Minimum light threshold (lux)',
    maxLabel: '',
    minPlaceholder: 'e.g., 100 → light auto turns on < 100 lux',
    maxPlaceholder: '',
    hint: 'When light ≤ threshold + people present → auto turn on light.',
  },
  motion: {
    hasMin: false, hasMax: false,
    minLabel: '', maxLabel: '',
    minPlaceholder: '', maxPlaceholder: '',
    hint: 'Motion sensor does not need a threshold — value > 0 means motion detected.',
  },
};

export const AdminManageDevicesScreen: React.FC<AdminManageDevicesScreenProps> = ({
  onBack,
}) => {
  const { devices, rooms, floors, addDevice, updateDevice, deleteDevice, currentUser, updateDeviceThreshold } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    deviceType: 'sensor' as DeviceType,
    subType: 'temperature' as SensorType | ActuatorType,
    roomId: '',
    description: '',
    isOn: true,
  });

  const [minThreshold, setMinThreshold] = useState('');
  const [maxThreshold, setMaxThreshold] = useState('');
  const [requireMotion, setRequireMotion] = useState(true);

  const getDeviceIcon = (type: DeviceType, subType: SensorType | ActuatorType) => {
    if (type === 'sensor') {
      switch (subType) {
        case 'temperature':
          return Thermometer;
        case 'humidity':
          return Droplets;
        case 'light':
          return Sun;
        case 'motion':
          return Activity;
      }
    } else {
      switch (subType) {
        case 'light':
          return Lightbulb;
        case 'fan':
          return Fan;
      }
    }
    return Cpu;
  };

  const handleAdd = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      deviceType: 'sensor',
      subType: 'temperature',
      roomId: '',
      description: '',
      isOn: true,
    });
    setMinThreshold('');
    setMaxThreshold('');
    setRequireMotion(true);
    setShowDialog(true);
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      deviceType: device.type,
      subType: device.subType,
      roomId: device.roomId,
      description: device.description || '',
      isOn: device.isOn,
    });
    setMinThreshold(typeof device.threshold?.min === 'number' ? String(device.threshold.min) : '');
    setMaxThreshold(typeof device.threshold?.max === 'number' ? String(device.threshold.max) : '');
    setRequireMotion(typeof device.threshold?.requireMotion === 'boolean' ? device.threshold.requireMotion : true);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.roomId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingDevice) {
      updateDevice(editingDevice.id, {
        name: formData.name,
        type: formData.deviceType,
        subType: formData.subType,
        roomId: formData.roomId,
        description: formData.description,
        isOn: formData.isOn,
      });

      if (formData.deviceType === 'sensor') {
        const minVal = minThreshold.trim() === '' ? undefined : Number(minThreshold);
        const maxVal = maxThreshold.trim() === '' ? undefined : Number(maxThreshold);
        updateDeviceThreshold(editingDevice.id, minVal, maxVal, requireMotion);
      }

      toast.success('Device updated successfully');
    } else {
      addDevice({
        name: formData.name,
        type: formData.deviceType,
        subType: formData.subType,
        roomId: formData.roomId,
        description: formData.description,
        isOn: formData.isOn,
      });
      toast.success('Device created successfully');
    }

    setShowDialog(false);
    setFormData({
      name: '',
      deviceType: 'sensor',
      subType: 'temperature',
      roomId: '',
      description: '',
      isOn: true,
    });
  };

  const handleDelete = (deviceId: string) => {
    deleteDevice(deviceId);
    setShowDeleteConfirm(null);
    toast.success('Device deleted successfully');
  };

  // Filter devices
  const filteredDevices = devices.filter((device) => {
    const room = rooms.find((r) => r.id === device.roomId);
    if (filterFloor !== 'all' && room?.floorId !== filterFloor) return false;
    if (filterRoom !== 'all' && device.roomId !== filterRoom) return false;
    if (filterType !== 'all') {
      if (filterType === 'sensor' && device.type !== 'sensor') return false;
      if (filterType === 'actuator' && device.type !== 'actuator') return false;
    }
    return true;
  });

  // Available rooms based on selected floor in form
  const availableRooms = formData.roomId
    ? rooms
    : rooms;

  // Get sub-type options based on device type
  const getSubTypeOptions = () => {
    if (formData.deviceType === 'sensor') {
      return [
        { value: 'temperature', label: 'Temperature' },
        { value: 'humidity', label: 'Humidity' },
        { value: 'light', label: 'Light' },
        { value: 'motion', label: 'Motion' },
      ];
    } else {
      return [
        { value: 'light', label: 'Light' },
        { value: 'fan', label: 'Fan' },
      ];
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center gap-3">
        <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Manage Devices</h1>
          <p className="text-xs text-blue-100">Full device management</p>
        </div>
        <Button
          onClick={handleAdd}
          size="sm"
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={filterFloor} onValueChange={setFilterFloor}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map((floor) => (
                <SelectItem key={floor.id} value={floor.id}>
                  {floor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRoom} onValueChange={setFilterRoom}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms
                .filter(
                  (room) =>
                    filterFloor === 'all' || room.floorId === filterFloor
                )
                .map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sensor">Sensors</SelectItem>
              <SelectItem value="actuator">Actuators</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredDevices.map((device) => {
            const room = rooms.find((r) => r.id === device.roomId);
            const floor = floors.find((f) => f.id === room?.floorId);
            const Icon = getDeviceIcon(device.type, device.subType);

            return (
              <Card key={device.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {device.name}
                          </h3>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {room?.name} • {floor?.name}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(device)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(device.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={
                            device.type === 'sensor' ? 'default' : 'secondary'
                          }
                        >
                          {device.type}
                        </Badge>
                        <Badge variant="outline">{device.subType}</Badge>
                        <Badge
                          variant={device.isOn ? 'default' : 'secondary'}
                          className={
                            device.isOn
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {device.isOn ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      {device.description && (
                        <p className="text-xs text-gray-600 mt-2">
                          {device.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Devices Found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {devices.length === 0
                ? 'Get started by adding your first device'
                : 'Try adjusting your filters'}
            </p>
            {devices.length === 0 && (
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? 'Edit Device' : 'Add New Device'}
            </DialogTitle>
            <DialogDescription>
              {editingDevice
                ? 'Update device information below'
                : 'Enter device details to add it to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Device Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Living Room Light"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type *</Label>
              <Select
                value={formData.deviceType}
                onValueChange={(value: DeviceType) => {
                  const newSubType =
                    value === 'sensor' ? 'temperature' : 'light';
                  setFormData({
                    ...formData,
                    deviceType: value,
                    subType: newSubType as any,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="actuator">Actuator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subType">Sub Type *</Label>
              <Select
                value={formData.subType}
                onValueChange={(value: SensorType | ActuatorType) =>
                  setFormData({ ...formData, subType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSubTypeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Room *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roomId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => {
                    const floorRooms = rooms.filter(
                      (r) => r.floorId === floor.id
                    );
                    if (floorRooms.length === 0) return null;
                    return (
                      <div key={floor.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                          {floor.name}
                        </div>
                        {floorRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional device description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={formData.isOn ? 'on' : 'off'}
                onValueChange={(value) =>
                  setFormData({ ...formData, isOn: value === 'on' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Threshold Section for Sensors (Only when editing) */}
            {editingDevice && formData.deviceType === 'sensor' && SENSOR_THRESHOLD_CONFIG[formData.subType as string] && (
              <div className="space-y-4 pt-4 mt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-100">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">Automation Thresholds</h3>
                </div>

                <div className="rounded-xl p-3 text-xs bg-green-50 border border-green-200 text-green-700">
                  💡 {SENSOR_THRESHOLD_CONFIG[formData.subType as string].hint}
                </div>

                {SENSOR_THRESHOLD_CONFIG[formData.subType as string].hasMin && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{SENSOR_THRESHOLD_CONFIG[formData.subType as string].minLabel}</Label>
                    <Input
                      type="number"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                      placeholder={SENSOR_THRESHOLD_CONFIG[formData.subType as string].minPlaceholder}
                      className="rounded-xl"
                    />
                  </div>
                )}

                {SENSOR_THRESHOLD_CONFIG[formData.subType as string].hasMax && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{SENSOR_THRESHOLD_CONFIG[formData.subType as string].maxLabel}</Label>
                    <Input
                      type="number"
                      value={maxThreshold}
                      onChange={(e) => setMaxThreshold(e.target.value)}
                      placeholder={SENSOR_THRESHOLD_CONFIG[formData.subType as string].maxPlaceholder}
                      className="rounded-xl"
                    />
                  </div>
                )}

                {(minThreshold || maxThreshold) && (
                  <button
                    onClick={() => { setMinThreshold(''); setMaxThreshold(''); }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    🗑 Clear thresholds
                  </button>
                )}

                <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-slate-800">Require motion</Label>
                    <p className="text-[10px] text-slate-500">Turn off for automatic triggering even without presence (Monitor mode)</p>
                  </div>
                  <Switch checked={requireMotion} onCheckedChange={setRequireMotion} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.roomId}
            >
              {editingDevice ? 'Save Changes' : 'Create Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm !== null}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this device? This action cannot be
              undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteConfirm && handleDelete(showDeleteConfirm)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
