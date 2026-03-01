import React from 'react';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../context/AppContext';
import { Device } from '../types';

interface DeleteDeviceConfirmScreenProps {
  device: Device;
  roomName: string;
  onBack: () => void;
  onConfirm: () => void;
}

export const DeleteDeviceConfirmScreen: React.FC<
  DeleteDeviceConfirmScreenProps
> = ({ device, roomName, onBack, onConfirm }) => {
  const { deleteDevice } = useApp();

  const handleDelete = () => {
    deleteDevice(device.id);
    onConfirm();
  };

  return (
    <div className="h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delete Device</h1>
            <p className="text-sm text-gray-500">{roomName}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Warning Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Title */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Delete "{device.name}"?
                </h2>
                <p className="text-sm text-gray-600">
                  This action cannot be undone. The device will be permanently
                  removed from {roomName}.
                </p>
              </div>

              {/* Device Details */}
              <div className="w-full bg-gray-50 rounded-lg p-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">{device.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium capitalize">
                      {device.subType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium capitalize">
                      {device.type}
                    </span>
                  </div>
                  {device.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Description:</span>
                      <span className="font-medium">{device.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full pt-2">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  Delete Device
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
