import React from 'react';
import {
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import { Alert } from '../types';

interface AlertDetailScreenProps {
  alert: Alert;
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export const AlertDetailScreen: React.FC<AlertDetailScreenProps> = ({
  alert: initialAlert,
  onBack,
  onNavigate,
}) => {
  const { alerts, clearAlert, deleteAlert, devices } = useApp();
  const alert = alerts.find((a) => a.id === initialAlert.id) || initialAlert;
  const device = devices.find((d) => d.id === alert.deviceId);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-600',
          text: 'text-red-600',
          lightBg: 'bg-red-50',
        };
      case 'medium':
        return {
          bg: 'bg-orange-600',
          text: 'text-orange-600',
          lightBg: 'bg-orange-50',
        };
      case 'low':
        return {
          bg: 'bg-yellow-600',
          text: 'text-yellow-600',
          lightBg: 'bg-yellow-50',
        };
      default:
        return {
          bg: 'bg-gray-600',
          text: 'text-gray-600',
          lightBg: 'bg-gray-50',
        };
    }
  };

  const colors = getSeverityColor(alert.severity);

  const handleClear = () => {
    clearAlert(alert.id);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this alert?')) {
      deleteAlert(alert.id);
      onBack();
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className={`${colors.bg} text-white p-4`}>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Alert Details</h1>
          </div>
          <Badge
            variant={alert.cleared ? 'default' : 'secondary'}
            className="bg-white/20"
          >
            {alert.cleared ? 'Cleared' : 'Active'}
          </Badge>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
          {alert.cleared ? (
            <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-white" />
          ) : (
            <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-white" />
          )}
          <div className="text-2xl font-bold mb-2 capitalize">
            {alert.severity} Priority
          </div>
          <div className="text-sm opacity-90">{alert.deviceName}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alert Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{alert.message}</p>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Device</span>
              <span className="font-medium">{alert.deviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium capitalize">
                {alert.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Severity</span>
              <Badge variant="secondary" className="capitalize">
                {alert.severity}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Timestamp</span>
              <span className="font-medium">
                {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
            {alert.cleared && alert.clearedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cleared At</span>
                <span className="font-medium text-green-600">
                  {new Date(alert.clearedAt).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!alert.cleared && (
              <Button onClick={handleClear} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Cleared
              </Button>
            )}
            {device && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onNavigate('deviceDetail', device)}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                View Device
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700"
              onClick={handleDelete}
            >
              Delete Alert
            </Button>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className={colors.lightBg}>
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            {alert.type === 'threshold_exceeded' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Check the device sensor for accuracy</li>
                <li>Adjust threshold values if needed</li>
                <li>Verify environmental conditions</li>
              </ul>
            )}
            {alert.type === 'motion_detected' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Review security camera footage if available</li>
                <li>Check if any scheduled activities were planned</li>
                <li>Consider adjusting motion sensor sensitivity</li>
              </ul>
            )}
            {alert.type === 'device_offline' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Check device power connection</li>
                <li>Verify network connectivity</li>
                <li>Try restarting the device</li>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
