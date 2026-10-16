import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BarChart2, 
  Trophy, 
  Users, 
  Vote, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { voteService } from '../services/voteService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { getImageUrl } from '../utils/imageUrl';

export const ElectionResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await voteService.getResults(id);
      setResultsData(data);
      if (isManual) toast.success('Results updated!');
    } catch (err) {
      toast.error('Failed to load election results');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-lavender flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-ink border-t-pink rounded-full animate-spin"></div>
      </div>
    );
  }

  const { election, totalVotes, totalEligibleVoters, turnoutPercentage, candidates, winner } = resultsData || {};

  const handleBack = () => {
    // If voter session is active or was viewing as a voter, return to voter dashboard
    if (localStorage.getItem('voter_token')) {
      navigate('/voter/dashboard');
      return;
    }

    // Only administrators without a voter session navigate to admin elections
    if (localStorage.getItem('token')) {
      navigate('/admin/elections');
    } else {
      navigate('/voter/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-lavender text-ink py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Navigation & Refresh Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="inline-flex items-center text-sm font-bold text-ink bg-surface border-2 border-ink px-3 py-1.5 rounded-[10px] shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchResults(true)}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh Live Tally
          </Button>
        </div>

        {/* Title Header Card */}
        <Card className="p-6 sm:p-8 shadow-neo-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-black uppercase shadow-neo-sm mb-2">
                Election Results & Analytics
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">{election?.title}</h1>
            </div>
            {election?.status && <Badge status={election.status} />}
          </div>

          {election?.description && (
            <p className="text-sm font-medium text-ink/75 mt-3">{election.description}</p>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-[12px] bg-lavender/60 border-2 border-ink shadow-neo-sm">
              <span className="text-xs font-bold text-ink/60 uppercase block">Total Ballots Cast</span>
              <span className="text-2xl font-black text-ink block mt-1">{totalVotes}</span>
            </div>

            <div className="p-4 rounded-[12px] bg-lavender/60 border-2 border-ink shadow-neo-sm">
              <span className="text-xs font-bold text-ink/60 uppercase block">Verified Voters</span>
              <span className="text-2xl font-black text-ink block mt-1">{totalEligibleVoters}</span>
            </div>

            <div className="p-4 rounded-[12px] bg-sun/40 border-2 border-ink shadow-neo-sm">
              <span className="text-xs font-bold text-ink/60 uppercase block">Voter Turnout</span>
              <span className="text-2xl font-black text-ink block mt-1">{turnoutPercentage}%</span>
            </div>
          </div>
        </Card>

        {/* Winner Highlight Card */}
        {winner && totalVotes > 0 && (
          <div className="p-6 sm:p-8 rounded-[16px] bg-sun border-2 border-ink shadow-neo-xl animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-violet animate-bounce" size={28} />
              <span className="text-xs font-black uppercase text-violet tracking-wider">
                {election?.status === 'completed' ? 'Official Winner' : 'Current Leader'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-[14px] border-2 border-ink bg-surface overflow-hidden shadow-neo flex-shrink-0 flex items-center justify-center font-black text-2xl text-violet">
                {winner.photo_url ? (
                  <img src={getImageUrl(winner.photo_url)} alt={winner.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{winner.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl sm:text-3xl font-black text-ink">{winner.name}</h2>
                {winner.party && (
                  <span className="inline-block px-3 py-0.5 bg-violet text-white text-xs font-extrabold rounded-full border border-ink mt-1">
                    {winner.party}
                  </span>
                )}
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-4 text-sm font-extrabold text-ink">
                  <span>🏆 {winner.vote_count} Total Votes</span>
                  <span>📊 {winner.percentage}% of Ballot Tally</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Candidate Breakdown */}
        <Card className="p-6 sm:p-8 shadow-neo-xl">
          <h2 className="text-xl font-black text-ink mb-6 flex items-center gap-2">
            <BarChart2 className="text-violet" size={22} />
            Candidate Vote Breakdown
          </h2>

          {candidates?.length === 0 ? (
            <div className="text-center py-8 text-ink/60 font-bold">No candidates registered.</div>
          ) : (
            <div className="space-y-6">
              {candidates?.map((candidate, idx) => (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-lavender border-2 border-ink flex items-center justify-center font-black text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-black text-ink text-base">{candidate.name}</span>
                        {candidate.party && (
                          <span className="ml-2 text-xs font-bold text-ink/65">({candidate.party})</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-ink text-base">{candidate.vote_count} votes</span>
                      <span className="ml-2 font-bold text-xs text-ink/70">({candidate.percentage}%)</span>
                    </div>
                  </div>

                  {/* Neo-Brutalist Progress Bar */}
                  <div className="w-full h-5 rounded-[8px] bg-surface border-2 border-ink overflow-hidden shadow-neo-sm p-0.5">
                    <div 
                      className={`h-full rounded-[4px] border border-ink transition-all duration-500 ${
                        idx === 0 ? 'bg-mint' : idx === 1 ? 'bg-pink' : 'bg-sun'
                      }`}
                      style={{ width: `${Math.max(candidate.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ElectionResultsPage;
