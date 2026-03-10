import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';

interface AdminManageUsersScreenProps {
  onBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

export const AdminManageUsersScreen: React.FC<AdminManageUsersScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const { users, addUser, updateUser, deleteUser, currentUser, floors, rooms } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'user' });
    setShowDialog(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });
    } else {
      addUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        homeId: currentUser?.homeId || 'home1',
        roomPermissions: [],
      });
    }

    setShowDialog(false);
    setFormData({ name: '', email: '', role: 'user' });
  };

  const handleDelete = (userId: string) => {
    deleteUser(userId);
    setShowDeleteConfirm(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getRoomChips = (user: User) => {
    if (!user.roomPermissions || user.roomPermissions.length === 0) {
      return null;
    }

    // Group rooms by floor
    const roomsByFloor: { [floorId: string]: { floorName: string; floorLevel: number; rooms: string[] } } = {};
    
    user.roomPermissions.forEach((roomId) => {
      const room = rooms.find((r) => r.id === roomId);
      if (room) {
        const floor = floors.find((f) => f.id === room.floorId);
        if (floor) {
          if (!roomsByFloor[floor.id]) {
            roomsByFloor[floor.id] = {
              floorName: floor.name,
              floorLevel: floor.level,
              rooms: [],
            };
          }
          roomsByFloor[floor.id].rooms.push(room.name);
        }
      }
    });

    // Sort floors by level
    const sortedFloors = Object.entries(roomsByFloor).sort(
      ([, a], [, b]) => a.floorLevel - b.floorLevel
    );

    const isExpanded = expandedUsers.has(user.id);
    const maxChipsToShow = 3;
    let chipCount = 0;
    const allChips: JSX.Element[] = [];

    sortedFloors.forEach(([floorId, floorData]) => {
      floorData.rooms.forEach((roomName, idx) => {
        chipCount++;
        const floorShort = `F${floorData.floorLevel}`;
        allChips.push(
          <Badge
            key={`${floorId}-${idx}`}
            variant="secondary"
            className="text-xs px-2 py-0.5"
          >
            {floorShort}-{roomName}
          </Badge>
        );
      });
    });

    const visibleChips = isExpanded ? allChips : allChips.slice(0, maxChipsToShow);
    const hiddenCount = allChips.length - maxChipsToShow;

    return (
      <div className="mt-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {visibleChips}
          {hiddenCount > 0 && !isExpanded && (
            <button
              onClick={() => toggleExpanded(user.id)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
            >
              +{hiddenCount} more
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          {isExpanded && allChips.length > maxChipsToShow && (
            <button
              onClick={() => toggleExpanded(user.id)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
            >
              Show less
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center gap-3">
        <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Manage Users</h1>
          <p className="text-xs text-blue-100">Add, edit, or delete users</p>
        </div>
        <Button
          onClick={handleAdd}
          size="sm"
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-purple-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {user.role === 'admin' ? (
                      <UserCheck className="w-6 h-6 text-purple-600" />
                    ) : (
                      <UserX className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {user.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {user.role === 'user' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit User Details
                              </DropdownMenuItem>
                              {onNavigate && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    onNavigate('roomPermissions', { userId: user.id })
                                  }
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Manage Room Access
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setShowDeleteConfirm(user.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <span className="text-gray-500">
                        Created: {formatDate(user.createdAt)}
                      </span>
                    </div>
                    {user.role === 'user' && (
                      <div className="mt-2">
                        {user.roomPermissions && user.roomPermissions.length > 0 ? (
                          getRoomChips(user)
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            No rooms assigned
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Users
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Get started by adding your first user
            </p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Update user information below'
                : 'Enter user details to create a new account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter user name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'user') =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.email}
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm !== null}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};