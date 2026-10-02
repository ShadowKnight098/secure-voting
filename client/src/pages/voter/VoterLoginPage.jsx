import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, Lock, ArrowRight, UserPlus, Shield } from 'lucide-react';
import { useVoterAuth } from '../../context/VoterAuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export const VoterLoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useVoterAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await login(identifier, password);
    if (res.success) {
      navigate('/voter/dashboard');
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative text-ink">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[14px] bg-violet text-white border-2 border-ink shadow-neo mb-4">
          <UserCheck className="w-8 h-8 text-sun" />
        </div>
        <h2 className="text-3xl font-extrabold text-ink tracking-tight">Voter portal</h2>
        <p className="mt-2 text-sm font-medium text-ink/70">
          Sign in to check verification status and cast your vote
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-10 shadow-neo-xl">
          {error && (
            <div className="mb-6 p-4 rounded-[12px] bg-coral border-2 border-ink text-ink text-sm font-bold shadow-neo-sm animate-slide-up flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="identifier"
              label="Voter ID or registered email"
              placeholder="e.g. VOTER-1001 or alice@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
              icon={Lock}
              placeholder="Enter your voter password"
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
              Sign in to voter hub <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-ink text-center">
            <p className="text-sm font-semibold text-ink/70 mb-3">Don't have a voter account?</p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => navigate('/voter/register')}
              icon={UserPlus}
            >
              Register as new voter
            </Button>
          </div>
        </Card>

        {/* Demo Seeded Voters helper */}
        <div className="mt-6 p-4 rounded-[14px] bg-surface border-2 border-ink shadow-neo-sm text-xs font-medium text-ink flex items-center justify-between">
          <span>Demo Voter: <strong className="font-bold">VOTER-1001</strong> / <strong className="font-bold">voter123</strong></span>
          <span className="px-2 py-0.5 rounded-full bg-mint border border-ink text-[10px] font-bold">Verified</span>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs font-bold text-violet hover:underline flex items-center justify-center gap-1">
            <Shield size={12} /> Administrator portal →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VoterLoginPage;
