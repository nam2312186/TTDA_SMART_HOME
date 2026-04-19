import React, { useEffect } from 'react';
import { Home, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-600 to-blue-700">
      <div className="flex flex-col items-center">
        {/* App Logo */}
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <Home className="w-12 h-12 text-blue-600" />
        </div>
        
        {/* App Title */}
        <h1 className="text-4xl font-bold text-white mb-2">Smart Home</h1>
        <p className="text-blue-100 text-lg mb-12">Your home, your control</p>
        
        {/* Loading Indicator */}
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    </div>
  );
};
