import React from 'react';
import { Users, Home, Activity, FileText, Shield } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/badge';

interface AdminDashboardScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onNavigate }) => {
  const { users, homes, devices, auditLogs } = useApp();

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => onNavigate('manageUsers'),
    },
    {
      label: 'Total Homes',
      value: homes.length,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => onNavigate('adminManageHomes'),
    },
    {
      label: 'Total Devices',
      value: devices.length,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => onNavigate('adminManageHomes'),
    },
    {
      label: 'Audit Logs',
      value: auditLogs.length,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => onNavigate('auditLogs'),
    },
  ];

  const adminActions = [
    {
      title: 'Manage Users',
      description: 'View and edit user accounts and roles',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => onNavigate('manageUsers'),
    },
    {
      title: 'Manage Homes & Areas',
      description: 'Browse and manage all homes, floors, and rooms',
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => onNavigate('adminManageHomes'),
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and user actions',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => onNavigate('auditLogs'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-blue-100 text-sm">System-wide management</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <button
                key={index}
                onClick={stat.action}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-left hover:bg-white/20 transition-colors"
              >
                <Icon className="w-5 h-5 text-white mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-blue-100 mt-1">{stat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        <h2 className="text-lg font-semibold text-gray-900">Admin Tools</h2>

        {/* Admin Actions */}
        {adminActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={action.action}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          );
        })}

        {/* Recent Activity */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">{log.userName} • {log.homeName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {log.category}
                  </Badge>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
