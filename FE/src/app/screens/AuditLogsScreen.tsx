import React, { useMemo, useState } from 'react';
import { ArrowLeft, Filter, Activity, User, Home, Calendar, Cpu } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';

interface AuditLogsScreenProps {
  onBack: () => void;
}

type TimeRange = 'all' | 'today' | '7d' | '30d' | 'custom';

export const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ onBack }) => {
  const { auditLogs, users, floors, rooms, devices } = useApp();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', 'device', 'room', 'floor', 'schedule', 'alert', 'user', 'automation', 'system'];

  const userOptions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.userName).filter(Boolean))).sort();
  }, [auditLogs]);

  const deviceOptions = useMemo(() => {
    return Array.from(
      new Set(
        auditLogs
          .map((l) => l.deviceName || (l.category === 'device' ? l.entityName : undefined))
          .filter(Boolean)
      )
    ).sort();
  }, [auditLogs]);

  const ownerOptions = useMemo(() => {
    return users.map((u) => ({ id: u.id, name: u.name }));
  }, [users]);

  const getOwnerName = (log: any): string | undefined => {
    let ownerId: string | undefined;

    if (log.floorName) {
      const floor = floors.find((f) => f.name === log.floorName);
      ownerId = floor?.ownerUserId;
    }

    if (!ownerId && log.roomName) {
      const room = rooms.find((r) => r.name === log.roomName);
      ownerId = room?.ownerUserId;
    }

    if (!ownerId && log.deviceName) {
      const device = devices.find((d) => d.name === log.deviceName);
      const room = device ? rooms.find((r) => r.id === device.roomId) : undefined;
      ownerId = room?.ownerUserId;
    }

    if (!ownerId) return undefined;
    return users.find((u) => u.id === ownerId)?.name || `User #${ownerId}`;
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();

    return auditLogs.filter((log) => {
      if (filterCategory !== 'all' && log.category !== filterCategory) return false;
      if (filterUser !== 'all' && log.userName !== filterUser) return false;

      const logDeviceName = log.deviceName || (log.category === 'device' ? log.entityName : undefined);
      if (filterDevice !== 'all' && logDeviceName !== filterDevice) return false;

      const ownerName = getOwnerName(log);
      if (filterOwner !== 'all' && ownerName !== filterOwner) return false;

      const ts = new Date(log.timestamp);
      if (timeRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (ts < start) return false;
      }
      if (timeRange === '7d') {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        if (ts < start) return false;
      }
      if (timeRange === '30d') {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        if (ts < start) return false;
      }
      if (timeRange === 'custom') {
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`);
          if (ts < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`);
          if (ts > end) return false;
        }
      }

      return true;
    });
  }, [auditLogs, filterCategory, filterUser, filterDevice, filterOwner, timeRange, startDate, endDate, users, floors, rooms, devices]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      device: 'bg-blue-100 text-blue-700',
      schedule: 'bg-green-100 text-green-700',
      alert: 'bg-orange-100 text-orange-700',
      user: 'bg-purple-100 text-purple-700',
      room: 'bg-indigo-100 text-indigo-700',
      floor: 'bg-teal-100 text-teal-700',
      automation: 'bg-emerald-100 text-emerald-700',
      system: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'device':
      case 'automation':
        return Activity;
      case 'user':
        return User;
      case 'floor':
      case 'room':
        return Home;
      default:
        return Home;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Audit Logs</h1>
              <p className="text-xs text-gray-500">{filteredLogs.length} entries</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter className={`w-5 h-5 ${showFilters ? 'text-blue-600' : 'text-gray-600'}`} />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">User</p>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="all">All users</option>
                  {userOptions.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Device</p>
                <select
                  value={filterDevice}
                  onChange={(e) => setFilterDevice(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="all">All devices</option>
                  {deviceOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Room/Floor Owner</p>
                <select
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="all">All owners</option>
                  {ownerOptions.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Time Range</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {['all', 'today', '7d', '30d', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as TimeRange)}
                    className={`h-9 rounded-md text-sm border ${
                      timeRange === range
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {range === 'all' ? 'All' : range === 'today' ? 'Today' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {timeRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Start</p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">End</p>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No audit logs found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const Icon = getCategoryIcon(log.category);
            const ownerName = getOwnerName(log);
            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${getCategoryColor(log.category).replace('text', 'bg').replace('700', '100')} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${getCategoryColor(log.category).split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{log.action}</h3>
                        <Badge className={`text-xs ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                      {ownerName && (
                        <p className="text-xs text-indigo-700 mb-2">
                          Owner: <span className="font-medium">{ownerName}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName || 'Unknown'}
                        </span>
                        {log.deviceName && (
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            {log.deviceName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {log.homeName || 'Smart Home'}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {log.source}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
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
