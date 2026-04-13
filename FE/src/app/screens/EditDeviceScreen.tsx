import React, { useState } from 'react';
import { ChevronLeft, Thermometer, Droplets, Sun, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
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

// Config ngưỡng theo loại sensor
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

export const EditDeviceScreen: React.FC<EditDeviceScreenProps> = ({
  device,
  roomName,
  onBack,
}) => {
  const { updateDevice, updateDeviceThreshold } = useApp();
  const [deviceName, setDeviceName] = useState(device.name);
  const [deviceSubType, setDeviceSubType] = useState(device.subType);
  const [description, setDescription] = useState(device.description || '');
  const [minThreshold, setMinThreshold] = useState(
    typeof device.threshold?.min === 'number' ? String(device.threshold.min) : ''
  );
  const [maxThreshold, setMaxThreshold] = useState(
    typeof device.threshold?.max === 'number' ? String(device.threshold.max) : ''
  );
  const [requireMotion, setRequireMotion] = useState(
    typeof device.threshold?.requireMotion === 'boolean' ? device.threshold.requireMotion : true
  );
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
  const thresholdCfg = isSensor ? SENSOR_THRESHOLD_CONFIG[deviceSubType as string] : null;

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

    const minValue = minThreshold.trim() === '' ? undefined : Number(minThreshold);
    const maxValue = maxThreshold.trim() === '' ? undefined : Number(maxThreshold);

    if (minThreshold.trim() !== '' && !Number.isFinite(minValue)) {
      setError('Min threshold must be a valid number');
      return;
    }
    if (maxThreshold.trim() !== '' && !Number.isFinite(maxValue)) {
      setError('Max threshold must be a valid number');
      return;
    }
    if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
      setError('Min threshold cannot be greater than max threshold');
      return;
    }

    updateDevice(device.id, {
      name: deviceName.trim(),
      subType: deviceSubType as any,
      description: description.trim() || undefined,
    });

    if (isSensor && thresholdCfg && (thresholdCfg.hasMin || thresholdCfg.hasMax)) {
      updateDeviceThreshold(device.id, minValue, maxValue, requireMotion);
    }

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

        {/* Threshold Section — all sensors except motion */}
        {isSensor && thresholdCfg && (thresholdCfg.hasMin || thresholdCfg.hasMax) && (
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#e0e7ff' }}>
                <Activity className="w-3.5 h-3.5" style={{ color: '#4f46e5' }} />
              </span>
              <h3 className="text-sm font-bold text-slate-800">Automation Thresholds</h3>
            </div>

            {/* Hint */}
            <div className="rounded-xl p-3 text-xs"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
              💡 {thresholdCfg.hint}
            </div>

            {thresholdCfg.hasMin && (
              <div className="space-y-1.5">
                <Label htmlFor="minThreshold" className="text-sm font-semibold text-slate-700">
                  {thresholdCfg.minLabel}
                </Label>
                <Input
                  id="minThreshold"
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  placeholder={thresholdCfg.minPlaceholder}
                  className="rounded-xl"
                />
              </div>
            )}

            {thresholdCfg.hasMax && (
              <div className="space-y-1.5">
                <Label htmlFor="maxThreshold" className="text-sm font-semibold text-slate-700">
                  {thresholdCfg.maxLabel}
                </Label>
                <Input
                  id="maxThreshold"
                  type="number"
                  value={maxThreshold}
                  onChange={(e) => setMaxThreshold(e.target.value)}
                  placeholder={thresholdCfg.maxPlaceholder}
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Clear button */}
            {(minThreshold || maxThreshold) && (
              <button
                onClick={() => { setMinThreshold(''); setMaxThreshold(''); }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                🗑 Clear thresholds
              </button>
            )}

            {/* Require Motion Toggle */}
            <div className="flex items-center justify-between mt-4 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Require motion</Label>
                <p className="text-[10px] text-slate-500">Turn off for automatic triggering even without presence (Monitor mode)</p>
              </div>
              <Switch checked={requireMotion} onCheckedChange={setRequireMotion} />
            </div>
          </div>
        )}

        {/* Motion info box */}
        {isSensor && deviceSubType === 'motion' && (
          <div className="rounded-2xl p-4 text-xs"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
            🟢 Motion sensor: value <strong>{'>'} 0</strong> = motion detected → auto turn on fan/light based on conditions.
          </div>
        )}

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
