import React from 'react';
import {
  ChevronLeft,
  Plus,
  Lightbulb,
  Fan,
  Thermometer,
  Droplets,
  Edit,
  Trash2,
  MoreVertical,
  DoorOpen,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useApp } from '../context/AppContext';
import { Device } from '../types';

interface RoomDevicesScreenProps {
  roomId: string;
  roomName: string;
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

const getDeviceIcon = (device: Device) => {
  switch (device.subType) {
    case 'light':
      return Lightbulb;
    case 'fan':
      return Fan;
    case 'temperature':
      return Thermometer;
    case 'humidity':
      return Droplets;
    case 'door':
      return DoorOpen;
    default:
      return Lightbulb;
  }
};

export const RoomDevicesScreen: React.FC<RoomDevicesScreenProps> = ({
  roomId,
  roomName,
  onBack,
  onNavigate,
}) => {
  const { devices, toggleDevice } = useApp();
  const roomDevices = devices.filter((d) => d.roomId === roomId);

  const handleToggle = (deviceId: string) => {
    toggleDevice(deviceId);
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{roomName}</h1>
            <p className="text-sm text-gray-500">
              {roomDevices.length} device{roomDevices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate('addDevice', { roomId, roomName })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {roomDevices.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No devices yet</p>
            <Button
              variant="outline"
              onClick={() => onNavigate('addDevice', { roomId, roomName })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
        ) : (
          roomDevices.map((device) => {
            const Icon = getDeviceIcon(device);
            const isSensor = device.type === 'sensor';

            return (
              <Card key={device.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        device.isOn && !isSensor
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          device.isOn && !isSensor
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {device.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {device.subType}
                        </Badge>
                        {isSensor && device.currentValue !== undefined && (
                          <span className="text-xs text-gray-500">
                            {device.currentValue}
                            {device.unit}
                          </span>
                        )}
                      </div>
                      {device.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {device.description}
                        </p>
                      )}
                    </div>

                    {/* Toggle Switch */}
                    {!isSensor && (
                      <Switch
                        checked={device.isOn}
                        onCheckedChange={() => handleToggle(device.id)}
                      />
                    )}

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            onNavigate('editDevice', { device, roomName })
                          }
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            onNavigate('deleteDeviceConfirm', {
                              device,
                              roomName,
                            })
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
