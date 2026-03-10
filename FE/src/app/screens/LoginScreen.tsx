import React, { useState } from 'react';
import { Home, Lock, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useApp } from '../context/AppContext';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigate: (screen: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useApp();

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    const success = login(email, password);
    if (success) {
      onLoginSuccess();
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="w-full max-w-sm">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Home</h1>
          <p className="text-gray-500 mt-2">Control your home from anywhere</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button onClick={handleLogin} className="w-full" size="lg">
              Sign In
            </Button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('register')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Create Account
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => onNavigate('forgotPassword')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password
              </button>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Smart Home Management System v1.0</p>
        </div>
      </div>
    </div>
  );
};