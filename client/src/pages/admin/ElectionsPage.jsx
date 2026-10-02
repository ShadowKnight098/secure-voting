import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electionService } from '../../services/electionService';
import { useDebounce } from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const statusTabs = ['All', 'Upcoming', 'Active', 'Completed', 'Cancelled'];

export const ElectionsPage = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, title: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch || undefined,
        status: statusFilter === 'All' ? undefined : statusFilter.toLowerCase(),
      };
      const res = await electionService.getAll(params);
      setElections(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch elections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await electionService.delete(deleteDialog.id);
      toast.success('Election deleted successfully');
      setDeleteDialog({ isOpen: false, id: null, title: '' });
      fetchElections();
    } catch (err) {
      toast.error('Failed to delete election');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6 animate-fade-in text-ink">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Manage elections</h2>
          <p className="text-ink/70 font-medium text-sm mt-1">Configure election timelines, candidate rosters, and statuses.</p>
        </div>
        {/* One Main Pink Action */}
        <Button variant="primary" onClick={() => navigate('/admin/elections/new')} icon={Plus}>
          Create election
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center">
          <div className="w-full md:w-80">
            <Input 
              icon={Search} 
              placeholder="Search elections..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`
                  px-4 py-2 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap transition-all border-2 border-ink
                  ${statusFilter === tab 
                    ? 'bg-sun text-ink font-extrabold shadow-neo-sm -translate-y-0.5' 
                    : 'bg-surface text-ink hover:bg-lavender hover:shadow-neo-sm'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-[12px] animate-skeleton"></div>)}
          </div>
        ) : elections.length === 0 ? (
          <EmptyState 
            title="No elections found" 
            description="Get started by creating a new election event."
            actionLabel="Create election"
            onAction={() => navigate('/admin/elections/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-lavender border-b-2 border-ink text-xs font-extrabold uppercase text-ink tracking-wider">
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 text-center">Candidates</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink text-sm">
                {elections.map(election => (
                  <tr key={election.id} className="hover:bg-lavender/60 transition-colors group">
                    <td className="py-4 px-4 font-bold text-ink text-base">{election.title}</td>
                    <td className="py-4 px-4"><Badge status={election.status} /></td>
                    <td className="py-4 px-4 text-sm font-semibold text-ink/85">
                      {formatDate(election.startDate)} – {formatDate(election.endDate)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-surface text-ink font-mono font-bold rounded-full h-8 px-3 text-xs border-2 border-ink shadow-neo-sm">
                        {election.candidateCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                          title="Manage Candidates"
                          className="p-2 rounded-[10px] bg-surface border-2 border-ink shadow-neo-sm text-ink hover:bg-lavender hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/elections/${election.id}/edit`)}
                          title="Edit Election"
                          className="p-2 rounded-[10px] bg-surface border-2 border-ink shadow-neo-sm text-ink hover:bg-lavender hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteDialog({ isOpen: true, id: election.id, title: election.title })}
                          className="p-2 rounded-[10px] bg-coral border-2 border-ink shadow-neo-sm text-ink hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                          title="Delete Election"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => !isDeleting && setDeleteDialog({ isOpen: false, id: null, title: '' })}
        onConfirm={handleDelete}
        title="Delete Election"
        message={`Are you sure you want to delete "${deleteDialog.title}"? This action cannot be undone and will remove all associated candidates.`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ElectionsPage;
