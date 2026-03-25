import React, { useState } from 'react';
import { Lightbulb, Fan, DoorOpen, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { useApp } from '../context/AppContext';

interface ControlScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const ControlScreen: React.FC<ControlScreenProps> = ({ onNavigate }) => {
  const { devices, rooms, toggleDevices, setBrightness } = useApp();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'light' | 'fan' | 'door'>('all');
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const actuators = devices.filter((d) => d.type === 'actuator');
  
  const filteredDevices =
    filterType === 'all'
      ? actuators
      : actuators.filter((d) => d.subType === filterType);

  const toggleSelection = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAll = () => {
    setSelectedDevices(filteredDevices.map((d) => d.id));
  };

  const deselectAll = () => {
    setSelectedDevices([]);
  };

  const handleBulkAction = () => {
    if (selectedDevices.length > 0) {
      toggleDevices(selectedDevices);
      setSelectedDevices([]);
    }
  };

  const devicesByType = {
    light: actuators.filter((d) => d.subType === 'light'),
    fan: actuators.filter((d) => d.subType === 'fan'),
    door: actuators.filter((d) => d.subType === 'door'),
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Device Control</h1>
        <p className="text-sm text-gray-500">Manage all your devices</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <Lightbulb className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <div className="text-lg font-bold">
                {devicesByType.light.filter((d) => d.isOn).length}
              </div>
              <div className="text-xs text-gray-500">Lights On</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <Fan className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <div className="text-lg font-bold">
                {devicesByType.fan.filter((d) => d.isOn).length}
              </div>
              <div className="text-xs text-gray-500">Fans On</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <DoorOpen className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <div className="text-lg font-bold">
                {devicesByType.door.filter((d) => d.isOn).length}
              </div>
              <div className="text-xs text-gray-500">Doors Open</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All ({actuators.length})
          </Button>
          <Button
            variant={filterType === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('light')}
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            Lights ({devicesByType.light.length})
          </Button>
          <Button
            variant={filterType === 'fan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('fan')}
          >
            <Fan className="w-4 h-4 mr-1" />
            Fans ({devicesByType.fan.length})
          </Button>
          <Button
            variant={filterType === 'door' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('door')}
          >
            <DoorOpen className="w-4 h-4 mr-1" />
            Doors ({devicesByType.door.length})
          </Button>
        </div>

        {/* Selection Actions */}
        {selectedDevices.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDevices.length} device{selectedDevices.length !== 1 ? 's' : ''} selected
                </span>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear
                </Button>
              </div>
              <Button onClick={handleBulkAction} className="w-full">
                Toggle Selected Devices
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bulk Selection */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="flex-1">
            <CheckSquare className="w-4 h-4 mr-1" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll} className="flex-1">
            <Square className="w-4 h-4 mr-1" />
            Deselect All
          </Button>
        </div>

        {/* Device List */}
        <div className="space-y-2">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No devices found
            </div>
          ) : (
            filteredDevices.map((device) => {
              const room = rooms.find((r) => r.id === device.roomId);
              const isSelected = selectedDevices.includes(device.id);
              const isExpanded = expandedDeviceId === device.id;
              const isLight = device.subType === 'light';
              const Icon =
                device.subType === 'light'
                  ? Lightbulb
                  : device.subType === 'fan'
                  ? Fan
                  : DoorOpen;

              return (
                <Card
                  key={device.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => toggleSelection(device.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(device.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          device.isOn ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            device.isOn ? 'text-green-600' : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {device.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {room?.name}
                          </span>
                          <Badge
                            variant={device.isOn ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {device.isOn ? 'On' : 'Off'}
                          </Badge>
                          {isLight && device.isOn && (
                            <span className="text-xs text-yellow-600">
                              {device.brightness || 0}%
                            </span>
                          )}
                        </div>
                      </div>
                      {isLight && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDeviceId(isExpanded ? null : device.id);
                          }}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      )}
                    </div>

                    {/* Brightness Slider for Light Devices */}
                    {isLight && isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700">
                              Brightness
                            </label>
                            <span className="text-sm font-semibold text-gray-900">
                              {device.brightness || 0}%
                            </span>
                          </div>
                          <Slider
                            value={[device.brightness || 0]}
                            onValueChange={(value) => {
                              const brightness = Math.round((value[0] / 100) * 255);
                              setBrightness(device.id, brightness);
                            }}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBrightness(device.id, 0);
                            }}
                          >
                            Off
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBrightness(device.id, 127);
                            }}
                          >
                            50%
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBrightness(device.id, 255);
                            }}
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
