import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Hash, Lock, Vote, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useVoterAuth } from '../../context/VoterAuthContext';
import { voterService } from '../../services/voterService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export const VoterRegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    voter_id_number: '',
    password: '',
    confirm_password: '',
    election_id: ''
  });
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useVoterAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const data = await voterService.getAvailableElections();
        setElections(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, election_id: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load elections', err);
      } finally {
        setLoadingElections(false);
      }
    };
    fetchElections();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.election_id) {
      setError('Please select an election');
      return;
    }

    setSubmitting(true);
    const res = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      voter_id_number: formData.voter_id_number,
      password: formData.password,
      election_id: parseInt(formData.election_id, 10)
    });

    if (res.success) {
      navigate('/voter/dashboard');
    } else {
      setError(res.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 mb-4 shadow-xl shadow-indigo-500/10">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Voter Registration</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enroll in the Secure Electronic Voting System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <Card className="p-6 sm:p-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-slide-up">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="full_name"
                label="Full Legal Name"
                icon={User}
                placeholder="e.g. Johnathan Doe"
                value={formData.full_name}
                onChange={handleChange}
                required
              />

              <Input
                id="voter_id_number"
                label="National / Voter ID"
                icon={Hash}
                placeholder="e.g. VOTER-9821"
                value={formData.voter_id_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="email"
                type="email"
                label="Email Address"
                icon={Mail}
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                id="phone"
                type="tel"
                label="Phone Number"
                icon={Phone}
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="election_id" className="block text-sm font-medium text-slate-300">
                Participating Election <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="election_id"
                  value={formData.election_id}
                  onChange={handleChange}
                  disabled={loadingElections}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                >
                  {loadingElections ? (
                    <option value="">Loading active elections...</option>
                  ) : elections.length === 0 ? (
                    <option value="">No active elections available</option>
                  ) : (
                    elections.map(el => (
                      <option key={el.id} value={el.id}>
                        {el.title} ({el.status.toUpperCase()})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Input
                id="password"
                type="password"
                label="Create Password"
                icon={Lock}
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <Input
                id="confirm_password"
                type="password"
                label="Confirm Password"
                icon={Lock}
                placeholder="Repeat password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center text-slate-300 font-medium gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Next steps after registration:</span>
              </div>
              <p>1. Administrator reviews and grants verification status.</p>
              <p>2. Video/Biometric Verification will be required in Module 3 before ballot access.</p>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              className="mt-6"
            >
              Complete Voter Registration <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already registered?{' '}
            <Link to="/voter/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign In to Voter Portal
            </Link>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-400">
            Are you an administrator? Switch to Admin Login →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VoterRegisterPage;
