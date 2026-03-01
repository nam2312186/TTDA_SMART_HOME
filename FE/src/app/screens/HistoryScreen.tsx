import React, { useState } from 'react';
import {
  History,
  Filter,
  ChevronLeft,
  Power,
  Calendar,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useApp } from '../context/AppContext';

interface HistoryScreenProps {
  deviceId?: string;
  onBack?: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  deviceId,
  onBack,
  onNavigate,
}) => {
  const { historyLogs, rooms, devices } = useApp();
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  let filteredLogs = deviceId
    ? historyLogs.filter((log) => log.deviceId === deviceId)
    : historyLogs;

  if (filterRoom !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.roomName === filterRoom);
  }

  if (filterEventType !== 'all') {
    filteredLogs = filteredLogs.filter((log) => log.eventType === filterEventType);
  }

  if (filterDateFrom) {
    const fromDate = new Date(filterDateFrom);
    filteredLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= fromDate
    );
  }

  if (filterDateTo) {
    const toDate = new Date(filterDateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) <= toDate
    );
  }

  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const uniqueRooms = [...new Set(historyLogs.map((log) => log.roomName))];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'manual_control':
        return Power;
      case 'scheduled_action':
        return Calendar;
      case 'threshold_alert':
        return AlertTriangle;
      case 'system':
        return Settings;
      default:
        return History;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'manual_control':
        return 'bg-blue-100 text-blue-600';
      case 'scheduled_action':
        return 'bg-green-100 text-green-600';
      case 'threshold_alert':
        return 'bg-orange-100 text-orange-600';
      case 'system':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {deviceId ? 'Device History' : 'Activity History'}
            </h1>
            <p className="text-sm text-gray-500">
              {sortedLogs.length} event{sortedLogs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!deviceId && (
                <div className="space-y-2">
                  <Label htmlFor="filterRoom">Room</Label>
                  <Select value={filterRoom} onValueChange={setFilterRoom}>
                    <SelectTrigger id="filterRoom">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {uniqueRooms.map((room) => (
                        <SelectItem key={room} value={room}>
                          {room}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="filterEventType">Event Type</Label>
                <Select
                  value={filterEventType}
                  onValueChange={setFilterEventType}
                >
                  <SelectTrigger id="filterEventType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="manual_control">Manual Control</SelectItem>
                    <SelectItem value="scheduled_action">
                      Scheduled Action
                    </SelectItem>
                    <SelectItem value="threshold_alert">
                      Threshold Alert
                    </SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setFilterRoom('all');
                  setFilterEventType('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        {sortedLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No history records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLogs.map((log) => {
              const Icon = getEventIcon(log.eventType);
              const colorClass = getEventColor(log.eventType);

              return (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {log.deviceName}
                          </h3>
                          {log.action && (
                            <Badge
                              variant={
                                log.action === 'on' ? 'default' : 'secondary'
                              }
                              className="text-xs flex-shrink-0"
                            >
                              {log.action.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{log.roomName}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          {log.userName && (
                            <>
                              <span>•</span>
                              <span>{log.userName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
