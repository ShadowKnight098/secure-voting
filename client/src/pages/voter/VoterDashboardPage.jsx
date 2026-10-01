import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Vote, 
  User, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  CheckCircle2, 
  LogOut, 
  RefreshCw,
  Video,
  FileText
} from 'lucide-react';
import { useVoterAuth } from '../../context/VoterAuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export const VoterDashboardPage = () => {
  const { voter, logout, refreshProfile, loading } = useVoterAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isVerified = voter?.is_verified === 1 || voter?.is_verified === true;
  const hasVoted = voter?.has_voted === 1 || voter?.has_voted === true;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top Navbar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">SecureVote</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Voter Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshProfile}
              title="Refresh status"
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              icon={LogOut}
            >
              Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {voter?.full_name} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Voter ID: <span className="text-emerald-400 font-mono font-medium">{voter?.voter_id_number}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isVerified ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm font-semibold">
                <CheckCircle2 size={18} /> Verified Voter
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-semibold">
                <Clock size={18} /> Pending Verification
              </div>
            )}

            {hasVoted ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-sm font-semibold">
                <Vote size={18} /> Vote Cast
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-sm font-semibold">
                Ballot Not Cast
              </div>
            )}
          </div>
        </div>

        {/* Verification Notice if Pending */}
        {!isVerified && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-200">Account Verification in Progress</h3>
              <p className="text-sm text-amber-300/90 mt-1">
                Your voter registration has been submitted and is currently awaiting approval from the Election Administrator. Once verified, you will be authorized for Video Verification and Ballot access.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Assigned Election & Voting Hub */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assigned Election Card */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Vote size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Assigned Election</span>
                    <h2 className="text-xl font-bold text-white">{voter?.election_title || 'General Election'}</h2>
                  </div>
                </div>
                {voter?.election_status && <Badge status={voter.election_status} />}
              </div>

              {voter?.election_description && (
                <p className="text-slate-400 text-sm mb-6">{voter.election_description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <span className="text-xs text-slate-500 block">Voting Opens</span>
                    <span className="text-slate-300 font-medium">{formatDate(voter?.start_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <span className="text-xs text-slate-500 block">Voting Closes</span>
                    <span className="text-slate-300 font-medium">{formatDate(voter?.end_date)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Voting System Stages Roadmap */}
            <Card className="p-6 sm:p-8">
              <h3 className="text-lg font-bold text-white mb-6">Voting Process Roadmap</h3>
              
              <div className="space-y-6">
                {/* Step 1: Registration */}
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">1. Voter Registration (Module 2)</h4>
                    <p className="text-sm text-slate-400 mt-0.5">Your identity information has been recorded in the secure SQLite database.</p>
                  </div>
                </div>

                {/* Step 2: Verification */}
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isVerified 
                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' 
                      : 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                  }`}>
                    {isVerified ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">2. Administrative Verification</h4>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {isVerified ? 'Your voter registration is approved and active.' : 'Pending approval by the Election Official.'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Video / Face Verification */}
                <div className="flex items-start gap-4 opacity-75">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Video size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">3. Live Video Verification</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Module 3
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">Facial biometrics & liveness check will authenticate voter presence before voting.</p>
                  </div>
                </div>

                {/* Step 4: Electronic Ballot */}
                <div className="flex items-start gap-4 opacity-75">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Vote size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">4. Cast Encrypted Vote</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        Module 4
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">Secure, tamper-proof ballot submission with cryptographic validation.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Voter Profile */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white">{voter?.full_name}</h3>
                  <span className="text-xs text-slate-400">Registered Voter</span>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">Voter ID Number</span>
                  <div className="flex items-center gap-2 font-mono text-white bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <Hash size={14} className="text-slate-400" />
                    <span>{voter?.voter_id_number}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">Email Address</span>
                  <div className="flex items-center gap-2 text-white bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{voter?.email}</span>
                  </div>
                </div>

                {voter?.phone && (
                  <div>
                    <span className="text-xs text-slate-500 block mb-0.5">Phone Number</span>
                    <div className="flex items-center gap-2 text-white bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <Phone size={14} className="text-slate-400" />
                      <span>{voter.phone}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs text-slate-500 block mb-0.5">Registration Date</span>
                  <div className="flex items-center gap-2 text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{formatDate(voter?.created_at)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-indigo-950/20 border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-2">
                <FileText size={18} />
                <span>Voter Support</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If your Voter ID details need updating or if verification is delayed, please contact the election administration desk.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VoterDashboardPage;
