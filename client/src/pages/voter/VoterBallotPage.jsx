import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Vote, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  AlertCircle, 
  Lock, 
  User, 
  Award, 
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { voteService } from '../../services/voteService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FaceVerificationModal from '../../components/biometrics/FaceVerificationModal';
import { getImageUrl } from '../../utils/imageUrl';

export const VoterBallotPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Biometric verification state (Module 3)
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [ballotToken, setBallotToken] = useState(null);
  const [isFaceVerified, setIsFaceVerified] = useState(false);

  // Confirmation dialog state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);

  useEffect(() => {
    const fetchBallot = async () => {
      try {
        const data = await voteService.getBallot(electionId);
        if (data.hasVoted) {
          toast.success('You have already cast your ballot for this election!');
          navigate(`/voter/receipt/${electionId}`);
          return;
        }
        setElection(data.election);
        setCandidates(data.candidates || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load ballot');
        navigate('/voter/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchBallot();
  }, [electionId, navigate]);

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleStartVote = () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate to vote for.');
      return;
    }

    // If already verified in this session, open confirmation directly
    if (isFaceVerified && ballotToken) {
      setIsConfirmModalOpen(true);
    } else {
      // Trigger Face Verification (Module 3)
      setIsVerificationModalOpen(true);
    }
  };

  const handleFaceVerified = (token) => {
    setBallotToken(token);
    setIsFaceVerified(true);
    setIsVerificationModalOpen(false);
    setIsConfirmModalOpen(true);
    toast.success('Biometric verification passed! Please confirm your ballot.');
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;
    setSubmittingVote(true);

    try {
      const response = await voteService.castVote({
        election_id: parseInt(electionId, 10),
        candidate_id: selectedCandidate.id,
        ballot_token: ballotToken
      });

      toast.success('Vote cast successfully! Digital receipt generated.');
      setIsConfirmModalOpen(false);
      navigate(`/voter/receipt/${electionId}`, {
        state: { receipt: response?.data?.receipt },
        replace: true
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cast ballot. Please try again.');
    } finally {
      setSubmittingVote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-lavender flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-ink border-t-pink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lavender text-ink py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/voter/dashboard')}
            className="inline-flex items-center text-sm font-bold text-ink bg-surface border-2 border-ink px-3 py-1.5 rounded-[10px] shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Dashboard
          </button>

          {isFaceVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint text-ink font-bold text-xs border-2 border-ink shadow-neo-sm">
              <CheckCircle2 size={15} /> Face Verified (Ready to Vote)
            </span>
          )}
        </div>

        {/* Election Header Card */}
        <Card className="p-6 sm:p-8 shadow-neo-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink">
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-black text-ink shadow-neo-sm mb-2">
                Official Electronic Ballot
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">{election?.title}</h1>
            </div>
            {election?.status && <Badge status={election.status} />}
          </div>

          {election?.description && (
            <p className="text-sm font-medium text-ink/80 mt-4 leading-relaxed">
              {election.description}
            </p>
          )}

          <div className="mt-6 p-4 rounded-[12px] bg-sun/30 border-2 border-ink text-xs font-semibold space-y-1 text-ink">
            <div className="flex items-center gap-2 font-black text-sm">
              <Lock size={16} className="text-violet" />
              <span>Ballot Security Protocol:</span>
            </div>
            <p>1. Each registered voter is restricted to exactly <strong>one</strong> cryptographically sealed vote.</p>
            <p>2. Live facial biometrics will authenticate your identity before the vote is stored.</p>
            <p>3. Once submitted, your vote is encrypted via SHA-256 and cannot be modified.</p>
          </div>
        </Card>

        {/* Candidate Selection Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-ink flex items-center gap-2">
            <Award className="text-violet" size={22} />
            Select Your Candidate / Political Party:
          </h2>

          {candidates.length === 0 ? (
            <Card className="p-8 text-center text-ink/70">
              <AlertCircle size={32} className="mx-auto mb-2 text-ink/50" />
              <p className="font-bold">No candidates or political parties registered for this election yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => handleSelectCandidate(cand)}
                    className={`
                      cursor-pointer rounded-[14px] border-2 border-ink p-5 transition-all
                      ${isSelected 
                        ? 'bg-sun shadow-neo-xl -translate-y-1 ring-4 ring-violet/40' 
                        : 'bg-surface shadow-neo hover:-translate-y-0.5 hover:shadow-neo-lg'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      {/* Photo / Avatar */}
                      <div className="w-16 h-16 rounded-[12px] border-2 border-ink bg-lavender flex-shrink-0 overflow-hidden shadow-neo-sm flex items-center justify-center font-black text-xl text-violet">
                        {cand.photo_url ? (
                          <img 
                            src={getImageUrl(cand.photo_url)} 
                            alt={cand.name || 'Candidate'} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span>{(cand?.name || 'P').charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-lg text-ink truncate">{cand.name}</h3>
                          <div className={`w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center ${isSelected ? 'bg-ink text-white' : 'bg-surface'}`}>
                            {isSelected && <Check size={14} />}
                          </div>
                        </div>

                        {cand.party && (
                          <span className="inline-block px-2.5 py-0.5 bg-violet text-white text-[11px] font-extrabold rounded-full border border-ink mt-1">
                            {cand.party}
                          </span>
                        )}

                        {cand.bio && (
                          <p className="text-xs font-medium text-ink/75 mt-2 line-clamp-3">
                            {cand.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="p-6 bg-surface rounded-[16px] border-2 border-ink shadow-neo-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-ink/60 uppercase block">Selected Candidate:</span>
            <span className="text-lg font-black text-ink">
              {selectedCandidate ? `${selectedCandidate.name} (${selectedCandidate.party || 'Independent'})` : 'None chosen yet'}
            </span>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!selectedCandidate}
            onClick={handleStartVote}
            className="w-full sm:w-auto shadow-neo-lg"
          >
            <ShieldCheck size={20} className="mr-2" />
            {isFaceVerified ? 'Proceed to Cast Ballot' : 'Authenticate & Cast Ballot'}
          </Button>
        </div>
      </div>

      {/* Module 3: Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        electionId={electionId}
        onVerified={handleFaceVerified}
      />

      {/* Final Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !submittingVote && setIsConfirmModalOpen(false)}
        title="Confirm Your Vote Submission"
      >
        <div className="space-y-4 text-ink">
          <div className="p-4 bg-lavender/60 rounded-[12px] border-2 border-ink shadow-neo-sm space-y-2">
            <span className="text-xs font-extrabold text-violet uppercase">Selected Candidate</span>
            <h3 className="text-2xl font-black text-ink">{selectedCandidate?.name}</h3>
            {selectedCandidate?.party && (
              <span className="inline-block px-2.5 py-0.5 bg-violet text-white text-xs font-extrabold rounded-full border border-ink">
                {selectedCandidate.party}
              </span>
            )}
          </div>

          <div className="p-3 bg-coral/20 border-2 border-ink rounded-[10px] text-xs font-bold text-ink flex items-start gap-2">
            <AlertCircle size={16} className="text-coral flex-shrink-0 mt-0.5" />
            <span>
              This action is permanent and cannot be undone. Once submitted, your vote is cryptographically encrypted and sealed in the database.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t-2 border-ink">
            <Button
              variant="secondary"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={submittingVote}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleConfirmVote}
              loading={submittingVote}
            >
              Confirm & Cast Vote
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VoterBallotPage;
