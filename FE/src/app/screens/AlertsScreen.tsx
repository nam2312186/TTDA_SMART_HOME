import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';

interface AlertsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onNavigate }) => {
  const { alerts } = useApp();
  const [filter, setFilter] = useState<'all' | 'active' | 'cleared'>('all');

  const filteredAlerts =
    filter === 'all'
      ? alerts
      : filter === 'active'
      ? alerts.filter((a) => !a.cleared)
      : alerts.filter((a) => a.cleared);

  const activeAlerts = alerts.filter((a) => !a.cleared);
  const clearedAlerts = alerts.filter((a) => a.cleared);

  const sortedAlerts = [...filteredAlerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-600';
      case 'medium':
        return 'bg-orange-100 text-orange-600';
      case 'low':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500">
          {activeAlerts.length} active, {clearedAlerts.length} cleared
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-gray-900">
                {alerts.length}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-orange-600">
                {activeAlerts.length}
              </div>
              <div className="text-xs text-gray-500">Active</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-bold text-green-600">
                {clearedAlerts.length}
              </div>
              <div className="text-xs text-gray-500">Cleared</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            All ({alerts.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="flex-1"
          >
            Active ({activeAlerts.length})
          </Button>
          <Button
            variant={filter === 'cleared' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cleared')}
            className="flex-1"
          >
            Cleared ({clearedAlerts.length})
          </Button>
        </div>

        {/* Alerts List */}
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No alerts to display</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  alert.cleared ? 'opacity-60' : ''
                }`}
                onClick={() => onNavigate('alertDetail', alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getSeverityColor(
                        alert.severity
                      )}`}
                    >
                      {alert.cleared ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {alert.deviceName}
                        </h3>
                        <Badge
                          variant={alert.cleared ? 'secondary' : 'default'}
                          className="text-xs capitalize flex-shrink-0"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.cleared && alert.clearedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              Cleared {new Date(alert.clearedAt).toLocaleTimeString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
