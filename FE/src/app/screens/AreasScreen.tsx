import React, { useState } from 'react';
import {
  ChevronRight,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';
import { RoomsScreen } from './RoomsScreen';

interface AreasScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

export const AreasScreen: React.FC<AreasScreenProps> = ({ onNavigate }) => {
  const { floors, rooms } = useApp();
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  // Show rooms grid if floor is selected
  if (selectedFloor) {
    return (
      <RoomsScreen
        floorId={selectedFloor}
        onBack={() => setSelectedFloor(null)}
        onRoomSelect={(roomId, roomName) =>
          onNavigate('roomDevices', { roomId, roomName })
        }
        onNavigate={onNavigate}
      />
    );
  }

  // Show floors list
  const sortedFloors = [...floors].sort((a, b) => a.level - b.level);

  return (
    <div className="h-full overflow-y-auto pb-20 bg-slate-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Areas</h1>
            <p className="text-sm text-gray-500">Browse floors and rooms</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {sortedFloors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Chưa có tầng nào hiển thị</p>
            <p className="mt-2 text-sm text-slate-500">
              Dữ liệu sẽ hiện lại sau khi backend trả về floors. Thử chuyển tab hoặc quay lại màn này sau khi đăng nhập.
            </p>
          </div>
        ) : (
          sortedFloors.map((floor) => {
            const floorRooms = rooms.filter((r) => r.floorId === floor.id);
            const totalDevices = floorRooms.reduce(
              (sum, r) => sum + r.deviceCount,
              0
            );

            return (
              <Card
                key={floor.id}
                className="cursor-pointer border-slate-100 bg-white hover:shadow-md transition-shadow"
                onClick={() => setSelectedFloor(floor.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-sky-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {floor.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {floor.roomCount} room{floor.roomCount !== 1 ? 's' : ''}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {totalDevices} device{totalDevices !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};