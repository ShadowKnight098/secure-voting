import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

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
    <div className="min-h-screen bg-lavender flex flex-col justify-center items-center p-4 sm:p-6 relative text-ink">
      <div className="w-full max-w-md animate-slide-up">
        {/* Top Branding Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[14px] bg-violet text-white border-2 border-ink shadow-neo mb-4">
            <ShieldCheck className="w-9 h-9 text-sun" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Admin Console</h1>
          <p className="text-ink/70 font-medium text-sm mt-1">
            Secure Electronic Voting Management
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6 sm:p-10 shadow-neo-xl">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-bold text-ink shadow-neo-sm mb-3">
              Official Access Only
            </div>
            <h2 className="text-2xl font-bold text-ink">Administrator Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-[12px] bg-coral border-2 border-ink text-ink text-sm font-bold shadow-neo-sm animate-slide-up flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            <Input
              id="username"
              label="Admin Username"
              icon={User}
              placeholder="e.g. admin or vaseem"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <Input
              id="password"
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Enter your admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* One Main Action: Pink Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              className="mt-6"
            >
              Sign In to Admin Panel <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          {/* Switch to Voter Portal */}
          <div className="mt-8 pt-6 border-t-2 border-ink text-center">
            <p className="text-sm font-semibold text-ink/70 mb-3">Are you an eligible voter?</p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => navigate('/voter/login')}
              icon={UserCheck}
            >
              Go to Voter Portal
            </Button>
          </div>
        </Card>

        {/* Demo Credentials Helper Card */}
        <div className="mt-6 p-4 rounded-[14px] bg-surface border-2 border-ink shadow-neo-sm text-xs font-medium text-ink flex items-center justify-between">
          <span>Demo Admin: <strong className="font-bold">admin</strong> / <strong className="font-bold">admin123</strong></span>
          <span className="px-2 py-0.5 rounded-full bg-mint border border-ink text-[10px] font-bold">Ready</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
