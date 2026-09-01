import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await login(username, password);
    if (res.success) {
      navigate('/admin/dashboard');
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

      {/* Left Branding Panel (Desktop) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative z-10 p-12 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800">
        <div className="max-w-md text-center animate-slide-in-left">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 mb-8 shadow-2xl shadow-indigo-500/10">
            <ShieldCheck className="w-12 h-12 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 tracking-tight">Secure Electronic Voting System</h1>
          <p className="text-lg text-slate-400">
            Administrative portal for managing elections, candidates, and secure voting operations.
          </p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-2xl animate-slide-up">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400">Sign in to the admin portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <Input
              label="Username"
              icon={User}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="mt-8"
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
