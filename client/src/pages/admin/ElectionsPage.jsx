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
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, title: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch,
        status: statusFilter === 'All' ? undefined : statusFilter.toLowerCase(),
      };
      const res = await electionService.getAll(params);
      setElections(res.data);
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
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Manage Elections</h2>
        <Button onClick={() => navigate('/admin/elections/new')} icon={Plus}>
          Create Election
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-96">
            <Input 
              icon={Search} 
              placeholder="Search elections..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto pb-2 md:pb-0 hide-scrollbar gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${statusFilter === tab 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg animate-skeleton"></div>)}
          </div>
        ) : elections.length === 0 ? (
          <EmptyState 
            title="No elections found" 
            description="Get started by creating a new election event."
            actionLabel="Create Election"
            onAction={() => navigate('/admin/elections/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700/50 text-sm text-slate-400">
                  <th className="pb-3 px-4 font-medium">Title</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium">Duration</th>
                  <th className="pb-3 px-4 font-medium text-center">Candidates</th>
                  <th className="pb-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map(election => (
                  <tr key={election.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4 font-medium text-white">{election.title}</td>
                    <td className="py-4 px-4"><Badge status={election.status} /></td>
                    <td className="py-4 px-4 text-sm text-slate-300">
                      {formatDate(election.startDate)} - {formatDate(election.endDate)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-800 text-slate-300 rounded-full h-8 px-3 text-sm border border-slate-700">
                        {election.candidateCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                          title="Manage Candidates"
                          className="px-2"
                        >
                          <Eye size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/admin/elections/${election.id}/edit`)}
                          title="Edit Election"
                          className="px-2"
                        >
                          <Edit2 size={18} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteDialog({ isOpen: true, id: election.id, title: election.title })}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </Button>
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
        message={`Are you sure you want to delete "${deleteDialog.title}"? This action cannot be undone and will remove all associated candidates and votes.`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ElectionsPage;
