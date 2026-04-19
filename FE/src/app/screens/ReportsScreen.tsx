import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Thermometer, Droplets, AlertTriangle, Activity, Clock,
  ArrowLeft, Download, TrendingUp, TrendingDown, Minus,
  Zap, BarChart2, Cpu, Wind,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ComposedChart, Scatter,
  ScatterChart, ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { sensorDataApi } from '../services/api';
import { toast } from '../components/InAppToast';

interface ReportsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

// ─── Dark Tooltip ──────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        background: 'rgba(15,14,26,0.93)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        minWidth: 120,
      }}
    >
      {label && <p className="font-semibold mb-1.5 text-indigo-300">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold ml-auto pl-2">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatBadge = ({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color: string }) => (
  <div className="flex flex-col items-center justify-center rounded-xl p-2.5 text-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
    <div className="text-lg font-bold leading-tight" style={{ color }}>{value}{unit && <span className="text-xs ml-0.5 font-medium">{unit}</span>}</div>
    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{label}</div>
  </div>
);

// ─── Trend Arrow ───────────────────────────────────────────────────────────────
const Trend = ({ value }: { value: number }) => {
  if (value > 0.1) return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (value < -0.1) return <TrendingDown className="w-3.5 h-3.5 text-blue-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
};

// ─── aggregateByMinute helper ──────────────────────────────────────────────────
function aggregateByMinute(rows: any[]): Array<{ minute: string; avg: number; min: number; max: number; count: number }> {
  const map = new Map<string, { sum: number; min: number; max: number; count: number; minute: string; sort: number }>();
  rows.forEach((r) => {
    const dt = new Date(r.recorded_at || r.timestamp || r.created_at);
    if (isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}-${dt.getMinutes()}`;
    const minute = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    const v = parseFloat(r.value);
    if (!isFinite(v)) return;
    const existing = map.get(key);
    if (existing) {
      existing.sum += v; existing.count++; existing.min = Math.min(existing.min, v); existing.max = Math.max(existing.max, v);
    } else {
      map.set(key, { sum: v, count: 1, min: v, max: v, minute, sort: dt.getTime() });
    }
  });
  return Array.from(map.values())
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({
      minute: s.minute,
      avg: parseFloat((s.sum / s.count).toFixed(2)),
      min: parseFloat(s.min.toFixed(2)),
      max: parseFloat(s.max.toFixed(2)),
      count: s.count,
    }));
}

// ─── aggregateByHour helper ────────────────────────────────────────────────────
function aggregateByHour(rows: any[]): Array<{ hour: string; avg: number }> {
  const map = new Map<number, { sum: number; count: number }>();
  rows.forEach((r) => {
    const dt = new Date(r.recorded_at || r.timestamp || r.created_at);
    if (isNaN(dt.getTime())) return;
    const h = dt.getHours();
    const v = parseFloat(r.value);
    if (!isFinite(v)) return;
    const e = map.get(h);
    if (e) { e.sum += v; e.count++; } else { map.set(h, { sum: v, count: 1 }); }
  });
  return Array.from({ length: 24 }, (_, h) => {
    const e = map.get(h);
    return { hour: `${String(h).padStart(2, '0')}h`, avg: e ? parseFloat((e.sum / e.count).toFixed(2)) : 0 };
  });
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ onNavigate }) => {
  const { devices, alerts, historyLogs, schedules, floors, rooms } = useApp();

  // ─── IoT sensor data state ────────────────────────────────────────────────
  const [tempRows, setTempRows] = useState<any[]>([]);
  const [humRows, setHumRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tempSensor = devices.find(d => d.type === 'sensor' && d.subType === 'temperature');
    const humSensor  = devices.find(d => d.type === 'sensor' && d.subType === 'humidity');
    const fetches: Promise<void>[] = [];

    if (tempSensor) {
      fetches.push(
        sensorDataApi.byDevice(Number(tempSensor.id), { order: 'asc', limit: 500 })
          .then(r => setTempRows(Array.isArray(r) ? r : []))
          .catch(() => {})
      );
    }
    if (humSensor) {
      fetches.push(
        sensorDataApi.byDevice(Number(humSensor.id), { order: 'asc', limit: 500 })
          .then(r => setHumRows(Array.isArray(r) ? r : []))
          .catch(() => {})
      );
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [devices]);

  // ─── Derived analytics ────────────────────────────────────────────────────
  const tempByMinute = useMemo(() => aggregateByMinute(tempRows), [tempRows]);
  const humByMinute  = useMemo(() => aggregateByMinute(humRows),  [humRows]);
  const tempByHour = useMemo(() => aggregateByHour(tempRows), [tempRows]);
  const humByHour  = useMemo(() => aggregateByHour(humRows),  [humRows]);

  // Merge temp + hum by day for combo chart
  const comboData = useMemo(() => {
    const tempMap = new Map(tempByMinute.map(r => [r.minute, r]));
    const humMap  = new Map(humByMinute.map(r => [r.minute, r]));
    const allMinutes = Array.from(new Set([...tempMap.keys(), ...humMap.keys()]));
    return allMinutes.map(minute => ({
      minute,
      temp: tempMap.get(minute)?.avg ?? null,
      hum:  humMap.get(minute)?.avg ?? null,
      tempMin: tempMap.get(minute)?.min ?? null,
      tempMax: tempMap.get(minute)?.max ?? null,
    }));
  }, [tempByMinute, humByMinute]);

  // Scatter: temp vs hum for correlation
  const scatterData = useMemo(() => {
    const tempMap = new Map(tempByMinute.map(r => [r.minute, r.avg]));
    return humByMinute
      .filter(h => tempMap.has(h.minute))
      .map(h => ({ hum: h.avg, temp: tempMap.get(h.minute)!, minute: h.minute }));
  }, [tempByMinute, humByMinute]);

  // Stats
  const tempVals = tempRows.map(r => parseFloat(r.value)).filter(isFinite);
  const humVals  = humRows.map(r => parseFloat(r.value)).filter(isFinite);

  const stat = (vals: number[]) => {
    if (!vals.length) return { avg: 0, min: 0, max: 0, std: 0, last: 0, trend: 0 };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length);
    // trend: compare last 10% vs first 10%
    const chunk = Math.max(1, Math.floor(vals.length * 0.1));
    const early = vals.slice(0, chunk).reduce((a, b) => a + b, 0) / chunk;
    const late  = vals.slice(-chunk).reduce((a, b) => a + b, 0) / chunk;
    return { avg: parseFloat(avg.toFixed(2)), min: parseFloat(sorted[0].toFixed(2)), max: parseFloat(sorted[sorted.length - 1].toFixed(2)), std: parseFloat(std.toFixed(2)), last: parseFloat(vals[vals.length - 1].toFixed(2)), trend: parseFloat((late - early).toFixed(2)) };
  };

  const tempStat = useMemo(() => stat(tempVals), [tempRows]);
  const humStat  = useMemo(() => stat(humVals),  [humRows]);

  // Activity data (7 days)
  const activityData = useMemo(() => {
    const days: { date: string; events: number; manual: number; scheduled: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const dayLogs = historyLogs.filter(l => { const d = new Date(l.timestamp); return d >= date && d < next; });
      days.push({ date: date.toLocaleDateString('en-US', { weekday: 'short' }), events: dayLogs.length, manual: dayLogs.filter(l => l.eventType === 'manual_control').length, scheduled: dayLogs.filter(l => l.eventType === 'scheduled_action').length });
    }
    return days;
  }, [historyLogs]);

  // Device usage
  const devicesOn = devices.filter(d => d.isOn).length;
  const alertsActive = alerts.filter(a => !a.cleared).length;

  // KPIs
  const kpis = [
    { icon: Cpu,           label: 'Devices Active', value: `${devicesOn}/${devices.length}`,   color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { icon: AlertTriangle, label: 'Open Alerts',    value: alertsActive,                        color: '#ef4444', gradient: 'linear-gradient(135deg,#ef4444,#f97316)' },
    { icon: Clock,         label: 'Schedules On',   value: `${schedules.filter(s => s.enabled).length}/${schedules.length}`, color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
    { icon: Zap,           label: 'IoT Records',    value: tempRows.length + humRows.length,    color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  ];

  // Export PDF handler
  const handleExportPDF = async () => {
    const el = reportRef.current;
    if (!el) return;

    // Scroll the scrollable parent to top so html2canvas captures from top
    const scrollContainer = el.closest('[class*="overflow-y"]') as HTMLElement | null;
    if (scrollContainer) scrollContainer.scrollTop = 0;

    setExporting(true);
    toast.info('Generating PDF...');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Wait a tick for layout to settle
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,   // avoid SVG clip issues
        backgroundColor: '#f8fafc',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: el.scrollWidth,
        width: el.offsetWidth,
        height: el.scrollHeight,
        logging: false,
        onclone: (cloned) => {
          // Resolve CSS custom properties in the cloned doc
          const style = cloned.createElement('style');
          style.textContent = `
            * { --background: #f8fafc; --border: #e2e8f0; --gradient-brand: linear-gradient(135deg,#6366f1,#8b5cf6); }
          `;
          cloned.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // Add header metadata
      pdf.setFillColor(30, 27, 75);
      pdf.rect(0, 0, pageW, 14, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('Smart Home — Reports & Analytics', 6, 9);
      pdf.text(new Date().toLocaleString(), pageW - 6, 9, { align: 'right' });

      // Paginate the image
      const contentAreaH = pageH - 16; // leave 14mm for header + 2mm gap
      let yOffset = 0;
      let page = 0;

      while (yOffset < imgH) {
        if (page > 0) pdf.addPage();
        // clip portion of canvas for this page
        const srcY = (yOffset / imgH) * canvas.height;
        const srcH = Math.min((contentAreaH / imgH) * canvas.height, canvas.height - srcY);

        // draw only the slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, -srcY);
        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceH = (srcH * imgW) / canvas.width;
        pdf.addImage(sliceData, 'PNG', 0, 14, imgW, sliceH);
        yOffset += contentAreaH;
        page++;
      }

      pdf.save(`smart-home-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      console.error('[PDF Export Error]', err?.message || err);
      // Fallback: use browser print dialog which supports "Save as PDF"
      toast.info('Trying print dialog — choose "Save as PDF".');
      setTimeout(() => window.print(), 500);
    } finally {
      setExporting(false);
    }
  };

  // Export JSON handler (keep as fallback)
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), tempStat, humStat, comboData, activityData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `smart-home-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto pb-20" style={{ background: 'var(--background)' }}>
      {/* ── Scrollable content captured for PDF ── */}
      <div ref={reportRef}>
      {/* ── Header ── */}
      <div className="text-white p-5 pb-10 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)' }}>
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'rgba(165,180,252,0.4)' }} />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-15" style={{ background: 'rgba(167,139,250,0.3)' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-1.5 text-indigo-200 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Back</span>
            </button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="rounded-xl text-xs font-semibold h-8 px-3"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
            >
              {exporting
                ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                : <Download className="w-3.5 h-3.5 mr-1.5" />}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-indigo-300 text-sm mt-0.5">
              {tempRows.length + humRows.length > 0
                ? `${tempRows.length + humRows.length} IoT records analysed`
                : 'System-wide insights & trends'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-5">

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(({ icon: Icon, label, value, color, gradient }, i) => (
            <div key={label} className={`rounded-2xl p-4 bg-white shadow-sm animate-float-up stagger-${i + 1}`} style={{ border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: gradient }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#0f0e1a' }}>{value}</div>
              <div className="text-xs font-semibold mt-1" style={{ color }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Sensor Stats Cards ── */}
        {(tempRows.length > 0 || humRows.length > 0) && (
          <div className="grid grid-cols-1 gap-4">
            {/* Temperature Scorecard */}
            {tempRows.length > 0 && (
              <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
                      <Thermometer className="w-4 h-4 text-white" />
                    </span>
                    Temperature Analysis
                    <span className="ml-auto text-xs font-normal text-slate-400">{tempRows.length} samples</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <StatBadge label="Average" value={tempStat.avg} unit="°C" color="#f97316" />
                    <StatBadge label="Min"     value={tempStat.min} unit="°C" color="#3b82f6" />
                    <StatBadge label="Max"     value={tempStat.max} unit="°C" color="#ef4444" />
                    <StatBadge label="Std Dev" value={tempStat.std} unit="" color="#8b5cf6" />
                  </div>
                  {/* Trend line: min/max range + avg */}
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Per-minute Min / Avg / Max</p>
                  <ResponsiveContainer width="100%" height={160} style={{ overflow: 'visible' }}>
                    <ComposedChart data={tempByMinute} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rngTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="minute" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip content={<DarkTooltip />} wrapperStyle={{ zIndex: 100 }} />
                      <Area type="monotone" dataKey="max" stroke="transparent" fill="url(#rngTemp)" name="Max °C" stackId="range" />
                      <Area type="monotone" dataKey="min" stroke="transparent" fill="#ffffff" name="Min °C" stackId="range" />
                      <Line type="monotone" dataKey="avg" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2.5, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Avg °C" connectNulls />
                      <Line type="monotone" dataKey="min" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Min °C" connectNulls />
                      <Line type="monotone" dataKey="max" stroke="#fca5a5" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Max °C" connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Trend value={tempStat.trend} />
                    <span>Trend: <span className="font-semibold" style={{ color: tempStat.trend > 0 ? '#ef4444' : tempStat.trend < 0 ? '#3b82f6' : '#6b7280' }}>{tempStat.trend > 0 ? '+' : ''}{tempStat.trend}°C</span> over recording period</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Humidity Scorecard */}
            {humRows.length > 0 && (
              <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)' }}>
                      <Droplets className="w-4 h-4 text-white" />
                    </span>
                    Humidity Analysis
                    <span className="ml-auto text-xs font-normal text-slate-400">{humRows.length} samples</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <StatBadge label="Average" value={humStat.avg} unit="%" color="#3b82f6" />
                    <StatBadge label="Min"     value={humStat.min} unit="%" color="#06b6d4" />
                    <StatBadge label="Max"     value={humStat.max} unit="%" color="#8b5cf6" />
                    <StatBadge label="Std Dev" value={humStat.std} unit="" color="#6366f1" />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Per-minute Min / Avg / Max</p>
                  <ResponsiveContainer width="100%" height={160} style={{ overflow: 'visible' }}>
                    <ComposedChart data={humByMinute} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rngHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="minute" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip content={<DarkTooltip />} wrapperStyle={{ zIndex: 100 }} />
                      <Area type="monotone" dataKey="max" stroke="transparent" fill="url(#rngHum)" name="Max %" stackId="r" />
                      <Area type="monotone" dataKey="min" stroke="transparent" fill="#ffffff" name="Min %" stackId="r" />
                      <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Avg %" connectNulls />
                      <Line type="monotone" dataKey="min" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Min %" connectNulls />
                      <Line type="monotone" dataKey="max" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Max %" connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Trend value={humStat.trend} />
                    <span>Trend: <span className="font-semibold" style={{ color: humStat.trend > 0 ? '#3b82f6' : humStat.trend < 0 ? '#f97316' : '#6b7280' }}>{humStat.trend > 0 ? '+' : ''}{humStat.trend}%</span> over recording period</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Dual-Axis Combo: Temp + Humidity over time ── */}
        {comboData.length > 0 && (
          <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#f97316,#3b82f6)' }} />
                Temperature vs Humidity — Per-minute
              </CardTitle>
            </CardHeader>
            <CardContent style={{ overflow: 'visible' }}>
              <ResponsiveContainer width="100%" height={220} style={{ overflow: 'visible' }}>
                <ComposedChart data={comboData} margin={{ top: 8, right: 32, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aHum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="minute" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={Math.floor(comboData.length / 6)} />
                  <YAxis yAxisId="t" tick={{ fontSize: 9, fill: '#f97316' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `${v}°`} />
                  <YAxis yAxisId="h" orientation="right" tick={{ fontSize: 9, fill: '#3b82f6' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<DarkTooltip />} wrapperStyle={{ zIndex: 100 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area yAxisId="t" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fill="url(#aTemp)" name="Temp °C" dot={false} connectNulls activeDot={{ r: 4 }} />
                  <Line yAxisId="h" type="monotone" dataKey="hum"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity %" connectNulls activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Hourly Pattern Heatmap (bar) ── */}
        {(tempByHour.some(h => h.avg > 0) || humByHour.some(h => h.avg > 0)) && (
          <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#8b5cf6,#06b6d4)' }} />
                Hourly Pattern (Avg by Hour)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-slate-400 mb-2">Temperature by hour of day</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={tempByHour} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="avg" name="Avg Temp °C" radius={[3, 3, 0, 0]}>
                    {tempByHour.map((entry, i) => (
                      <Cell key={i} fill={entry.avg > (tempStat.avg + tempStat.std * 0.5) ? '#ef4444' : entry.avg < (tempStat.avg - tempStat.std * 0.5) ? '#3b82f6' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400 mb-2 mt-3">Humidity by hour of day</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={humByHour} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="avg" name="Avg Humidity %" radius={[3, 3, 0, 0]}>
                    {humByHour.map((entry, i) => (
                      <Cell key={i} fill={entry.avg > (humStat.avg + humStat.std * 0.5) ? '#8b5cf6' : entry.avg < (humStat.avg - humStat.std * 0.5) ? '#06b6d4' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-400 mt-2">
                Color: <span className="text-red-400 font-medium">Red/Purple</span> = above avg · <span className="text-blue-400 font-medium">Blue/Cyan</span> = below avg
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Correlation Scatter ── */}
        {scatterData.length >= 3 && (
          <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#10b981,#6366f1)' }} />
                Temp vs Humidity Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-400 mb-3">Each dot = 1 minute bucket. Pattern shows relationship between temperature &amp; humidity.</p>
              <ResponsiveContainer width="100%" height={200} style={{ overflow: 'visible' }}>
                <ScatterChart margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="hum" name="Humidity" unit="%" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'Humidity %', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis type="number" dataKey="temp" name="Temp" unit="°C" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl px-3 py-2 text-xs shadow-xl" style={{ background: 'rgba(15,14,26,0.93)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="font-semibold text-indigo-300 mb-1">{d.minute}</p>
                        <p>Temp: <strong>{d.temp}°C</strong></p>
                        <p>Hum: <strong>{d.hum}%</strong></p>
                      </div>
                    );
                  }} />
                  <ReferenceLine y={tempStat.avg} stroke="#f97316" strokeDasharray="4 2" label={{ value: 'AvgT', fontSize: 8, fill: '#f97316' }} />
                  <ReferenceLine x={humStat.avg}  stroke="#3b82f6" strokeDasharray="4 2" label={{ value: 'AvgH', fontSize: 8, fill: '#3b82f6' }} />
                  <Scatter data={scatterData} fill="#6366f1" opacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Activity Last 7 Days ── */}
        <Card className="shadow-sm animate-float-up" style={{ border: '1px solid var(--border)', animationDelay: '0.1s' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#10b981,#0ea5e9)' }} />
              Activity — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="aM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="aS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0effe" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="manual"    stroke="#6366f1" strokeWidth={2.5} fill="url(#aM)" name="Manual"    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="scheduled" stroke="#10b981" strokeWidth={2.5} fill="url(#aS)" name="Scheduled" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── System Summary ── */}
        <Card className="shadow-sm" style={{ border: '1px solid var(--border)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-5 rounded-full" style={{ background: 'var(--gradient-brand)' }} />
              System Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: 'Total Devices',    value: devices.length,                           color: '#6366f1' },
              { label: 'Devices Online',   value: devices.filter(d => d.isOn).length,       color: '#10b981' },
              { label: 'Total Alerts',     value: alerts.length,                            color: '#f97316' },
              { label: 'Active Schedules', value: schedules.filter(s => s.enabled).length,  color: '#8b5cf6' },
              { label: 'Total Events',     value: historyLogs.length,                       color: '#0ea5e9' },
              { label: 'Temp Records',     value: tempRows.length,                          color: '#ef4444' },
              { label: 'Humidity Records', value: humRows.length,                           color: '#3b82f6' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ color, background: `${color}15` }}>{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
            <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span className="text-sm">Loading sensor history...</span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};