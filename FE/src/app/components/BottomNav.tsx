import React from 'react';
import {
  Home,
  Grid3x3,
  Sliders,
  Calendar,
  Bell,
  MoreHorizontal,
} from 'lucide-react';

export type TabType = 'home' | 'areas' | 'control' | 'schedule' | 'alerts' | 'more';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'areas' as TabType, label: 'Areas', icon: Grid3x3 },
    { id: 'control' as TabType, label: 'Control', icon: Sliders },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'alerts' as TabType, label: 'Alerts', icon: Bell },
    { id: 'more' as TabType, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
