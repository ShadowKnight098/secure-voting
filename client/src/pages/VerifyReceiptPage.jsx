import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Calendar, 
  Hash, 
  ArrowLeft,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { voteService } from '../services/voteService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export const VerifyReceiptPage = () => {
  const navigate = useNavigate();
  const [receiptCode, setReceiptCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!receiptCode.trim()) {
      toast.error('Please enter a valid Receipt Code');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);
    setSearched(true);

    try {
      const data = await voteService.verifyReceipt(receiptCode.trim());
      setVerificationResult(data);
      toast.success('Vote record verified on the ledger!');
    } catch (err) {
      setError(err.response?.data?.message || 'Receipt Code could not be found in the election ledger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender text-ink py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/voter/login"
            className="inline-flex items-center text-sm font-bold text-ink bg-surface border-2 border-ink px-3 py-1.5 rounded-[10px] shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Portal
          </Link>
          <span className="text-xs font-black uppercase text-violet bg-sun/40 border border-ink px-2.5 py-1 rounded-full">
            Zero-Knowledge Public Verifier
          </span>
        </div>

        {/* Header Hero */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-[14px] bg-violet text-white border-2 border-ink shadow-neo mx-auto flex items-center justify-center">
            <ShieldCheck size={36} className="text-sun" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Public Ballot Verification</h1>
          <p className="text-sm font-medium text-ink/75 max-w-md mx-auto">
            Module 4: Verify your vote was counted and cryptographically sealed on the ledger without exposing your ballot selection.
          </p>
        </div>

        {/* Search Input Box */}
        <Card className="p-6 sm:p-8 shadow-neo-xl">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-ink mb-1.5">
                Enter Digital Receipt Code:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="e.g. VOTE-A1B2C3D4E5F6"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-surface border-2 border-ink rounded-[12px] font-mono text-base font-black text-ink placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-sun/60 shadow-neo-sm"
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  icon={Search}
                  className="shadow-neo-md"
                >
                  Verify Receipt
                </Button>
              </div>
            </div>
          </form>

          {/* Verification Results */}
          {verificationResult && (
            <div className="mt-8 p-6 rounded-[16px] bg-mint/30 border-2 border-ink shadow-neo-md space-y-4 animate-slide-up">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-ink">
                <div className="w-10 h-10 rounded-full bg-mint border-2 border-ink flex items-center justify-center text-ink flex-shrink-0 shadow-neo-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-ink">Vote Certified & Ledgered</h3>
                  <span className="text-xs font-bold text-mint-dark">
                    Verified status: {verificationResult.auditVerification}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="text-ink/60 font-bold block">Receipt Code:</span>
                  <span className="font-mono font-black text-violet text-sm block mt-0.5">
                    {verificationResult.receiptCode}
                  </span>
                </div>

                <div>
                  <span className="text-ink/60 font-bold block">Election Event:</span>
                  <span className="font-extrabold text-ink text-sm block mt-0.5">
                    {verificationResult.electionTitle}
                  </span>
                </div>

                <div>
                  <span className="text-ink/60 font-bold block">Timestamp:</span>
                  <span className="font-bold text-ink block mt-0.5">
                    {new Date(verificationResult.timestamp).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-ink/60 font-bold block">Election Status:</span>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-sun border border-ink text-[10px] font-black uppercase mt-1">
                    {verificationResult.electionStatus}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-bold text-ink/70 block mb-1">
                  SHA-256 Cryptographic Ballot Seal:
                </span>
                <div className="p-2.5 rounded-[10px] bg-slate-900 text-mint font-mono text-[10px] break-all border-2 border-ink select-all">
                  {verificationResult.encryptedVoteHash}
                </div>
              </div>

              <div className="p-3 bg-surface border border-ink rounded-[10px] text-xs font-semibold text-ink/80 flex items-start gap-2">
                <Lock size={16} className="text-violet flex-shrink-0 mt-0.5" />
                <span>{verificationResult.auditMessage}</span>
              </div>
            </div>
          )}

          {error && searched && (
            <div className="mt-8 p-6 rounded-[16px] bg-coral/30 border-2 border-ink shadow-neo-md space-y-2 animate-slide-up text-center">
              <AlertTriangle size={32} className="mx-auto text-coral" />
              <h3 className="font-black text-base text-ink">Verification Failed</h3>
              <p className="text-xs font-bold text-ink/80 max-w-sm mx-auto">{error}</p>
            </div>
          )}
        </Card>

        {/* Security Guarantee Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-ink">
          <div className="p-4 rounded-[12px] bg-surface border-2 border-ink shadow-neo-sm flex items-start gap-2.5">
            <Lock className="text-violet flex-shrink-0" size={18} />
            <div>
              <span className="font-black block">Zero-Knowledge Ballot Secrecy</span>
              <span className="text-ink/70 font-medium block mt-0.5">
                Receipts prove your vote was cast and counted without exposing which candidate you selected.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-[12px] bg-surface border-2 border-ink shadow-neo-sm flex items-start gap-2.5">
            <Hash className="text-violet flex-shrink-0" size={18} />
            <div>
              <span className="font-black block">SHA-256 Tamper Resistance</span>
              <span className="text-ink/70 font-medium block mt-0.5">
                Each ballot hash is salted with 16-byte entropy, preventing record manipulation or retro-fitting.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyReceiptPage;
