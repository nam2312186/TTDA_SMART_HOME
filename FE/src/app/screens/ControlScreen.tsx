import React, { useState } from 'react';
import { Lightbulb, Fan, ChevronDown, Zap, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { useApp } from '../context/AppContext';

interface ControlScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const ControlScreen: React.FC<ControlScreenProps> = ({ onNavigate }) => {
  const { devices, rooms, setBrightness, setFanSpeed } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'light' | 'fan'>('all');
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const actuators = devices.filter(d => d.type === 'actuator' && (d.subType === 'light' || d.subType === 'fan'));
  const lights = actuators.filter(d => d.subType === 'light');
  const fans   = actuators.filter(d => d.subType === 'fan');

  const filteredDevices =
    filterType === 'all'   ? actuators :
    filterType === 'light' ? lights    : fans;

  const sensorsCount = devices.filter(d => d.type === 'sensor').length;

  const statsConfig = [
    {
      icon: Lightbulb,
      label: 'Lights On',
      count: lights.filter(d => d.isOn).length,
      total: lights.length,
      gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
      color: '#f59e0b',
    },
    {
      icon: Fan,
      label: 'Fans On',
      count: fans.filter(d => d.isOn).length,
      total: fans.length,
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      color: '#6366f1',
    },
  ];

  return (
    <div className="h-full overflow-y-auto pb-20" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div
        className="text-white p-5 pb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 60%, #6366f1 100%)' }}
      >
        <div className="absolute -top-8 -right-10 w-36 h-36 rounded-full opacity-20"
          style={{ background: 'rgba(165,180,252,0.4)' }} />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Device Control</h1>
          <p className="text-indigo-200 text-sm mt-0.5">Lights & Fans</p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {sensorsCount > 0 && (
          <div
            className="rounded-2xl p-3 flex items-center gap-2.5"
            style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#6366f1' }}>
              <Zap className="w-4 h-4 text-white" />
            </span>
            <p className="text-xs font-medium" style={{ color: '#4338ca' }}>
              {actuators.length} controllable · {sensorsCount} sensor(s) monitored with smart auto rules
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {statsConfig.map(({ icon: Icon, label, count, total, gradient, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center"
              style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: gradient }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold" style={{ color }}>{count}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
              {total > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / total) * 100}%`, background: gradient }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {([
            { key: 'all',   label: 'All',    icon: null, count: actuators.length },
            { key: 'light', label: 'Lights', icon: Lightbulb, count: lights.length },
            { key: 'fan',   label: 'Fans',   icon: Fan,       count: fans.length },
          ] as const).map(({ key, label, icon: Icon, count }) => {
            const isActive = filterType === key;
            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={
                  isActive
                    ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: 'var(--shadow-glow)' }
                    : { background: '#fff', color: '#6b7280', border: '1px solid var(--border)' }
                }
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={isActive ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: '#f1f0f9', color: '#6366f1' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Device List */}
        <div className="space-y-3">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Fan className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No devices found</p>
            </div>
          ) : (
            filteredDevices.map((device, idx) => {
              const room = rooms.find(r => r.id === device.roomId);
              const isExpanded = expandedDeviceId === device.id;
              const isLight = device.subType === 'light';
              const isFan   = device.subType === 'fan';
              // device.brightness now stores 0-100 directly
              const speedPct = Math.max(0, Math.min(100, device.brightness || 0));

              const Icon = isLight ? Lightbulb : Fan;
              const grad = isLight
                ? (device.isOn ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#e5e7eb,#f3f4f6)')
                : (device.isOn ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#e5e7eb,#f3f4f6)');
              const accentColor = isLight ? '#f59e0b' : '#6366f1';

              const handleSlider = (val: number) => {
                // Ensure slider value is clamped to 0-100%
                const clamped = Math.max(0, Math.min(100, Math.round(val)));
                if (isLight) setBrightness(device.id, clamped);
                else         setFanSpeed(device.id, clamped);
              };

              return (
                <div
                  key={device.id}
                  className={`rounded-2xl overflow-hidden animate-float-up stagger-${Math.min(idx + 1, 6)}`}
                  style={{ background: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: grad }}
                      >
                        <Icon className={`w-5 h-5 text-white ${isFan && device.isOn ? 'animate-spin' : ''}`}
                          style={isFan && device.isOn ? { animationDuration: '1.5s' } : {}} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{device.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{room?.name}</span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={device.isOn ? { background: '#ecfdf5', color: '#10b981' } : { background: '#f1f5f9', color: '#64748b' }}
                          >
                            {device.isOn ? '● On' : '○ Off'}
                          </span>
                          {device.isOn && speedPct > 0 && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${accentColor}18`, color: accentColor }}>
                              {speedPct}%{isFan && <Wind className="inline w-2.5 h-2.5 ml-0.5" />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <button
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100"
                        onClick={e => { e.stopPropagation(); setExpandedDeviceId(isExpanded ? null : device.id); }}
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {/* ── Expanded slider panel ── */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold text-gray-700">
                            {isLight ? 'Brightness' : 'Fan Speed'}
                          </label>
                          <span
                            className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: `${accentColor}18`, color: accentColor }}
                          >
                            {speedPct}%
                          </span>
                        </div>

                        <Slider
                          value={[speedPct]}
                          onValueChange={v => handleSlider(v[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />

                        {/* Preset buttons */}
                        <div className="flex gap-2">
                          {[
                            { label: 'Off',  val: 0   },
                            { label: '25%',  val: 25  },
                            { label: '50%',  val: 50  },
                            { label: '75%',  val: 75  },
                            { label: 'Max',  val: 100 },
                          ].map(({ label, val }) => (
                            <button
                              key={label}
                              onClick={e => { e.stopPropagation(); handleSlider(val); }}
                              className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                              style={{
                                background: speedPct === val ? accentColor : '#f1f0f9',
                                color:      speedPct === val ? '#fff'       : '#4f46e5',
                                border:     speedPct === val ? 'none'       : '1px solid #c7d2fe',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>


                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
