import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, ChevronRight, UserPlus, Trash2, Edit2, User } from 'lucide-react';
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
      toast.error('Failed to load data');
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
      toast.success('Candidate deleted');
      setDeleteDialog({ isOpen: false, id: null, name: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete candidate');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-400">
        <Link to="/admin/elections" className="hover:text-white transition-colors">Elections</Link>
        <ChevronRight size={16} className="mx-2" />
        <span className="text-slate-300 font-medium truncate max-w-xs">{election?.title || 'Loading...'}</span>
        <ChevronRight size={16} className="mx-2" />
        <span className="text-white font-medium">Candidates</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Manage Candidates</h2>
          <p className="text-slate-400 mt-1">{election?.title}</p>
        </div>
        <Button onClick={() => navigate(`/admin/elections/${electionId}/candidates/new`)} icon={UserPlus}>
          Add Candidate
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl animate-skeleton"></div>)}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="p-12">
          <EmptyState 
            icon={User}
            title="No candidates yet" 
            description="Add the first candidate to this election."
            actionLabel="Add Candidate"
            onAction={() => navigate(`/admin/elections/${electionId}/candidates/new`)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {candidates.map(candidate => (
            <Card key={candidate.id} hover className="p-5 flex flex-col group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={() => navigate(`/admin/elections/${electionId}/candidates/${candidate.id}/edit`)}
                  className="p-1.5 rounded bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 backdrop-blur"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteDialog({ isOpen: true, id: candidate.id, name: candidate.name })}
                  className="p-1.5 rounded bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 backdrop-blur"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center flex-col text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 mb-4 flex-shrink-0 relative">
                  {candidate.photoUrl ? (
                    <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">{candidate.name}</h3>
                <span className="inline-block mt-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold">
                  {candidate.party}
                </span>
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
        message={`Are you sure you want to remove ${deleteDialog.name} from this election?`}
      />
    </div>
  );
};

export default CandidatesPage;
