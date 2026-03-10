import React, { useState } from 'react';
import { ChevronLeft, Save, User, Check } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';

interface RoomPermissionsScreenProps {
  onBack: () => void;
}

export const RoomPermissionsScreen: React.FC<RoomPermissionsScreenProps> = ({
  onBack,
}) => {
  const { users, floors, rooms, updateUserRoomPermissions } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Get non-admin users only
  const regularUsers = users.filter((u) => u.role === 'user');

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find((u) => u.id === userId);
    setSelectedRoomIds(user?.roomPermissions || []);
  };

  // Toggle room selection
  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Toggle all rooms in a floor
  const toggleFloor = (floorId: string) => {
    const floorRoomIds = rooms.filter((r) => r.floorId === floorId).map((r) => r.id);
    const allSelected = floorRoomIds.every((id) => selectedRoomIds.includes(id));

    if (allSelected) {
      // Deselect all rooms in this floor
      setSelectedRoomIds((prev) => prev.filter((id) => !floorRoomIds.includes(id)));
    } else {
      // Select all rooms in this floor
      setSelectedRoomIds((prev) => [
        ...prev.filter((id) => !floorRoomIds.includes(id)),
        ...floorRoomIds,
      ]);
    }
  };

  // Check if floor is fully selected
  const isFloorSelected = (floorId: string) => {
    const floorRoomIds = rooms.filter((r) => r.floorId === floorId).map((r) => r.id);
    return floorRoomIds.length > 0 && floorRoomIds.every((id) => selectedRoomIds.includes(id));
  };

  // Check if floor is partially selected
  const isFloorPartiallySelected = (floorId: string) => {
    const floorRoomIds = rooms.filter((r) => r.floorId === floorId).map((r) => r.id);
    const selectedCount = floorRoomIds.filter((id) => selectedRoomIds.includes(id)).length;
    return selectedCount > 0 && selectedCount < floorRoomIds.length;
  };

  // Save permissions
  const handleSave = () => {
    if (!selectedUserId) return;
    
    updateUserRoomPermissions(selectedUserId, selectedRoomIds);
    toast.success('Room permissions updated successfully');
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Room Permissions</h1>
            <p className="text-xs text-blue-100">
              Assign room access to users
            </p>
          </div>
        </div>

        {/* User Selector */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <label className="text-xs text-blue-100 mb-2 block">Select User</label>
          <Select value={selectedUserId} onValueChange={handleUserSelect}>
            <SelectTrigger className="bg-white/20 border-white/30 text-white">
              <SelectValue placeholder="Choose a user" />
            </SelectTrigger>
            <SelectContent>
              {regularUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{user.name}</span>
                    <span className="text-xs text-gray-500">({user.email})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedUserId ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No User Selected
            </h3>
            <p className="text-sm text-gray-600">
              Please select a user to manage their room permissions
            </p>
          </div>
        ) : regularUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Users Found
            </h3>
            <p className="text-sm text-gray-600">
              No regular users available. Create users first from Manage Users.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Selected User Info */}
            {selectedUser && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {selectedUser.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedRoomIds.length} room(s) selected
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Floors and Rooms */}
            {floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.floorId === floor.id);
              if (floorRooms.length === 0) return null;

              return (
                <Card key={floor.id}>
                  <CardContent className="p-0">
                    {/* Floor Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50">
                      <Checkbox
                        id={`floor-${floor.id}`}
                        checked={isFloorSelected(floor.id)}
                        onCheckedChange={() => toggleFloor(floor.id)}
                        className={
                          isFloorPartiallySelected(floor.id)
                            ? 'data-[state=checked]:bg-blue-500'
                            : ''
                        }
                      />
                      <label
                        htmlFor={`floor-${floor.id}`}
                        className="flex-1 font-semibold text-gray-900 cursor-pointer"
                      >
                        {floor.name}
                      </label>
                      <span className="text-xs text-gray-500">
                        {floorRooms.filter((r) => selectedRoomIds.includes(r.id)).length} / {floorRooms.length}
                      </span>
                    </div>

                    {/* Rooms */}
                    <div>
                      {floorRooms.map((room, index) => (
                        <div
                          key={room.id}
                          className={`flex items-center gap-3 p-4 ${
                            index !== floorRooms.length - 1
                              ? 'border-b border-gray-100'
                              : ''
                          }`}
                        >
                          <Checkbox
                            id={`room-${room.id}`}
                            checked={selectedRoomIds.includes(room.id)}
                            onCheckedChange={() => toggleRoom(room.id)}
                          />
                          <label
                            htmlFor={`room-${room.id}`}
                            className="flex-1 text-gray-900 cursor-pointer"
                          >
                            {room.name}
                          </label>
                          {selectedRoomIds.includes(room.id) && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Button */}
      {selectedUserId && (
        <div className="p-4 bg-white border-t border-gray-200">
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Permissions
          </Button>
        </div>
      )}
    </div>
  );
};