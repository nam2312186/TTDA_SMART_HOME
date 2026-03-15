import React, { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Building2, DoorOpen, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useApp } from '../../context/AppContext';

interface ManageFloorsScreenProps {
  onBack: () => void;
}

export const ManageFloorsScreen: React.FC<ManageFloorsScreenProps> = ({ onBack }) => {
  const { floors, rooms, addFloor, updateFloor, deleteFloor, addRoom, updateRoom, deleteRoom } = useApp();

  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [floorName, setFloorName] = useState('');
  const [floorLevel, setFloorLevel] = useState('');

  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomFloorId, setRoomFloorId] = useState<string>('');

  const sortedFloors = useMemo(() => [...floors].sort((a, b) => a.level - b.level), [floors]);

  const roomsByFloor = useMemo(() => {
    const m: Record<string, typeof rooms> = {};
    for (const f of floors) m[f.id] = [];
    for (const r of rooms) {
      if (!m[r.floorId]) m[r.floorId] = [];
      m[r.floorId].push(r);
    }
    return m;
  }, [floors, rooms]);

  const resetFloorForm = () => {
    setEditingFloorId(null);
    setFloorName('');
    setFloorLevel('');
  };

  const resetRoomForm = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomFloorId('');
  };

  const openAddFloor = () => {
    resetFloorForm();
    setIsFloorDialogOpen(true);
  };

  const openEditFloor = (floor: any) => {
    setEditingFloorId(floor.id);
    setFloorName(floor.name);
    setFloorLevel(String(floor.level));
    setIsFloorDialogOpen(true);
  };

  const submitFloor = () => {
    if (!floorName.trim() || !floorLevel.trim()) return;
    const payload = { name: floorName.trim(), level: Number(floorLevel) };
    if (editingFloorId) updateFloor(editingFloorId, payload);
    else addFloor(payload as any);
    setIsFloorDialogOpen(false);
    resetFloorForm();
  };

  const openAddRoom = (floorId?: string) => {
    resetRoomForm();
    if (floorId) setRoomFloorId(floorId);
    setIsRoomDialogOpen(true);
  };

  const openEditRoom = (room: any) => {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomFloorId(room.floorId);
    setIsRoomDialogOpen(true);
  };

  const submitRoom = () => {
    if (!roomName.trim() || !roomFloorId) return;
    const payload = { name: roomName.trim(), floorId: roomFloorId };
    if (editingRoomId) updateRoom(editingRoomId, payload);
    else addRoom(payload as any);
    setIsRoomDialogOpen(false);
    resetRoomForm();
  };

  return (
    <div className="h-full overflow-y-auto pb-20 bg-slate-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Manage Floors & Rooms</h1>
            <p className="text-sm text-gray-500">{floors.length} floor(s) • {rooms.length} room(s)</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openAddRoom()}>
              <DoorOpen className="w-4 h-4 mr-1" />
              Room
            </Button>
            <Button size="sm" onClick={openAddFloor}>
              <Plus className="w-4 h-4 mr-1" />
              Floor
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {sortedFloors.map((floor, index) => {
          const floorRooms = roomsByFloor[floor.id] || [];
          return (
            <Card key={floor.id} className="overflow-hidden" style={{ animationDelay: `${index * 60}ms` }}>
              <CardContent className="p-0">
                <div className="p-4 bg-gradient-to-r from-sky-50 to-emerald-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-sky-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{floor.name}</h3>
                      <p className="text-sm text-gray-500">Level {floor.level} • {floorRooms.length} room(s)</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openAddRoom(floor.id)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditFloor(floor)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteFloor(floor.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {floorRooms.length === 0 && (
                    <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 text-sm text-slate-500 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      No room on this floor yet.
                    </div>
                  )}
                  {floorRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 bg-white hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{room.name}</p>
                        <p className="text-xs text-slate-500">{room.deviceCount} device(s)</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditRoom(room)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteRoom(room.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFloorId ? 'Edit Floor' : 'Add Floor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="floor-name">Floor Name</Label>
              <Input id="floor-name" value={floorName} onChange={(e) => setFloorName(e.target.value)} placeholder="e.g., Floor 6 - Office" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor-level">Floor Level</Label>
              <Input id="floor-level" type="number" value={floorLevel} onChange={(e) => setFloorLevel(e.target.value)} placeholder="e.g., 6" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsFloorDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitFloor} className="flex-1">{editingFloorId ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoomId ? 'Edit Room' : 'Add Room'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input id="room-name" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g., Media Room" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-floor">Floor</Label>
              <select
                id="room-floor"
                value={roomFloorId}
                onChange={(e) => setRoomFloorId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>Select floor</option>
                {sortedFloors.map((f) => (
                  <option key={f.id} value={f.id}>
                    L{f.level} - {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitRoom} className="flex-1">{editingRoomId ? 'Save' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
