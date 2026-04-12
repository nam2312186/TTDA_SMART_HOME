import React, { useState } from 'react';
import { Home, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authApi } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigate: (screen: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ username: email, password });
      localStorage.setItem('user_id', String(res.user_id));
      localStorage.setItem('username', res.username);
      localStorage.setItem('email', res.email);
      localStorage.setItem('role', res.role || 'user');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.status === 401 ? 'Invalid email or password' : 'Server error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #eef2ff 0%, #f8f7ff 40%, #ede9fe 100%)' }}
    >
      {/* Decorative background blobs */}
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--gradient-brand)', transform: 'translate(-40%, -40%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
        style={{ background: 'var(--gradient-cool)', transform: 'translate(40%, 40%)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8 animate-float-up">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-glow"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <Home className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f0e1a' }}>Smart Home</h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Control your home from anywhere
          </p>
        </div>

        {/* Login Form – Glass Card */}
        <div
          className="rounded-3xl p-6 shadow-brand-lg animate-float-up"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.7)',
            animationDelay: '0.1s',
          }}
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold" style={{ color: '#374151' }}>
                Email address
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--primary)' }}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl border-0 h-11"
                  style={{ background: 'var(--input-background)' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold" style={{ color: '#374151' }}>
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--primary)' }}
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 rounded-xl border-0 h-11"
                  style={{ background: 'var(--input-background)' }}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
              >
                <span className="text-base">⚠️</span>
                {error}
              </div>
            )}

            <Button
              onClick={handleLogin}
              className="w-full h-12 rounded-xl text-base font-semibold shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--gradient-brand)', border: 'none' }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => onNavigate('register')}
                className="text-sm font-semibold hover:underline transition-all"
                style={{ color: 'var(--primary)' }}
              >
                Create Account
              </button>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <button
                onClick={() => onNavigate('forgotPassword')}
                className="text-sm font-semibold hover:underline transition-all"
                style={{ color: 'var(--primary)' }}
              >
                Forgot Password
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center animate-float-up" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Smart Home Management System v1.0
          </p>
        </div>
      </div>
    </div>
  );
};