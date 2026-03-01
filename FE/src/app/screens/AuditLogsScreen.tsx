import React, { useState } from 'react';
import { ArrowLeft, Filter, Activity, User, Home, Calendar } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

interface AuditLogsScreenProps {
  onBack: () => void;
}

export const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ onBack }) => {
  const { auditLogs } = useApp();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['all', 'device', 'schedule', 'alert', 'user', 'system'];

  const filteredLogs = filterCategory === 'all'
    ? auditLogs
    : auditLogs.filter((log) => log.category === filterCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      device: 'bg-blue-100 text-blue-700',
      schedule: 'bg-green-100 text-green-700',
      alert: 'bg-orange-100 text-orange-700',
      user: 'bg-purple-100 text-purple-700',
      system: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'device':
        return Activity;
      case 'user':
        return User;
      default:
        return Home;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
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

        {/* Filters */}
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

            {/* Date Range Filter (UI only) */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Date Range</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Date
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  End Date
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
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
            return (
              <Card key={log.id}>
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
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {log.homeName}
                        </span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
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
