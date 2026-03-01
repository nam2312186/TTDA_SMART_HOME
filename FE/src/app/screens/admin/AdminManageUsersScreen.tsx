import React, { useState } from 'react';
import { ArrowLeft, Users, Shield, Eye } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

interface AdminManageUsersScreenProps {
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export const AdminManageUsersScreen: React.FC<AdminManageUsersScreenProps> = ({ onBack, onNavigate }) => {
  const { users, updateUser, homes } = useApp();
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const toggleUserRole = (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    updateUser(userId, { role: newRole });
    setEditingUser(null);
  };

  const getUserHome = (homeId: string) => {
    return homes.find((h) => h.id === homeId);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Manage Users</h1>
            <p className="text-xs text-gray-500">{users.length} total users</p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {users.map((user) => {
          const userHome = getUserHome(user.homeId);
          return (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge
                        className={
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {user.role === 'admin' ? (
                          <Shield className="w-3 h-3 mr-1" />
                        ) : null}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <p>Home: {userHome?.name || 'No home'}</p>
                      <p>Last active: {new Date(user.lastActive).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                      >
                        {editingUser === user.id ? 'Cancel' : 'Edit Role'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('adminViewUserHome', { userId: user.id, homeId: user.homeId })}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Home
                      </Button>
                    </div>

                    {editingUser === user.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 mb-2">Change user role:</p>
                        <div className="flex gap-2">
                          <Button
                            variant={user.role === 'user' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => user.role !== 'user' && toggleUserRole(user.id, user.role)}
                          >
                            User
                          </Button>
                          <Button
                            variant={user.role === 'admin' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => user.role !== 'admin' && toggleUserRole(user.id, user.role)}
                          >
                            Admin
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
