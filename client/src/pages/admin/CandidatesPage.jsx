import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, UserPlus, Trash2, Edit2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidateService } from '../../services/candidateService';
import { electionService } from '../../services/electionService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export const CandidatesPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candRes, elRes] = await Promise.all([
        candidateService.getByElectionId(electionId),
        electionService.getById(electionId)
      ]);
      setCandidates(candRes.data || []);
      setElection(elRes || { title: 'Unknown Election' });
    } catch (err) {
      toast.error('Failed to load candidate roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [electionId]);

  const handleDelete = async () => {
    try {
      await candidateService.delete(electionId, deleteDialog.id);
      toast.success('Candidate deleted successfully');
      setDeleteDialog({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete candidate');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-ink">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-xs sm:text-sm font-bold text-ink/70">
        <Link to="/admin/elections" className="hover:underline">Elections</Link>
        <ChevronRight size={16} className="mx-1.5" />
        <span className="text-ink truncate max-w-xs">{election?.title || 'Loading...'}</span>
        <ChevronRight size={16} className="mx-1.5" />
        <span className="text-violet">Candidates</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Candidate roster</h2>
          <p className="text-ink/70 font-medium text-sm mt-1">{election?.title}</p>
        </div>
        {/* One Main Pink Action */}
        <Button variant="primary" onClick={() => navigate(`/admin/elections/${electionId}/candidates/new`)} icon={UserPlus}>
          Add candidate
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-56 rounded-[14px] animate-skeleton"></div>)}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="p-12">
          <EmptyState 
            icon={User}
            title="No candidates registered yet" 
            description="Add the first candidate to this election roster."
            actionLabel="Add candidate"
            onAction={() => navigate(`/admin/elections/${electionId}/candidates/new`)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {candidates.map(candidate => (
            <Card key={candidate.id} hover className="p-5 flex flex-col justify-between relative group">
              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => navigate(`/admin/elections/${electionId}/candidates/${candidate.id}/edit`)}
                  className="p-1.5 rounded-[8px] bg-surface border-2 border-ink shadow-neo-sm text-ink hover:bg-lavender hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                  title="Edit candidate"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => setDeleteDialog({ isOpen: true, id: candidate.id, name: candidate.name })}
                  className="p-1.5 rounded-[8px] bg-coral border-2 border-ink shadow-neo-sm text-ink hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                  title="Delete candidate"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Candidate Info with Identical Styling Rule */}
              <div className="flex items-center flex-col text-center pt-2">
                <div className="w-20 h-20 rounded-[12px] overflow-hidden border-2 border-ink bg-violet text-white shadow-neo-sm mb-4 flex items-center justify-center relative flex-shrink-0">
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-extrabold text-white">
                      {candidate.name?.charAt(0).toUpperCase() || 'C'}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-extrabold text-ink">{candidate.name}</h3>
                
                <span className="inline-block mt-2 px-3 py-0.5 bg-lavender text-ink border-2 border-ink shadow-neo-sm rounded-full text-xs font-bold">
                  {candidate.party || 'Independent'}
                </span>

                {candidate.bio && (
                  <p className="text-xs font-medium text-ink/70 mt-3 line-clamp-2 px-1">
                    {candidate.bio}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Remove Candidate"
        message={`Are you sure you want to remove "${deleteDialog.name}" from this election?`}
      />
    </div>
  );
};

export default CandidatesPage;
