import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';

interface AccessDeniedScreenProps {
  onNavigate: (screen: string) => void;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. This section is only available to administrators.
        </p>
        
        <Button onClick={() => onNavigate('home')} className="w-full" size="lg">
          Back to Home
        </Button>
      </div>
    </div>
  );
};
