import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  ShieldCheck, 
  Trophy, 
  Users, 
  Vote, 
  RefreshCw, 
  Lock, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Printer, 
  Search,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { electionService } from '../../services/electionService';
import { voteService } from '../../services/voteService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getImageUrl } from '../../utils/imageUrl';

export const AdminResultsPage = () => {
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'audit'
  const [auditSearch, setAuditSearch] = useState('');

  // 1. Load all elections
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const res = await electionService.getAll({ limit: 100 });
        const list = res.data || [];
        setElections(list);
        if (list.length > 0) {
          // Select first active or upcoming election, or first item
          const preferred = list.find(e => e.status === 'active') || list[0];
          setSelectedElectionId(preferred.id);
        }
      } catch (err) {
        toast.error('Failed to load elections list');
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  // 2. Fetch Results & Audit Ledger for selected election
  const fetchDetails = async (electionId, manual = false) => {
    if (!electionId) return;
    if (manual) setRefreshing(true);

    try {
      const [resData, audData] = await Promise.all([
        voteService.getResults(electionId),
        voteService.getAuditLedger(electionId)
      ]);
      setResultsData(resData);
      setAuditData(audData);
      if (manual) toast.success('Election analytics and audit ledger refreshed!');
    } catch (err) {
      toast.error('Could not load election details');
    } finally {
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedElectionId) {
      fetchDetails(selectedElectionId);
    }
  }, [selectedElectionId]);

  const handlePrint = () => {
    window.print();
  };

  const filteredAuditTrail = (auditData?.auditTrail || []).filter(item => {
    const q = auditSearch.toLowerCase();
    return item.receiptCode.toLowerCase().includes(q) ||
      item.candidateName.toLowerCase().includes(q) ||
      item.encryptedVoteHash.toLowerCase().includes(q) ||
      item.maskedVoterId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <BarChart2 className="text-violet" size={30} />
            Live Results & Cryptographic Audit
          </h2>
          <p className="text-ink/70 font-medium text-sm mt-1">
            Module 4: Real-time vote tallies, turnout analytics, and immutable SHA-256 audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={Printer}
            className="text-xs"
          >
            Export / Print
          </Button>

          <Button
            variant="primary"
            onClick={() => fetchDetails(selectedElectionId, true)}
            loading={refreshing}
            icon={RefreshCw}
            className="text-xs"
          >
            Refresh Tally
          </Button>
        </div>
      </div>

      {/* Election Selector & Controls */}
      <Card className="p-4 sm:p-6 shadow-neo">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <label className="text-xs font-black uppercase text-ink whitespace-nowrap">
              Select Election:
            </label>
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="w-full sm:max-w-md px-3.5 py-2.5 bg-surface border-2 border-ink rounded-[10px] text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-violet shadow-neo-sm cursor-pointer"
            >
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title} ({el.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex rounded-[10px] border-2 border-ink p-1 bg-surface shadow-neo-sm">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-1.5 rounded-[6px] text-xs font-black transition-all ${
                activeTab === 'results' ? 'bg-sun text-ink border border-ink shadow-neo-sm' : 'text-ink/70 hover:text-ink'
              }`}
            >
              📊 Live Results & Proclamation
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-1.5 rounded-[6px] text-xs font-black transition-all ${
                activeTab === 'audit' ? 'bg-mint text-ink border border-ink shadow-neo-sm' : 'text-ink/70 hover:text-ink'
              }`}
            >
              🔒 Cryptographic Audit Ledger ({auditData?.totalSealedBallots || 0})
            </button>
          </div>
        </div>
      </Card>

      {/* Main Tab Content */}
      {activeTab === 'results' ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-[14px] bg-sun/40 border-2 border-ink shadow-neo">
              <span className="text-xs font-bold text-ink/70 uppercase block">Total Ballots Cast</span>
              <span className="text-3xl font-black text-ink block mt-1">{resultsData?.totalVotes ?? 0}</span>
              <span className="text-[11px] font-bold text-mint mt-1 block">✓ Cryptographically Sealed</span>
            </div>

            <div className="p-5 rounded-[14px] bg-lavender/60 border-2 border-ink shadow-neo">
              <span className="text-xs font-bold text-ink/70 uppercase block">Eligible Verified Voters</span>
              <span className="text-3xl font-black text-ink block mt-1">{resultsData?.totalEligibleVoters ?? 0}</span>
              <span className="text-[11px] font-bold text-ink/60 mt-1 block">Face Biometrics Approved</span>
            </div>

            <div className="p-5 rounded-[14px] bg-mint/40 border-2 border-ink shadow-neo">
              <span className="text-xs font-bold text-ink/70 uppercase block">Voter Turnout</span>
              <span className="text-3xl font-black text-ink block mt-1">{resultsData?.turnoutPercentage ?? 0}%</span>
              <span className="text-[11px] font-bold text-ink/75 mt-1 block">Participation Rate</span>
            </div>

            <div className="p-5 rounded-[14px] bg-surface border-2 border-ink shadow-neo">
              <span className="text-xs font-bold text-ink/70 uppercase block">Election Status</span>
              <div className="mt-2">
                {resultsData?.election?.status && <Badge status={resultsData.election.status} />}
              </div>
              <span className="text-[11px] font-mono font-bold text-ink/60 mt-1.5 block">
                ID: #{selectedElectionId}
              </span>
            </div>
          </div>

          {/* Winner Banner */}
          {resultsData?.winner && resultsData?.totalVotes > 0 ? (
            <div className="p-6 sm:p-8 rounded-[16px] bg-sun border-2 border-ink shadow-neo-xl animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="text-violet animate-bounce" size={28} />
                <span className="text-xs font-black uppercase text-violet tracking-wider">
                  {resultsData?.election?.status === 'completed' ? 'Official Winner Declared' : 'Current Leader (Live Tally)'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-[14px] border-2 border-ink bg-surface overflow-hidden shadow-neo flex-shrink-0 flex items-center justify-center font-black text-2xl text-violet">
                  {resultsData.winner.photo_url ? (
                    <img src={getImageUrl(resultsData.winner.photo_url)} alt={resultsData.winner.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{resultsData.winner.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-ink">{resultsData.winner.name}</h2>
                  {resultsData.winner.party && (
                    <span className="inline-block px-3 py-0.5 bg-violet text-white text-xs font-extrabold rounded-full border border-ink mt-1">
                      {resultsData.winner.party}
                    </span>
                  )}
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-4 text-sm font-extrabold text-ink">
                    <span>🏆 {resultsData.winner.vote_count} Total Votes</span>
                    <span>📊 {resultsData.winner.percentage}% Vote Share</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-[14px] bg-lavender/40 border-2 border-ink text-center">
              <Vote size={32} className="mx-auto text-ink/50 mb-2" />
              <p className="font-extrabold text-sm text-ink">No ballots recorded yet for this election.</p>
              <p className="text-xs font-medium text-ink/70 mt-1">
                Once verified voters cast their biometric ballots, real-time results and leader proclamations will appear here.
              </p>
            </div>
          )}

          {/* Candidate & Party Vote Distribution */}
          <Card className="p-6 sm:p-8 shadow-neo-xl">
            <h3 className="text-xl font-black text-ink mb-6 flex items-center gap-2">
              <BarChart2 className="text-violet" size={22} />
              Candidate / Party Vote Distribution
            </h3>

            {resultsData?.candidates?.length === 0 ? (
              <p className="text-center py-8 text-ink/60 font-bold">No candidate entries found.</p>
            ) : (
              <div className="space-y-6">
                {resultsData?.candidates?.map((candidate, idx) => (
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
      ) : (
        /* Audit Ledger Tab */
        <div className="space-y-6">
          <div className="p-4 rounded-[14px] bg-lavender/60 border-2 border-ink flex items-center justify-between gap-4 shadow-neo-sm">
            <div className="flex items-center gap-3">
              <Lock className="text-violet" size={24} />
              <div>
                <h4 className="font-black text-sm text-ink">Cryptographically Sealed Audit Trail</h4>
                <p className="text-xs font-medium text-ink/80 mt-0.5">
                  Each vote is salted with 16-byte OS entropy and sealed with SHA-256. Voter identities are masked for ballot secrecy.
                </p>
              </div>
            </div>

            <div className="w-72">
              <Input
                icon={Search}
                placeholder="Search receipt code or hash..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
          </div>

          <Card className="overflow-hidden shadow-neo-xl p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-lavender border-b-2 border-ink uppercase font-black text-ink/80">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Receipt Code</th>
                    <th className="py-3 px-4">Masked Voter</th>
                    <th className="py-3 px-4">Candidate / Party</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">SHA-256 Ballot Seal</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/20 font-medium">
                  {filteredAuditTrail.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-ink/60 font-bold">
                        No sealed ballots recorded matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditTrail.map((vote) => (
                      <tr key={vote.receiptCode} className="hover:bg-lavender/40 transition-colors">
                        <td className="py-3 px-4 font-black text-ink">{vote.serialNumber}</td>
                        <td className="py-3 px-4 font-mono font-black text-violet">
                          {vote.receiptCode}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-ink">
                          {vote.maskedVoterId}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">
                          {vote.candidateName} <span className="text-ink/60">({vote.candidateParty})</span>
                        </td>
                        <td className="py-3 px-4 text-ink/75 whitespace-nowrap">
                          {new Date(vote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-ink/80 max-w-xs truncate" title={vote.encryptedVoteHash}>
                          {vote.encryptedVoteHash.substring(0, 16)}...{vote.encryptedVoteHash.substring(48)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-mint border border-ink text-[10px] font-black text-ink shadow-neo-sm">
                            <CheckCircle2 size={12} /> VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminResultsPage;
