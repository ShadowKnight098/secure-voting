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
      <div className="min-h-screen bg-lavender flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-ink border-t-pink rounded-full animate-spin"></div>
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
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <div className="min-h-screen bg-lavender text-ink">
      {/* Top Navbar */}
      <header className="bg-lavender border-b-2 border-ink sticky top-0 z-30 shadow-neo-sm text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-violet text-white border-2 border-ink shadow-neo-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-sun" />
            </div>
            <div>
              <span className="font-extrabold text-ink text-lg tracking-tight">SecureVote</span>
              <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 text-xs font-bold bg-sun text-ink border-2 border-ink rounded-full shadow-neo-sm">
                Voter Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshProfile}
              className="p-2 rounded-[10px] bg-surface text-ink border-2 border-ink shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              title="Refresh status"
            >
              <RefreshCw size={16} />
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={logout}
              icon={LogOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
        {/* Welcome Banner */}
        <Card className="p-6 sm:p-8 shadow-neo">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                Welcome back, {voter?.full_name} 👋
              </h1>
              <p className="text-ink/70 font-medium text-sm mt-1">
                Voter ID: <span className="text-violet font-mono font-bold bg-lavender px-2 py-0.5 rounded border border-ink">{voter?.voter_id_number}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isVerified ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-mint text-ink border-2 border-ink shadow-neo-sm text-xs font-bold">
                  <CheckCircle2 size={16} /> Verified Voter
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sun text-ink border-2 border-ink shadow-neo-sm text-xs font-bold">
                  <Clock size={16} /> Pending Verification
                </div>
              )}

              {hasVoted ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky text-ink border-2 border-ink shadow-neo-sm text-xs font-bold">
                  <Vote size={16} /> Vote Recorded
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface text-ink border-2 border-ink shadow-neo-sm text-xs font-bold">
                  Ballot Not Cast
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Verification Alert Banner (Mint if verified, Sun if pending) */}
        {isVerified ? (
          <div className="p-5 rounded-[14px] bg-mint border-2 border-ink text-ink shadow-neo flex items-start gap-4 animate-slide-up">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-ink mt-0.5" />
            <div>
              <h3 className="font-bold text-ink">Account verified & active</h3>
              <p className="text-sm font-medium text-ink/80 mt-0.5">
                You have been authorized by the Election Administrator. When election voting opens, you can complete Video Verification (Module 3) to cast your encrypted ballot.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-[14px] bg-sun border-2 border-ink text-ink shadow-neo flex items-start gap-4 animate-slide-up">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-ink mt-0.5" />
            <div>
              <h3 className="font-bold text-ink">Account verification in progress</h3>
              <p className="text-sm font-medium text-ink/80 mt-0.5">
                Your registration has been submitted and is waiting for review by the Election Administrator. Once approved, you will be authorized for video face verification and ballot access.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Assigned Election & Voting Hub */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assigned Election Card */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[12px] bg-violet text-white border-2 border-ink shadow-neo-sm flex items-center justify-center">
                    <Vote size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-violet uppercase tracking-wider block">Assigned Election</span>
                    <h2 className="text-xl font-extrabold text-ink">{voter?.election_title || 'General Election'}</h2>
                  </div>
                </div>
                {voter?.election_status && <Badge status={voter.election_status} />}
              </div>

              {voter?.election_description && (
                <p className="text-ink/75 text-sm mb-6 font-medium">{voter.election_description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-[12px] bg-lavender/50 border-2 border-ink text-sm">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-violet" />
                  <div>
                    <span className="text-xs font-bold text-ink/60 block">Voting Opens</span>
                    <span className="text-ink font-bold">{formatDate(voter?.start_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-violet" />
                  <div>
                    <span className="text-xs font-bold text-ink/60 block">Voting Closes</span>
                    <span className="text-ink font-bold">{formatDate(voter?.end_date)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Voting System Stages Roadmap */}
            <Card className="p-6 sm:p-8">
              <h3 className="text-xl font-extrabold text-ink mb-6">Voting Process Roadmap</h3>
              
              <div className="space-y-4">
                {/* Step 1: Registration */}
                <div className="flex items-start gap-4 p-4 rounded-[12px] bg-surface border-2 border-ink shadow-neo-sm">
                  <div className="w-9 h-9 rounded-full bg-mint border-2 border-ink text-ink flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-ink">1. Voter Registration (Module 2)</h4>
                    <p className="text-sm font-medium text-ink/75 mt-0.5">Your identity information has been recorded in the secure SQLite database.</p>
                  </div>
                </div>

                {/* Step 2: Verification */}
                <div className={`flex items-start gap-4 p-4 rounded-[12px] border-2 border-ink shadow-neo-sm ${isVerified ? 'bg-surface' : 'bg-sun/25'}`}>
                  <div className={`w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${
                    isVerified ? 'bg-mint text-ink' : 'bg-sun text-ink'
                  }`}>
                    {isVerified ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-ink">2. Administrative Verification</h4>
                    <p className="text-sm font-medium text-ink/75 mt-0.5">
                      {isVerified ? 'Your voter registration is approved and active.' : 'Pending approval by the Election Official.'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Video / Face Verification */}
                <div className="flex items-start gap-4 p-4 rounded-[12px] bg-lavender/50 border-2 border-ink/40 shadow-neo-sm">
                  <div className="w-9 h-9 rounded-full bg-surface border-2 border-ink/40 text-ink/70 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Video size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ink/80">3. Live Video Verification</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky border border-ink text-ink">
                        Module 3
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink/70 mt-0.5">Facial biometrics & liveness check will authenticate voter presence before voting.</p>
                  </div>
                </div>

                {/* Step 4: Electronic Ballot */}
                <div className="flex items-start gap-4 p-4 rounded-[12px] bg-lavender/50 border-2 border-ink/40 shadow-neo-sm">
                  <div className="w-9 h-9 rounded-full bg-surface border-2 border-ink/40 text-ink/70 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Vote size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ink/80">4. Cast Encrypted Vote</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink border border-ink text-white">
                        Module 4
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink/70 mt-0.5">Secure, tamper-proof ballot submission with cryptographic validation.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Voter Profile */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-ink">
                <div className="w-12 h-12 rounded-[12px] bg-violet text-white border-2 border-ink shadow-neo-sm flex items-center justify-center font-extrabold text-lg">
                  {voter?.full_name?.charAt(0).toUpperCase() || 'V'}
                </div>
                <div>
                  <h3 className="font-bold text-ink text-lg">{voter?.full_name}</h3>
                  <span className="text-xs font-semibold text-ink/60">Registered Voter</span>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-bold text-ink/60 block mb-1">Voter ID Number</span>
                  <div className="flex items-center gap-2 font-mono text-ink font-bold bg-lavender/60 p-2.5 rounded-[10px] border-2 border-ink">
                    <Hash size={16} className="text-violet" />
                    <span>{voter?.voter_id_number}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-ink/60 block mb-1">Email Address</span>
                  <div className="flex items-center gap-2 text-ink font-medium bg-lavender/60 p-2.5 rounded-[10px] border-2 border-ink">
                    <Mail size={16} className="text-violet" />
                    <span className="truncate">{voter?.email}</span>
                  </div>
                </div>

                {voter?.phone && (
                  <div>
                    <span className="text-xs font-bold text-ink/60 block mb-1">Phone Number</span>
                    <div className="flex items-center gap-2 text-ink font-medium bg-lavender/60 p-2.5 rounded-[10px] border-2 border-ink">
                      <Phone size={16} className="text-violet" />
                      <span>{voter.phone}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-ink/60 block mb-1">Registration Date</span>
                  <div className="flex items-center gap-2 text-ink font-medium bg-lavender/60 p-2.5 rounded-[10px] border-2 border-ink text-xs">
                    <Calendar size={16} className="text-violet" />
                    <span>{formatDate(voter?.created_at)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-sun/30 border-2 border-ink">
              <div className="flex items-center gap-2 text-ink font-bold mb-2">
                <FileText size={18} className="text-violet" />
                <span>Voter Support</span>
              </div>
              <p className="text-xs font-medium text-ink/80 leading-relaxed">
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
