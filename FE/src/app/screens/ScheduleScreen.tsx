import React from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Power,
  Building2,
  Home,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { useApp } from '../context/AppContext';

interface ScheduleScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onNavigate }) => {
  const { schedules, toggleSchedule } = useApp();

  const activeSchedules = schedules.filter((s) => s.enabled);
  const inactiveSchedules = schedules.filter((s) => !s.enabled);

  const daysOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getScopeIcon = (type: string) => {
    switch (type) {
      case 'floor':
        return Building2;
      case 'room':
        return Home;
      case 'device':
        return Lightbulb;
      default:
        return Calendar;
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Schedules</h1>
            <p className="text-sm text-gray-500">
              {activeSchedules.length} active, {inactiveSchedules.length} inactive
            </p>
          </div>
          <Button size="sm" onClick={() => onNavigate('scheduleCreate')}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No schedules created yet</p>
            <Button onClick={() => onNavigate('scheduleCreate')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        ) : (
          <>
            {/* Active Schedules */}
            {activeSchedules.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Active Schedules
                </h2>
                <div className="space-y-2">
                  {activeSchedules.map((schedule) => {
                    const ScopeIcon = getScopeIcon(schedule.scope.type);
                    return (
                      <Card
                        key={schedule.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onNavigate('scheduleEdit', schedule)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-gray-900">
                                  {schedule.name}
                                </h3>
                                <Switch
                                  checked={schedule.enabled}
                                  onCheckedChange={() => toggleSchedule(schedule.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <ScopeIcon className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {schedule.scope.name}
                                </span>
                                <Badge
                                  variant={
                                    schedule.action === 'on' ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  Turn {schedule.action}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">
                                  {schedule.time}
                                </span>
                                <div className="flex gap-1">
                                  {daysOfWeekNames.map((day, index) => (
                                    <span
                                      key={day}
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        schedule.daysOfWeek.includes(index)
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-400'
                                      }`}
                                    >
                                      {day}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {schedule.lastExecuted && (
                                <div className="text-xs text-gray-400 mt-2">
                                  Last run:{' '}
                                  {new Date(schedule.lastExecuted).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive Schedules */}
            {inactiveSchedules.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Inactive Schedules
                </h2>
                <div className="space-y-2">
                  {inactiveSchedules.map((schedule) => {
                    const ScopeIcon = getScopeIcon(schedule.scope.type);
                    return (
                      <Card
                        key={schedule.id}
                        className="cursor-pointer hover:shadow-md transition-shadow opacity-60"
                        onClick={() => onNavigate('scheduleEdit', schedule)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-gray-900">
                                  {schedule.name}
                                </h3>
                                <Switch
                                  checked={schedule.enabled}
                                  onCheckedChange={() => toggleSchedule(schedule.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <ScopeIcon className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {schedule.scope.name}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  Turn {schedule.action}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">
                                  {schedule.time}
                                </span>
                                <div className="flex gap-1">
                                  {daysOfWeekNames.map((day, index) => (
                                    <span
                                      key={day}
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        schedule.daysOfWeek.includes(index)
                                          ? 'bg-gray-200 text-gray-600'
                                          : 'bg-gray-100 text-gray-400'
                                      }`}
                                    >
                                      {day}
                                    </span>
                                  ))}
                                </div>
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
          </>
        )}
      </div>
    </div>
  );
};
