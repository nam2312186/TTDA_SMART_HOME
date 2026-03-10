import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNav, TabType } from './components/BottomNav';
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AreasScreen } from './screens/AreasScreen';
import { ControlScreen } from './screens/ControlScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { ScheduleFormScreen } from './screens/ScheduleFormScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { AlertDetailScreen } from './screens/AlertDetailScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { MoreScreen } from './screens/MoreScreen';
import { DeviceDetailScreen } from './screens/DeviceDetailScreen';
import { RoomDevicesScreen } from './screens/RoomDevicesScreen';
import { AddDeviceScreen } from './screens/AddDeviceScreen';
import { EditDeviceScreen } from './screens/EditDeviceScreen';
import { DeleteDeviceConfirmScreen } from './screens/DeleteDeviceConfirmScreen';
import { AdminManageUsersScreen } from './screens/admin/AdminManageUsersScreen';
import { RoomPermissionsScreen } from './screens/admin/RoomPermissionsScreen';
import { AdminManageDevicesScreen } from './screens/admin/AdminManageDevicesScreen';
import { Device, Alert, Schedule } from './types';
import { Toaster } from './components/ui/sonner';

type AuthScreen =
  | { type: 'splash' }
  | { type: 'login' }
  | { type: 'register' }
  | { type: 'forgotPassword' };

type Screen =
  | { type: 'home' }
  | { type: 'areas' }
  | { type: 'control' }
  | { type: 'schedule' }
  | { type: 'scheduleCreate'; deviceId?: string }
  | { type: 'scheduleEdit'; schedule: Schedule }
  | { type: 'alerts' }
  | { type: 'alertDetail'; alert: Alert }
  | { type: 'history'; deviceId?: string }
  | { type: 'reports' }
  | { type: 'more' }
  | { type: 'deviceDetail'; device: Device }
  | { type: 'roomDevices'; roomId: string; roomName: string }
  | { type: 'addDevice'; roomId: string; roomName: string }
  | { type: 'editDevice'; device: Device; roomName: string }
  | { type: 'deleteDeviceConfirm'; device: Device; roomName: string }
  | { type: 'manageUsers' }
  | { type: 'roomPermissions' }
  | { type: 'manageDevices' };

