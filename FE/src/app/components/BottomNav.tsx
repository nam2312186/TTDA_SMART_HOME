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
  alertBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  alertBadgeCount = 0,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'areas' as TabType, label: 'Areas', icon: Grid3x3 },
    { id: 'control' as TabType, label: 'Control', icon: Sliders },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'alerts' as TabType, label: 'Alerts', icon: Bell },
    { id: 'more' as TabType, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 safe-area-bottom"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(79,70,229,0.1)',
        boxShadow: '0 -4px 24px rgba(79,70,229,0.08)',
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showAlertBadge = tab.id === 'alerts' && alertBadgeCount > 0;
          const badgeLabel = alertBadgeCount > 99 ? '99+' : String(alertBadgeCount);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all"
              style={{ position: 'relative' }}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span
                  className="absolute top-2 w-8 h-1 rounded-full"
                  style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}
                />
              )}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  position: 'relative',
                  ...(isActive
                    ? { background: 'var(--gradient-brand)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }
                    : {}),
                }}
              >
                <Icon
                  className={`w-4 h-4 transition-all ${isActive ? 'text-white' : 'text-gray-400'}`}
                />
                {showAlertBadge && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)', boxShadow: '0 2px 8px rgba(239,68,68,0.45)' }}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
              <span
                className="text-xs font-semibold transition-all"
                style={{ color: isActive ? '#4f46e5' : '#9ca3af' }}
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
