import React from 'react';
import {
  ChevronLeft,
  Sofa,
  Bed,
  ChefHat,
  Car,
  Bath,
  Laptop,
  Dumbbell,
  Utensils,
  Home,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../context/AppContext';

interface RoomsScreenProps {
  floorId: string;
  onBack: () => void;
  onRoomSelect: (roomId: string, roomName: string) => void;
  onNavigate: (screen: string, data?: any) => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  sofa: Sofa,
  bed: Bed,
  'bed-double': Bed,
  'chef-hat': ChefHat,
  utensils: Utensils,
  car: Car,
  bath: Bath,
  laptop: Laptop,
  dumbbell: Dumbbell,
};

export const RoomsScreen: React.FC<RoomsScreenProps> = ({
  floorId,
  onBack,
  onRoomSelect,
}) => {
  const { floors, rooms, devices } = useApp();
  const floor = floors.find((f) => f.id === floorId);
  const floorRooms = rooms.filter((r) => r.floorId === floorId);

  if (!floor) return null;

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{floor.name}</h1>
            <p className="text-sm text-gray-500">
              {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {floorRooms.length === 0 ? (
          <div className="text-center py-12">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No rooms on this floor</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {floorRooms.map((room) => {
              const Icon = room.icon ? iconMap[room.icon] || Home : Home;
              const roomDevices = devices.filter((d) => d.roomId === room.id);
              const devicesOn = roomDevices.filter((d) => d.isOn).length;

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onRoomSelect(room.id, room.name)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {room.name}
                      </h3>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {room.deviceCount} devices
                        </Badge>
                      </div>
                      {devicesOn > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          {devicesOn} on
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};