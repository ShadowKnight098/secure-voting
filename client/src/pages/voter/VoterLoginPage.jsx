import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, Lock, ArrowRight, UserPlus } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 mb-4 shadow-xl shadow-emerald-500/10">
          <UserCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Voter Portal</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to check verification status and cast your vote
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="p-6 sm:p-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="identifier"
              label="Voter ID or Registered Email"
              placeholder="e.g. VOTER-1001 or name@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
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
              className="mt-6"
            >
              Sign In to Voter Hub <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400 mb-3">Don't have a voter account?</p>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/voter/register')}
              icon={UserPlus}
            >
              Register as New Voter
            </Button>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-400">
            Administrator Portal →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VoterLoginPage;
