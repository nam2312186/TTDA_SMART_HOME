import React, { useState } from 'react';
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
  Building2,
  FileText,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { useApp } from '../context/AppContext';

interface MoreScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { currentUser } = useApp();
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const displayName = currentUser?.name || localStorage.getItem('username') || 'User';
  const displayEmail = currentUser?.email || localStorage.getItem('email') || '';
  const isAdmin = (currentUser?.role === 'admin') || localStorage.getItem('role') === 'admin';

  const generalMenuItems = [
    {
      icon: BarChart3,
      label: 'Reports & Analytics',
      description: 'View system reports',
      onClick: () => onNavigate('reports'),
    },
    {
      icon: FileText,
      label: isAdmin ? 'Audit Logs' : 'My Audit Logs',
      description: isAdmin ? 'User and automatic device actions' : 'View your activity and device logs',
      onClick: () => onNavigate('auditLogs'),
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
      onClick: () => setShowHelpDialog(true),
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
    {
      icon: Building2,
      label: 'Manage Floors & Rooms',
      description: 'Add/edit floors and rooms',
      onClick: () => onNavigate('manageAreas'),
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
            <h2 className="text-xl font-bold">{displayName}</h2>
            <p className="text-sm text-blue-100">{displayEmail}</p>
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

      {/* Help & Support Beautiful Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="w-[280px] sm:w-[320px] rounded-3xl overflow-hidden p-0 border-0 bg-white">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-center relative overflow-hidden">
             {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-blue-300 opacity-20 rounded-full blur-xl"></div>
            
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
              <HelpCircle className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            <DialogTitle className="text-white text-xl font-bold tracking-tight">Need Support?</DialogTitle>
          </div>
          
          <div className="p-6 text-center space-y-6">
            <DialogDescription className="text-slate-600 text-[15px] leading-relaxed">
              If you have any questions or feedback to help us improve the app, please feel free to contact us directly via Email.
            </DialogDescription>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-center gap-3 transition-colors hover:bg-blue-100/70">
              <div className="bg-blue-600 p-2 rounded-full shadow-sm shadow-blue-200">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <a href="mailto:doanthuctapbk@gmail.com" className="text-blue-700 font-bold text-sm select-all">
                doanthuctapbk@gmail.com
              </a>
            </div>
            
            <Button 
              onClick={() => setShowHelpDialog(false)}
              className="w-full rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};