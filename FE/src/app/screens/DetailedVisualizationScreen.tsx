import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Building2, Layers3, Cpu, CalendarClock, Thermometer, Droplets, SunMedium, TrendingUp, AlertCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { sensorDataApi } from '../services/api';
import { Device } from '../types';

type MetricKey = 'temperature' | 'humidity' | 'light';
type PeriodKey = 'day' | 'month' | 'year';
type CompareMode = 'device' | 'room' | 'floor';

interface DetailedVisualizationScreenProps {
  onBack: () => void;
}

interface CompareSeries {
  id: string;
  name: string;
  subtitle: string;
  points: Array<{ bucket: string; value: number }>;
}

const METRIC_LABEL: Record<MetricKey, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  light: 'Light Intensity',
};

const METRIC_UNIT: Record<MetricKey, string> = {
  temperature: '°C',
  humidity: '%',
  light: 'lux',
};

const METRIC_ICON: Record<MetricKey, typeof Thermometer> = {
  temperature: Thermometer,
  humidity: Droplets,
  light: SunMedium,
};

const LINE_COLORS = ['#f97316', '#2563eb', '#16a34a', '#9333ea', '#0d9488', '#dc2626', '#d97706', '#4f46e5'];

const parseTimestamp = (item: any): Date | null => {
  const raw = item?.timestamp || item?.created_at || item?.recorded_at || item?.time;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getValue = (item: any): number | null => {
  const raw = item?.value;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
};

const getPeriodStart = (period: PeriodKey): Date => {
  const now = new Date();
  if (period === 'day') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
};

const formatBucket = (date: Date, period: PeriodKey): string => {
  if (period === 'day') {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  }
  if (period === 'month') {
    return `${String(date.getDate()).padStart(2, '0')}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short' });
};

const getBucketKey = (date: Date, period: PeriodKey): string => {
  if (period === 'day') {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }
  if (period === 'month') {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
  return `${date.getFullYear()}-${date.getMonth()}`;
};

const buildBuckets = (period: PeriodKey): Array<{ key: string; label: string }> => {
  const now = new Date();
  if (period === 'day') {
    const list: Array<{ key: string; label: string }> = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const point = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
      list.push({ key: getBucketKey(point, period), label: formatBucket(point, period) });
    }
    return list;
  }

  if (period === 'month') {
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const list: Array<{ key: string; label: string }> = [];
    for (let day = 1; day <= totalDays; day += 1) {
      const point = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
      list.push({ key: getBucketKey(point, period), label: formatBucket(point, period) });
    }
    return list;
  }

  const list: Array<{ key: string; label: string }> = [];
  for (let month = 0; month < 12; month += 1) {
    const point = new Date(now.getFullYear(), month, 1, 0, 0, 0, 0);
    list.push({ key: getBucketKey(point, period), label: formatBucket(point, period) });
  }
  return list;
};

const aggregateSeries = (rows: any[], period: PeriodKey): Array<{ bucket: string; value: number }> => {
  const start = getPeriodStart(period).getTime();
  const bucketMap = new Map<string, { sum: number; count: number; label: string }>();

  rows.forEach((row) => {
    const timestamp = parseTimestamp(row);
    if (!timestamp) return;
    if (timestamp.getTime() < start) return;

    const value = getValue(row);
    if (value === null) return;

    const key = getBucketKey(timestamp, period);
    const existing = bucketMap.get(key);
    if (existing) {
      existing.sum += value;
      existing.count += 1;
      return;
    }

    bucketMap.set(key, {
      sum: value,
      count: 1,
      label: formatBucket(timestamp, period),
    });
  });

  return Array.from(bucketMap.entries())
    .map(([key, entry]) => ({
      key,
      bucket: entry.label,
      value: entry.sum / entry.count,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({ bucket: item.bucket, value: Number(item.value.toFixed(2)) }));
};

const computeAverage = (device: Device): number | null => {
  const historyValues = device.history?.map((item) => item.value).filter((value) => Number.isFinite(value)) || [];
  if (historyValues.length > 0) {
    const sum = historyValues.reduce((acc, value) => acc + value, 0);
    return sum / historyValues.length;
  }
  if (typeof device.currentValue === 'number' && Number.isFinite(device.currentValue)) {
    return device.currentValue;
  }
  return null;
};

export const DetailedVisualizationScreen: React.FC<DetailedVisualizationScreenProps> = ({ onBack }) => {
  const { floors, rooms, devices } = useApp();

  const [metric, setMetric] = useState<MetricKey>('temperature');
  const [period, setPeriod] = useState<PeriodKey>('day');
  const [compareMode, setCompareMode] = useState<CompareMode>('device');
  const [selectedFloorIds, setSelectedFloorIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [series, setSeries] = useState<CompareSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Guard: chỉ auto-select lần đầu khi metric/compareMode đổi, không chạy lại mỗi 5s
  const initDoneRef = useRef(false);

  const metricIcon = METRIC_ICON[metric];

  const metricDevices = useMemo(() => {
    return devices.filter((device) => device.type === 'sensor' && device.subType === metric);
  }, [devices, metric]);

  const roomById = useMemo(() => {
    return new Map(rooms.map((room) => [room.id, room]));
  }, [rooms]);

  const floorById = useMemo(() => {
    return new Map(floors.map((floor) => [floor.id, floor]));
  }, [floors]);

  const selectableRooms = useMemo(() => {
    const roomIds = new Set(metricDevices.map((device) => device.roomId));
    return rooms.filter((room) => roomIds.has(room.id));
  }, [metricDevices, rooms]);

  const selectableFloors = useMemo(() => {
    const roomIds = new Set(metricDevices.map((device) => device.roomId));
    const floorIds = new Set(
      rooms.filter((room) => roomIds.has(room.id)).map((room) => room.floorId)
    );
    return floors.filter((floor) => floorIds.has(floor.id));
  }, [floors, metricDevices, rooms]);

  const selectableDevices = useMemo(() => metricDevices, [metricDevices]);

  useEffect(() => {
    const validRoomIds = new Set(selectableRooms.map((room) => room.id));
    setSelectedRoomIds((prev) => prev.filter((id) => validRoomIds.has(id)));
  }, [selectableRooms]);

  useEffect(() => {
    const validFloorIds = new Set(selectableFloors.map((floor) => floor.id));
    setSelectedFloorIds((prev) => prev.filter((id) => validFloorIds.has(id)));
  }, [selectableFloors]);

  useEffect(() => {
    const validDeviceIds = new Set(selectableDevices.map((device) => device.id));
    setSelectedDeviceIds((prev) => prev.filter((id) => validDeviceIds.has(id)));
  }, [selectableDevices]);

  useEffect(() => {
    if (metricDevices.length === 0) {
      setSeries([]);
      initDoneRef.current = false; // reset khi metric thay đổi
      return;
    }

    // Chỉ auto-select lần đầu - không chạy lại khi AppContext refresh 5s
    if (compareMode === 'device' && !initDoneRef.current) {
      initDoneRef.current = true;
      setSelectedDeviceIds(metricDevices.map((device) => device.id));
    }
  }, [compareMode, metricDevices]);

  // Reset guard khi user đổi metric hoặc compareMode
  useEffect(() => {
    initDoneRef.current = false;
  }, [metric, compareMode]);

  const selectedDevices = useMemo(() => {
    if (compareMode === 'device') {
      if (selectedDeviceIds.length > 0) {
        return selectableDevices.filter((device) => selectedDeviceIds.includes(device.id));
      }
      return selectableDevices;
    }

    if (compareMode === 'room') {
      const roomIds = selectedRoomIds.length > 0
        ? new Set(selectedRoomIds)
        : new Set(selectableRooms.map((room) => room.id));
      return metricDevices.filter((device) => roomIds.has(device.roomId));
    }

    const floorIds = selectedFloorIds.length > 0
      ? new Set(selectedFloorIds)
      : new Set(selectableFloors.map((floor) => floor.id));
    return metricDevices.filter((device) => {
      const room = roomById.get(device.roomId);
      return room ? floorIds.has(room.floorId) : false;
    });
  }, [
    compareMode,
    metricDevices,
    roomById,
    selectableDevices,
    selectableFloors,
    selectableRooms,
    selectedDeviceIds,
    selectedFloorIds,
    selectedRoomIds,
  ]);

  // loadSeries dưới dạng useCallback để có thể gọi từ polling
  const loadSeries = useCallback(async (isMounted: { current: boolean }) => {
      if (selectedDevices.length === 0) {
        setSeries([]);
        return;
      }

      setLoading(true);
      const aggregatedByDeviceId = new Map<string, Array<{ bucket: string; value: number }>>();

      await Promise.all(selectedDevices.map(async (device) => {
        try {
          // Bước 1: Lấy data theo period được chọn
          let response = await sensorDataApi.byDevice(Number(device.id), { period, order: 'asc', limit: 500 });
          let rows = Array.isArray(response) ? response : [];

          // Bước 2: Nếu period=day có ít hơn 3 điểm, gộp thêm data từ month để cho chart có lịch sử
          if (period === 'day' && rows.length < 3) {
            const monthData = await sensorDataApi.byDevice(Number(device.id), { period: 'month', order: 'asc', limit: 500 });
            const monthRows = Array.isArray(monthData) ? monthData : [];
            // Gộp: (ưu tiên giữ data thật của hôm nay, thêm day-level bucket từ lịch sử)
            if (monthRows.length > 0) {
              // Kết hợp - show tât cả lịch sử trong month, bucket theo ngày
              rows = monthRows;
            }
          }

          // Bước 3: Nếu vẫn rỗng, lấy 300 bản ghi gần nhất không lọc
          if (rows.length === 0) {
            const fallback = await sensorDataApi.byDevice(Number(device.id), { order: 'desc', limit: 300 });
            rows = Array.isArray(fallback) ? fallback.reverse() : [];
          }

          // Nếu dùng month data cho day view, đổi period aggregate sang 'month' (theo ngày)
          const effectivePeriod = (period === 'day' && rows.length > 0 && rows.length >= 3) ? period : 
                                  (period === 'day' && rows.length > 0) ? 'month' : period;

          aggregatedByDeviceId.set(device.id, aggregateSeries(rows, effectivePeriod));
        } catch {
          aggregatedByDeviceId.set(device.id, []);
        }
      }));

      const combineByAverage = (list: Array<Array<{ bucket: string; value: number }>>) => {
        const bucketOrder = new Map(buildBuckets(period).map((bucket, index) => [bucket.label, index]));
        const map = new Map<string, { sum: number; count: number }>();

        list.forEach((points) => {
          points.forEach((point) => {
            const existing = map.get(point.bucket);
            if (existing) {
              existing.sum += point.value;
              existing.count += 1;
              return;
            }
            map.set(point.bucket, { sum: point.value, count: 1 });
          });
        });

        return Array.from(map.entries())
          .map(([bucket, value]) => ({
            bucket,
            value: Number((value.sum / value.count).toFixed(2)),
            order: bucketOrder.get(bucket) ?? Number.MAX_SAFE_INTEGER,
          }))
          .sort((left, right) => left.order - right.order)
          .map(({ bucket, value }) => ({ bucket, value }));
      };

      let nextSeries: CompareSeries[] = [];

      if (compareMode === 'device') {
        nextSeries = selectedDevices.map((device) => {
          const room = roomById.get(device.roomId);
          const floor = room ? floorById.get(room.floorId) : undefined;
          return {
            id: device.id,
            name: device.name,
            subtitle: `${room?.name || 'Unknown room'} • ${floor?.name || 'Unknown floor'}`,
            points: aggregatedByDeviceId.get(device.id) || [],
          };
        });
      } else if (compareMode === 'room') {
        const targetRooms = selectedRoomIds.length > 0
          ? selectableRooms.filter((room) => selectedRoomIds.includes(room.id))
          : selectableRooms;

        nextSeries = targetRooms.map((room) => {
          const roomDevices = selectedDevices.filter((device) => device.roomId === room.id);
          const floor = floorById.get(room.floorId);
          const merged = combineByAverage(roomDevices.map((device) => aggregatedByDeviceId.get(device.id) || []));
          return {
            id: room.id,
            name: room.name,
            subtitle: floor?.name || 'Unknown floor',
            points: merged,
          };
        });
      } else {
        const targetFloors = selectedFloorIds.length > 0
          ? selectableFloors.filter((floor) => selectedFloorIds.includes(floor.id))
          : selectableFloors;

        nextSeries = targetFloors.map((floor) => {
          const floorDevicePoints = selectedDevices
            .filter((device) => {
              const room = roomById.get(device.roomId);
              return room?.floorId === floor.id;
            })
            .map((device) => aggregatedByDeviceId.get(device.id) || []);

          return {
            id: floor.id,
            name: floor.name,
            subtitle: `${floorDevicePoints.length} device(s)`,
            points: combineByAverage(floorDevicePoints),
          };
        });
      }

      if (!isMounted.current) return;
      setSeries(nextSeries.sort((left, right) => left.name.localeCompare(right.name)));
      setLastUpdated(new Date());
      setLoading(false);
  }, [compareMode, floorById, period, roomById, selectableFloors, selectableRooms, selectedDevices, selectedFloorIds, selectedRoomIds]);

  // Effect chính: load khi selection/period thay đổi
  useEffect(() => {
    const ref = { current: true };
    loadSeries(ref);
    return () => { ref.current = false; };
  }, [loadSeries]);

  // Polling nhẹ mỗi 30s: chỉ refresh data, không reset UI/selection
  useEffect(() => {
    const ref = { current: true };
    const interval = setInterval(() => {
      if (!loading) loadSeries(ref);
    }, 30000);
    return () => {
      ref.current = false;
      clearInterval(interval);
    };
  }, [loadSeries, loading]);

  const chartData = useMemo(() => {
    const buckets = buildBuckets(period);
    return buckets.map((bucket) => {
      const entry: Record<string, string | number | null> = { bucket: bucket.label };
      series.forEach((seriesItem) => {
        const matchedPoint = seriesItem.points.find((point) => point.bucket === bucket.label);
        entry[seriesItem.id] = matchedPoint?.value ?? null;
      });
      return entry;
    });
  }, [period, series]);

  const homeAverage = useMemo(() => {
    const metricDeviceValues = metricDevices
      .map((device) => computeAverage(device))
      .filter((value): value is number => value !== null);

    if (metricDeviceValues.length === 0) return null;
    const sum = metricDeviceValues.reduce((acc, value) => acc + value, 0);
    return Number((sum / metricDeviceValues.length).toFixed(2));
  }, [metricDevices]);

  const toggleId = (ids: string[], id: string, setIds: (values: string[]) => void) => {
    if (ids.includes(id)) {
      setIds(ids.filter((item) => item !== id));
      return;
    }
    setIds([...ids, id]);
  };

  const selectAllCurrentMode = () => {
    if (compareMode === 'device') {
      setSelectedDeviceIds(selectableDevices.map((device) => device.id));
      return;
    }
    if (compareMode === 'room') {
      setSelectedRoomIds(selectableRooms.map((room) => room.id));
      return;
    }
    setSelectedFloorIds(selectableFloors.map((floor) => floor.id));
  };

  const clearCurrentModeSelection = () => {
    if (compareMode === 'device') {
      setSelectedDeviceIds([]);
      return;
    }
    if (compareMode === 'room') {
      setSelectedRoomIds([]);
      return;
    }
    setSelectedFloorIds([]);
  };

  return (
    <div className="h-full overflow-y-auto pb-20 bg-slate-50">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-right">
            <p className="text-base font-semibold text-slate-900">Detailed Visualization</p>
            <p className="text-xs text-slate-500">Compare by floor, room and device</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {React.createElement(metricIcon, { className: 'h-5 w-5 text-emerald-700' })}
                <p className="text-lg font-semibold text-slate-900">{METRIC_LABEL[metric]} overview</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Home average: {homeAverage !== null ? `${homeAverage}${METRIC_UNIT[metric]}` : 'No data'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['temperature', 'humidity', 'light'] as MetricKey[]).map((metricOption) => (
                <button
                  key={metricOption}
                  onClick={() => setMetric(metricOption)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    metric === metricOption
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {METRIC_LABEL[metricOption]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['day', 'month', 'year'] as PeriodKey[]).map((periodOption) => (
                <button
                  key={periodOption}
                  onClick={() => setPeriod(periodOption)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    period === periodOption
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {periodOption === 'day' ? 'Day (hour)' : periodOption === 'month' ? 'Month (day)' : 'Year (month)'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Compare mode (choose one)</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['device', 'room', 'floor'] as CompareMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCompareMode(mode)}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        compareMode === mode
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {mode === 'device' ? 'Device' : mode === 'room' ? 'Room' : 'Floor'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {compareMode === 'device' && <Cpu className="mr-1 inline h-3.5 w-3.5" />}
                    {compareMode === 'room' && <Layers3 className="mr-1 inline h-3.5 w-3.5" />}
                    {compareMode === 'floor' && <Building2 className="mr-1 inline h-3.5 w-3.5" />}
                    {compareMode === 'device' ? 'Devices' : compareMode === 'room' ? 'Rooms' : 'Floors'} (multi-select)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllCurrentMode} className="h-7 px-2 text-xs">
                      Select all
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearCurrentModeSelection} className="h-7 px-2 text-xs">
                      Clear
                    </Button>
                  </div>
                </div>

                {compareMode === 'device' && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {selectableDevices.map((device) => {
                      const room = roomById.get(device.roomId);
                      const floor = room ? floorById.get(room.floorId) : undefined;
                      const checked = selectedDeviceIds.includes(device.id);

                      return (
                        <button
                          key={device.id}
                          onClick={() => toggleId(selectedDeviceIds, device.id, setSelectedDeviceIds)}
                          className={`rounded-xl border p-3 text-left ${
                            checked
                              ? 'border-emerald-600 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{device.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{room?.name || 'Unknown room'} • {floor?.name || 'Unknown floor'}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {compareMode === 'room' && (
                  <div className="flex flex-wrap gap-2">
                    {selectableRooms.map((room) => {
                      const floor = floorById.get(room.floorId);
                      const checked = selectedRoomIds.includes(room.id);

                      return (
                        <button
                          key={room.id}
                          onClick={() => toggleId(selectedRoomIds, room.id, setSelectedRoomIds)}
                          className={`rounded-full border px-3 py-1.5 text-xs ${
                            checked
                              ? 'border-violet-600 bg-violet-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                          title={floor?.name || 'Unknown floor'}
                        >
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {compareMode === 'floor' && (
                  <div className="flex flex-wrap gap-2">
                    {selectableFloors.map((floor) => {
                      const checked = selectedFloorIds.includes(floor.id);
                      return (
                        <button
                          key={floor.id}
                          onClick={() => toggleId(selectedFloorIds, floor.id, setSelectedFloorIds)}
                          className={`rounded-full border px-3 py-1.5 text-xs ${
                            checked
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          {floor.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-slate-900">Comparison Chart</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <CalendarClock className="inline h-3.5 w-3.5" />
                  {period === 'day' ? 'By hour in current day' : period === 'month' ? 'By day in current month' : 'By month in current year'}
                  {lastUpdated && (
                    <span className="ml-2 text-slate-400">
                      · Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                )}
                <Badge variant="outline" className="text-slate-600">
                  {series.length} selected
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-6 text-slate-500">
                <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <p className="text-sm">Loading chart data...</p>
              </div>
            ) : series.length === 0 || series.every(s => s.points.length === 0) ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                  {React.createElement(METRIC_ICON[metric], { className: 'w-7 h-7 text-slate-400' })}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    No {METRIC_LABEL[metric]} data in this period
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try switching to a wider period (Month / Year) or check IoT device connection
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  {(['day', 'month', 'year'] as PeriodKey[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        period === p
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p === 'day' ? 'Today' : p === 'month' ? 'This Month' : 'This Year'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Total data points across all series */}
                {(() => {
                  const totalPts = series.reduce((s, item) => s + item.points.length, 0);
                  const isSparse = totalPts > 0 && totalPts < 5;
                  return (
                    <>
                      {isSparse && (
                        <div
                          className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                          style={{ background: '#fef9c3', border: '1px solid #fde68a', color: '#92400e' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>{totalPts} data point(s)</strong> found in this period.
                            Dots are shown on the chart. Try <strong>Month</strong> or <strong>Year</strong> for more history.
                          </span>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                          <defs>
                            {series.map((seriesItem, index) => (
                              <linearGradient key={seriesItem.id} id={`line-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={LINE_COLORS[index % LINE_COLORS.length]} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={LINE_COLORS[index % LINE_COLORS.length]} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="bucket"
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            interval={period === 'month' ? 4 : period === 'year' ? 0 : 'preserveStartEnd'}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}${METRIC_UNIT[metric]}`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(15,23,42,0.9)',
                              border: 'none',
                              borderRadius: '12px',
                              fontSize: 12,
                              color: '#f1f5f9',
                              backdropFilter: 'blur(8px)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                            }}
                            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                            formatter={(value: any, _name: string, props: any) => {
                              if (typeof value !== 'number') return [value, METRIC_LABEL[metric]];
                              const sItem = series.find(s => s.id === props.dataKey);
                              return [`${value.toFixed(2)} ${METRIC_UNIT[metric]}`, sItem?.name || METRIC_LABEL[metric]];
                            }}
                          />
                          {series.map((seriesItem, index) => {
                            const color = LINE_COLORS[index % LINE_COLORS.length];
                            const hasFewPoints = seriesItem.points.length <= 5;
                            return (
                              <Line
                                key={seriesItem.id}
                                type="monotone"
                                dataKey={seriesItem.id}
                                name={seriesItem.name}
                                stroke={color}
                                strokeWidth={hasFewPoints ? 2.5 : 2}
                                dot={hasFewPoints
                                  ? { r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }
                                  : { r: 2.5, fill: color, strokeWidth: 0 }
                                }
                                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2, style: { filter: `drop-shadow(0 0 6px ${color})` } }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Raw data table when sparse */}
                      {isSparse && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Raw data points</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {series.flatMap((seriesItem, si) =>
                              seriesItem.points.map((pt, pi) => (
                                <div
                                  key={`${si}-${pi}`}
                                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
                                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: LINE_COLORS[si % LINE_COLORS.length] }} />
                                    <span className="font-medium text-slate-700">{seriesItem.name}</span>
                                    <span className="text-slate-400">{pt.bucket}</span>
                                  </div>
                                  <span className="font-bold" style={{ color: LINE_COLORS[si % LINE_COLORS.length] }}>
                                    {pt.value} {METRIC_UNIT[metric]}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {series.map((seriesItem, index) => (
                    <div key={seriesItem.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: LINE_COLORS[index % LINE_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-900 truncate">{seriesItem.name}</span>
                        <span
                          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: seriesItem.points.length > 0 ? '#dcfce7' : '#fee2e2', color: seriesItem.points.length > 0 ? '#16a34a' : '#dc2626' }}
                        >
                          {seriesItem.points.length} pts
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px] mt-0.5 block ml-4.5">{seriesItem.subtitle}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
