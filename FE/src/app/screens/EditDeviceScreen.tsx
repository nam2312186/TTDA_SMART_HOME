import React, { useState } from 'react';
import { ChevronLeft, Thermometer, Droplets, Sun, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { Device } from '../types';

interface EditDeviceScreenProps {
  device: Device;
  roomName: string;
  onBack: () => void;
}

export const EditDeviceScreen: React.FC<EditDeviceScreenProps> = ({
  device,
  roomName,
  onBack,
}) => {
  const { updateDevice } = useApp();
  const [deviceName, setDeviceName] = useState(device.name);
  const [deviceSubType, setDeviceSubType] = useState(device.subType);
  const [description, setDescription] = useState(device.description || '');

  const [error, setError] = useState('');

  const actuatorTypes = [
    { value: 'light', label: 'Light' },
    { value: 'fan', label: 'Fan' },
  ];

  const sensorTypes = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'light', label: 'Light' },
    { value: 'motion', label: 'Motion' },
  ];

  const isSensor = device.type === 'sensor';
  const subTypeOptions = isSensor ? sensorTypes : actuatorTypes;

  const SensorIcons: Record<string, React.ReactNode> = {
    temperature: <Thermometer className="w-4 h-4 text-orange-500" />,
    humidity:    <Droplets className="w-4 h-4 text-blue-500" />,
    light:       <Sun className="w-4 h-4 text-amber-500" />,
    motion:      <Activity className="w-4 h-4 text-green-500" />,
  };

  const handleSave = () => {
    setError('');

    if (!deviceName.trim()) {
      setError('Device name cannot be empty');
      return;
    }

    updateDevice(device.id, {
      name: deviceName.trim(),
      subType: deviceSubType as any,
      description: description.trim() || undefined,
    });

    onBack();
  };

  return (
    <div className="h-full overflow-y-auto pb-20" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div
        className="text-white p-5 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 70%,#6366f1 100%)' }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: 'rgba(165,180,252,0.4)' }} />
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Edit Device</h1>
            <p className="text-indigo-200 text-xs">{roomName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 -mt-4 space-y-4">
        {/* Main Info */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          
          {/* Device Name */}
          <div className="space-y-1.5">
            <Label htmlFor="deviceName" className="text-sm font-semibold text-slate-700">
              Device Name *
            </Label>
            <Input
              id="deviceName"
              placeholder="e.g., Living Room Fan"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Category (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Device Type</Label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}
            >
              {isSensor ? SensorIcons[deviceSubType as string] : null}
              {isSensor ? 'Sensor' : 'Actuator'}
              <span className="ml-auto text-[10px] text-slate-400">Cannot be changed</span>
            </div>
          </div>

          {/* Sub type */}
          <div className="space-y-1.5">
            <Label htmlFor="deviceType" className="text-sm font-semibold text-slate-700">
              Sub Type *
            </Label>
            <Select value={deviceSubType} onValueChange={(v) => setDeviceSubType(v as any)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 text-sm text-red-600"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#4338ca,#6366f1)' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
