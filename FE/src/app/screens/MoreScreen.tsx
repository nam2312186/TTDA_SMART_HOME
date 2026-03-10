import React from 'react';
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  BarChart3,
  Users,
  Shield,
  Cpu,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';

interface MoreScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { currentUser, isAdmin } = useApp();

  const generalMenuItems = [
    {
      icon: BarChart3,
      label: 'Reports & Analytics',
      description: 'View system reports',
      onClick: () => onNavigate('reports'),
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'App preferences',
      onClick: () => {},
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help',
      onClick: () => {},
    },
  ];

  const adminMenuItems = [
    {
      icon: Users,
      label: 'Manage Users',
      description: 'Add, edit, or delete users',
      onClick: () => onNavigate('manageUsers'),
    },
    {
      icon: Shield,
      label: 'Room Permissions',
      description: 'Assign room access to users',
      onClick: () => onNavigate('roomPermissions'),
    },
    {
      icon: Cpu,
      label: 'Manage Devices',
      description: 'Full device management',
      onClick: () => onNavigate('manageDevices'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{currentUser?.name}</h2>
            <p className="text-sm text-blue-100">{currentUser?.email}</p>
            {isAdmin && (
              <p className="text-xs text-blue-200 mt-1 font-medium">Administrator</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* System Configuration Section - Admin Only */}
        {isAdmin && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">
              System Configuration
            </h3>
            <Card>
              <CardContent className="p-0">
                {adminMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                        index !== adminMenuItems.length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.description}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* General Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">
            General
          </h3>
          <Card>
            <CardContent className="p-0">
              {generalMenuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                      index !== generalMenuItems.length - 1
                        ? 'border-b border-gray-100'
                        : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Logout */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-red-600"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Log Out</div>
                <div className="text-xs text-red-500">
                  Sign out of your account
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-gray-500 py-4">
          <p>Smart Home App v1.0.0</p>
          <p className="mt-1">© 2026 Smart Home Inc.</p>
        </div>
      </div>
    </div>
  );
};