function MainApp() {
  const { currentUser, logout } = useApp();
  const [authScreen, setAuthScreen] = useState<AuthScreen>({ type: 'splash' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [screenStack, setScreenStack] = useState<Screen[]>([{ type: 'home' }]);

  const currentScreen = screenStack[screenStack.length - 1];

  const handleNavigate = (screen: string, data?: any) => {
    let newScreen: Screen;

    switch (screen) {
      case 'home':
        newScreen = { type: 'home' };
        setActiveTab('home');
        setScreenStack([newScreen]);
        break;
      case 'areas':
        newScreen = { type: 'areas' };
        setActiveTab('areas');
        setScreenStack([newScreen]);
        break;
      case 'control':
        newScreen = { type: 'control' };
        setActiveTab('control');
        setScreenStack([newScreen]);
        break;
      case 'schedule':
        newScreen = { type: 'schedule' };
        setActiveTab('schedule');
        setScreenStack([newScreen]);
        break;
      case 'scheduleCreate':
        newScreen = { type: 'scheduleCreate', deviceId: data?.deviceId };
        break;
      case 'scheduleEdit':
        newScreen = { type: 'scheduleEdit', schedule: data };
        break;
      case 'alerts':
        newScreen = { type: 'alerts' };
        setActiveTab('alerts');
        setScreenStack([newScreen]);
        break;
      case 'alertDetail':
        newScreen = { type: 'alertDetail', alert: data };
        break;
      case 'history':
        newScreen = { type: 'history', deviceId: data?.deviceId };
        break;
      case 'reports':
        newScreen = { type: 'reports' };
        break;
      case 'more':
        newScreen = { type: 'more' };
        setActiveTab('more');
        setScreenStack([newScreen]);
        break;
      case 'deviceDetail':
        newScreen = { type: 'deviceDetail', device: data };
        break;
      case 'roomDevices':
        newScreen = {
          type: 'roomDevices',
          roomId: data.roomId,
          roomName: data.roomName,
        };
        break;
      case 'addDevice':
        newScreen = {
          type: 'addDevice',
          roomId: data.roomId,
          roomName: data.roomName,
        };
        break;
      case 'editDevice':
        newScreen = {
          type: 'editDevice',
          device: data.device,
          roomName: data.roomName,
        };
        break;
      case 'deleteDeviceConfirm':
        newScreen = {
          type: 'deleteDeviceConfirm',
          device: data.device,
          roomName: data.roomName,
        };
        break;
      case 'manageUsers':
        newScreen = { type: 'manageUsers' };
        break;
      case 'roomPermissions':
        newScreen = { type: 'roomPermissions' };
        break;
      case 'manageDevices':
        newScreen = { type: 'manageDevices' };
        break;
      default:
        return;
    }

    setScreenStack((prev) => [...prev, newScreen]);
  };

  const handleBack = () => {
    if (screenStack.length > 1) {
      setScreenStack((prev) => prev.slice(0, -1));
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        setScreenStack([{ type: 'home' }]);
        break;
      case 'areas':
        setScreenStack([{ type: 'areas' }]);
        break;
      case 'control':
        setScreenStack([{ type: 'control' }]);
        break;
      case 'schedule':
        setScreenStack([{ type: 'schedule' }]);
        break;
      case 'alerts':
        setScreenStack([{ type: 'alerts' }]);
        break;
      case 'more':
        setScreenStack([{ type: 'more' }]);
        break;
    }
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setAuthScreen({ type: 'login' });
    setScreenStack([{ type: 'home' }]);
  };

  const handleAuthNavigate = (screen: string) => {
    switch (screen) {
      case 'register':
        setAuthScreen({ type: 'register' });
        break;
      case 'forgotPassword':
        setAuthScreen({ type: 'forgotPassword' });
        break;
      case 'login':
        setAuthScreen({ type: 'login' });
        break;
    }
  };

  // Show splash screen
  if (authScreen.type === 'splash') {
    return (
      <SplashScreen onComplete={() => setAuthScreen({ type: 'login' })} />
    );
  }

  // Show auth screens if not logged in
  if (!isLoggedIn || !currentUser) {
    if (authScreen.type === 'register') {
      return (
        <RegisterScreen
          onBack={() => setAuthScreen({ type: 'login' })}
          onRegisterSuccess={() => setAuthScreen({ type: 'login' })}
        />
      );
    }

    if (authScreen.type === 'forgotPassword') {
      return (
        <ForgotPasswordScreen onBack={() => setAuthScreen({ type: 'login' })} />
      );
    }

    return (
      <LoginScreen
        onLoginSuccess={() => setIsLoggedIn(true)}
        onNavigate={handleAuthNavigate}
      />
    );
  }

  // Determine if bottom nav should be shown
  const showBottomNav = [
    'home',
    'areas',
    'control',
    'schedule',
    'alerts',
    'more',
  ].includes(currentScreen.type);

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-gray-50 flex flex-col">
      {/* Screen Content */}
      <div className="flex-1 overflow-hidden">
        {currentScreen.type === 'home' && (
          <HomeScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'areas' && (
          <AreasScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'control' && (
          <ControlScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'schedule' && (
          <ScheduleScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'scheduleCreate' && (
          <ScheduleFormScreen
            deviceId={currentScreen.deviceId}
            onBack={handleBack}
          />
        )}
        {currentScreen.type === 'scheduleEdit' && (
          <ScheduleFormScreen
            schedule={currentScreen.schedule}
            onBack={handleBack}
          />
        )}
        {currentScreen.type === 'alerts' && (
          <AlertsScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'alertDetail' && (
          <AlertDetailScreen
            alert={currentScreen.alert}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen.type === 'history' && (
          <HistoryScreen
            deviceId={currentScreen.deviceId}
            onBack={screenStack.length > 1 ? handleBack : undefined}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen.type === 'reports' && (
          <ReportsScreen onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'more' && (
          <MoreScreen onNavigate={handleNavigate} onLogout={handleLogout} />
        )}
        {currentScreen.type === 'deviceDetail' && (
          <DeviceDetailScreen
            device={currentScreen.device}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen.type === 'roomDevices' && (
          <RoomDevicesScreen
            roomId={currentScreen.roomId}
            roomName={currentScreen.roomName}
            onBack={handleBack}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen.type === 'addDevice' && (
          <AddDeviceScreen
            roomId={currentScreen.roomId}
            roomName={currentScreen.roomName}
            onBack={handleBack}
          />
        )}
        {currentScreen.type === 'editDevice' && (
          <EditDeviceScreen
            device={currentScreen.device}
            roomName={currentScreen.roomName}
            onBack={handleBack}
          />
        )}
        {currentScreen.type === 'deleteDeviceConfirm' && (
          <DeleteDeviceConfirmScreen
            device={currentScreen.device}
            roomName={currentScreen.roomName}
            onBack={handleBack}
            onConfirm={() => {
              // Go back twice: once to RoomDevices, then update stack
              handleBack();
            }}
          />
        )}
        {currentScreen.type === 'manageUsers' && (
          <AdminManageUsersScreen onBack={handleBack} onNavigate={handleNavigate} />
        )}
        {currentScreen.type === 'roomPermissions' && (
          <RoomPermissionsScreen
            onBack={handleBack}
          />
        )}
        {currentScreen.type === 'manageDevices' && (
          <AdminManageDevicesScreen onBack={handleBack} />
        )}
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
      <Toaster />
    </AppProvider>
  );
}