import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
    { value: 'door', label: 'Door' },
  ];

  const sensorTypes = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'light', label: 'Light' },
    { value: 'motion', label: 'Motion' },
  ];

  const subTypeOptions = device.type === 'sensor' ? sensorTypes : actuatorTypes;

  const handleSave = () => {
    setError('');

    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }

    if (!deviceSubType) {
      setError('Device type is required');
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
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Device</h1>
            <p className="text-sm text-gray-500">{roomName}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name *</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Living Room Light"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            {/* Device Category (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="deviceCategory">Device Category</Label>
              <Input
                id="deviceCategory"
                value={device.type === 'sensor' ? 'Sensor (Monitoring)' : 'Actuator (Controllable)'}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Device category cannot be changed after creation
              </p>
            </div>

            {/* Device Type */}
            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type *</Label>
              <Select value={deviceSubType} onValueChange={setDeviceSubType}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
