import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─── Toast styles ─────────────────────────────────────────────────────────────
const STYLES: Record<ToastType, { bg: string; border: string; icon: typeof CheckCircle; color: string }> = {
  success: { bg: 'rgba(16,185,129,0.95)', border: '#059669', icon: CheckCircle, color: '#fff' },
  error:   { bg: 'rgba(239,68,68,0.95)',  border: '#dc2626', icon: XCircle,      color: '#fff' },
  info:    { bg: 'rgba(59,130,246,0.95)', border: '#2563eb', icon: Info,          color: '#fff' },
  warning: { bg: 'rgba(245,158,11,0.95)', border: '#d97706', icon: AlertTriangle, color: '#fff' },
};

// ─── Single toast item ────────────────────────────────────────────────────────
const ToastEl: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const s = STYLES[item.type];
  const Icon = s.icon;

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 3.5s
    const t2 = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(item.id), 350); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(12px)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        maxWidth: 320,
        width: '100%',
      }}
    >
      <Icon style={{ width: 18, height: 18, color: '#fff', flexShrink: 0 }} />
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
        {item.message}
      </span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(item.id), 350); }}
        style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X style={{ width: 15, height: 15 }} />
      </button>
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────
const ToastContainer: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,      // above bottom nav
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(item => (
        <div key={item.id} style={{ pointerEvents: 'all' }}>
          <ToastEl item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

// ─── Provider ────────────────────────────────────────────────────────────────
export const InAppToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { id, type, message }]); // max 3 visible
  }, []);

  const value: ToastContextValue = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error',   msg),
    info:    (msg) => add('info',    msg),
    warning: (msg) => add('warning', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {/* Wrap in relative container so absolute toast stays inside */}
      <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
};

// ─── Drop-in sonner compatiblity shim ────────────────────────────────────────
// Screens can import { toast } from this file instead of 'sonner'
let _ctx: ToastContextValue = { success: () => {}, error: () => {}, info: () => {}, warning: () => {} };

export const ToastBridge: React.FC = () => {
  const ctx = useToast();
  useEffect(() => { _ctx = ctx; }, [ctx]);
  return null;
};

export const toast = {
  success: (msg: string) => _ctx.success(msg),
  error:   (msg: string) => _ctx.error(msg),
  info:    (msg: string) => _ctx.info(msg),
  warning: (msg: string) => _ctx.warning(msg),
};
