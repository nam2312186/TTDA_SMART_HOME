import React from 'react';
import {
  ChevronLeft,
  Thermometer,
  Droplets,
  Sun,
  Eye,
  Lightbulb,
  Fan,
  DoorOpen,
  Power,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { useApp } from '../context/AppContext';

interface DevicesScreenProps {
  roomId: string;
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

const deviceIconMap: Record<string, React.FC<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  light: Sun,
  motion: Eye,
};

const actuatorIconMap: Record<string, React.FC<{ className?: string }>> = {
  light: Lightbulb,
  fan: Fan,
  door: DoorOpen,
};

export const DevicesScreen: React.FC<DevicesScreenProps> = ({
  roomId,
  onBack,
  onNavigate,
}) => {
  const { rooms, devices, toggleDevice, currentUser } = useApp();
  const room = rooms.find((r) => r.id === roomId);
  const roomDevices = devices.filter((d) => d.roomId === roomId);

  if (!room) return null;

  const sensors = roomDevices.filter((d) => d.type === 'sensor');
  const actuators = roomDevices.filter((d) => d.type === 'actuator');

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
            <p className="text-sm text-gray-500">
              {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('manageDevices', { roomId })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {roomDevices.length === 0 ? (
          <div className="text-center py-12">
            <Power className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No devices in this room</p>
            {currentUser?.role === 'admin' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onNavigate('manageDevices', { roomId })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Sensors Section */}
            {sensors.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Sensors
                </h2>
                <div className="space-y-2">
                  {sensors.map((device) => {
                    const Icon = deviceIconMap[device.subType] || Thermometer;
                    return (
                      <Card
                        key={device.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onNavigate('deviceDetail', device)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {device.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={device.isOn ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {device.isOn ? 'Active' : 'Inactive'}
                                </Badge>
                                {device.currentValue !== undefined && (
                                  <span className="text-sm text-gray-600">
                                    {device.currentValue.toFixed(1)}
                                    {device.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actuators Section */}
            {actuators.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Controls
                </h2>
                <div className="space-y-2">
                  {actuators.map((device) => {
                    const Icon = actuatorIconMap[device.subType] || Lightbulb;
                    return (
                      <Card
                        key={device.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onNavigate('deviceDetail', device)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                device.isOn
                                  ? 'bg-green-100'
                                  : 'bg-gray-100'
                              }`}
                            >
                              <Icon
                                className={`w-6 h-6 ${
                                  device.isOn
                                    ? 'text-green-600'
                                    : 'text-gray-400'
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {device.name}
                              </h3>
                              <div className="text-sm text-gray-500 mt-1">
                                {device.isOn ? 'On' : 'Off'}
                              </div>
                            </div>
                            <Switch
                              checked={device.isOn}
                              onCheckedChange={() => toggleDevice(device.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
