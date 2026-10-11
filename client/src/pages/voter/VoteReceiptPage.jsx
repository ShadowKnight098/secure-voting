import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Hash, 
  Calendar, 
  User, 
  Vote, 
  Printer, 
  BarChart2, 
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { voteService } from '../../services/voteService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export const VoteReceiptPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const data = await voteService.getReceipt(electionId);
        setReceipt(data);
      } catch (err) {
        toast.error('Failed to load vote receipt');
        navigate('/voter/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [electionId, navigate]);

  const handleCopyHash = () => {
    if (receipt?.encryptedVoteHash) {
      navigator.clipboard.writeText(receipt.encryptedVoteHash);
      setCopied(true);
      toast.success('Vote cryptographic hash copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between no-print">
          <button 
            onClick={() => navigate('/voter/dashboard')}
            className="inline-flex items-center text-sm font-bold text-ink bg-surface border-2 border-ink px-3 py-1.5 rounded-[10px] shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Dashboard
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
          >
            Print Receipt
          </Button>
        </div>

        {/* Official Receipt Card */}
        <Card className="p-6 sm:p-10 shadow-neo-xl relative overflow-hidden bg-surface">
          {/* Top Banner */}
          <div className="text-center pb-6 border-b-2 border-ink space-y-3">
            <div className="w-16 h-16 rounded-[14px] bg-mint border-2 border-ink mx-auto flex items-center justify-center text-ink shadow-neo">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-black uppercase shadow-neo-sm mb-2">
                Official Electronic Ballot Receipt
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-ink">Vote Cast Successfully</h1>
              <p className="text-xs font-semibold text-ink/75 mt-1">
                Your vote is verified and cryptographically sealed on the ledger.
              </p>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="py-6 space-y-4 border-b-2 border-ink">
            <div className="p-4 rounded-[12px] bg-lavender/60 border-2 border-ink shadow-neo-sm">
              <span className="text-[11px] font-black uppercase text-violet block">Digital Receipt ID</span>
              <span className="text-xl font-mono font-black text-ink tracking-wider block mt-0.5">
                {receipt?.receiptId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-ink/60 block">Election Event</span>
                <span className="text-sm font-extrabold text-ink block mt-0.5">{receipt?.electionTitle}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-ink/60 block">Candidate Selected</span>
                <span className="text-sm font-extrabold text-ink block mt-0.5">
                  {receipt?.candidateName} {receipt?.candidateParty && `(${receipt.candidateParty})`}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-ink/60 block">Voter Identification</span>
                <span className="text-sm font-mono font-bold text-ink block mt-0.5">{receipt?.voterIdNumber}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-ink/60 block">Timestamp</span>
                <span className="text-sm font-bold text-ink block mt-0.5">
                  {new Date(receipt?.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Cryptographic Hash */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-ink/60">Cryptographic Ballot Hash (SHA-256)</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="text-xs font-extrabold text-violet hover:underline flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-mint" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded-[10px] bg-slate-900 text-mint font-mono text-[11px] break-all border-2 border-ink select-all">
                {receipt?.encryptedVoteHash}
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-6 text-center space-y-4">
            <div className="text-xs font-medium text-ink/75 leading-relaxed">
              Keep this receipt code for verification purposes. Your voting selection has been counted toward the official election results.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 no-print">
              <Button
                variant="primary"
                onClick={() => navigate(`/elections/${electionId}/results`)}
                icon={BarChart2}
              >
                View Live Results
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate('/voter/dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoteReceiptPage;
