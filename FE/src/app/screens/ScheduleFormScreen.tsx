import React, { useState } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useApp } from '../context/AppContext';
import { Schedule } from '../types';

interface ScheduleFormScreenProps {
  schedule?: Schedule;
  deviceId?: string;
  onBack: () => void;
}

export const ScheduleFormScreen: React.FC<ScheduleFormScreenProps> = ({
  schedule,
  deviceId,
  onBack,
}) => {
  const { rooms, devices, addSchedule, updateSchedule, deleteSchedule } = useApp();
  
  const [name, setName] = useState(schedule?.name || '');
  const [scopeType, setScopeType] = useState<'device' | 'room'>(
    schedule?.scope.type || (deviceId ? 'device' : 'room')
  );
  const [scopeId, setScopeId] = useState(schedule?.scope.id || deviceId || '');
  const [action, setAction] = useState<'on' | 'off' | 'toggle'>(schedule?.action || 'on');
  const [time, setTime] = useState(schedule?.time || '08:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    schedule?.daysOfWeek || [1, 2, 3, 4, 5]
  );
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);

  const daysOfWeekNames = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const getScopeName = () => {
    if (scopeType === 'room') {
      return rooms.find((r) => r.id === scopeId)?.name || '';
    } else {
      return devices.find((d) => d.id === scopeId)?.name || '';
    }
  };

  const handleSave = () => {
    if (!name || !scopeId || daysOfWeek.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const scheduleData = {
      name,
      enabled,
      scope: {
        type: scopeType,
        id: scopeId,
        name: getScopeName(),
      },
      action,
      time,
      daysOfWeek,
    };

    if (schedule) {
      updateSchedule(schedule.id, scheduleData);
    } else {
      addSchedule(scheduleData);
    }

    onBack();
  };

  const handleDelete = () => {
    if (schedule && confirm('Are you sure you want to delete this schedule?')) {
      deleteSchedule(schedule.id);
      onBack();
    }
  };

  // Get available scope options based on type
  const getScopeOptions = () => {
    if (scopeType === 'room') return rooms;
    return devices.filter((d) => d.type === 'actuator');
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {schedule ? 'Edit Schedule' : 'Create Schedule'}
            </h1>
          </div>
          {schedule && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Lights"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Schedule</Label>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scopeType">Apply To *</Label>
              <Select
                value={scopeType}
                onValueChange={(value: 'device' | 'room') => {
                  setScopeType(value);
                  setScopeId('');
                }}
                disabled={!!deviceId}
              >
                <SelectTrigger id="scopeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Specific Room</SelectItem>
                  <SelectItem value="device">Single Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scopeId">
                Select {scopeType === 'room' ? 'Room' : 'Device'} *
              </Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="scopeId">
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {getScopeOptions().map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action">Device Action *</Label>
              <Select
                value={action}
                onValueChange={(value: 'on' | 'off' | 'toggle') => setAction(value)}
              >
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Turn On</SelectItem>
                  <SelectItem value="off">Turn Off</SelectItem>
                  <SelectItem value="toggle">Toggle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="time">Execution Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Days of Week *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {daysOfWeekNames.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                    daysOfWeek.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {schedule ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
};
