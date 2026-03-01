import React, { useState } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useApp } from '../../context/AppContext';

interface ManageFloorsScreenProps {
  onBack: () => void;
}

export const ManageFloorsScreen: React.FC<ManageFloorsScreenProps> = ({
  onBack,
}) => {
  const { floors, addFloor, updateFloor, deleteFloor } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');

  const handleSubmit = () => {
    if (!name || !level) {
      alert('Please fill in all fields');
      return;
    }

    if (editingFloor) {
      updateFloor(editingFloor, { name, level: parseInt(level) });
    } else {
      addFloor({ name, level: parseInt(level) });
    }

    setIsDialogOpen(false);
    setEditingFloor(null);
    setName('');
    setLevel('');
  };

  const handleEdit = (floor: any) => {
    setEditingFloor(floor.id);
    setName(floor.name);
    setLevel(floor.level.toString());
    setIsDialogOpen(true);
  };

  const handleDelete = (floorId: string) => {
    if (confirm('Are you sure? This will also delete all rooms and devices on this floor.')) {
      deleteFloor(floorId);
    }
  };

  const handleAdd = () => {
    setEditingFloor(null);
    setName('');
    setLevel('');
    setIsDialogOpen(true);
  };

  const sortedFloors = [...floors].sort((a, b) => a.level - b.level);

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Manage Floors</h1>
            <p className="text-sm text-gray-500">{floors.length} floor(s)</p>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {sortedFloors.map((floor) => (
          <Card key={floor.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{floor.name}</h3>
                  <p className="text-sm text-gray-500">
                    Level {floor.level} • {floor.roomCount} room(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(floor)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(floor.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFloor ? 'Edit Floor' : 'Add Floor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Floor Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ground Floor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Floor Level</Label>
              <Input
                id="level"
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="e.g., 0"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingFloor ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};