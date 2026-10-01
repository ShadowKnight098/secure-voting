import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  Filter, 
  Mail, 
  Phone, 
  Hash, 
  Vote, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminVoterService } from '../../services/adminVoterService';
import { electionService } from '../../services/electionService';
import { useDebounce } from '../../hooks/useDebounce';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const verificationTabs = [
  { id: 'all', label: 'All Voters' },
  { id: 'verified', label: 'Verified', status: '1' },
  { id: 'pending', label: 'Pending Verification', status: '0' }
];

export const VotersPage = () => {
  const [voters, setVoters] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedElection, setSelectedElection] = useState('');
  const [elections, setElections] = useState([]);

  // Create Voter Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVoter, setNewVoter] = useState({
    full_name: '',
    email: '',
    phone: '',
    voter_id_number: '',
    password: '',
    election_id: '',
    is_verified: true
  });

  // Delete State
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling verification loading state
  const [togglingId, setTogglingId] = useState(null);

  const fetchElectionsList = async () => {
    try {
      const res = await electionService.getAll({ limit: 100 });
      setElections(res.data || []);
    } catch (err) {
      console.error('Failed to load elections', err);
    }
  };

  const fetchVoters = async (page = 1) => {
    setLoading(true);
    try {
      const is_verified = activeTab === 'verified' ? '1' : activeTab === 'pending' ? '0' : undefined;
      const params = {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        election_id: selectedElection || undefined,
        is_verified
      };

      const res = await adminVoterService.getAll(params);
      setVoters(res.voters || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error('Failed to fetch voters list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionsList();
  }, []);

  useEffect(() => {
    fetchVoters(1);
  }, [debouncedSearch, activeTab, selectedElection]);

  const handleToggleVerify = async (voter) => {
    setTogglingId(voter.id);
    const newStatus = voter.is_verified ? 0 : 1;
    try {
      await adminVoterService.toggleVerify(voter.id, newStatus);
      toast.success(newStatus === 1 ? `${voter.full_name} verified` : `${voter.full_name} unverified`);
      fetchVoters(pagination.page);
    } catch (err) {
      toast.error('Failed to update verification status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteVoter = async () => {
    setIsDeleting(true);
    try {
      await adminVoterService.delete(deleteDialog.id);
      toast.success('Voter removed successfully');
      setDeleteDialog({ isOpen: false, id: null, name: '' });
      fetchVoters(pagination.page);
    } catch (err) {
      toast.error('Failed to delete voter');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateVoter = async (e) => {
    e.preventDefault();
    if (!newVoter.election_id) {
      toast.error('Please select an election for this voter');
      return;
    }

    setCreating(true);
    try {
      await adminVoterService.create({
        ...newVoter,
        election_id: parseInt(newVoter.election_id, 10),
        is_verified: newVoter.is_verified ? 1 : 0
      });
      toast.success('Voter registered successfully');
      setIsCreateModalOpen(false);
      setNewVoter({
        full_name: '',
        email: '',
        phone: '',
        voter_id_number: '',
        password: '',
        election_id: '',
        is_verified: true
      });
      fetchVoters(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create voter');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Voter Directory</h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage voter registrations, grant verification, and track voting status.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} icon={UserPlus}>
          Add Voter
        </Button>
      </div>

      {/* Main Card */}
      <Card className="p-4 sm:p-6">
        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="w-full sm:w-80">
              <Input
                icon={Search}
                placeholder="Search by name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedElection}
                onChange={(e) => setSelectedElection(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Elections</option>
                {elections.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Verification Tabs */}
          <div className="flex overflow-x-auto pb-2 lg:pb-0 gap-2">
            {verificationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl animate-skeleton"></div>
            ))}
          </div>
        ) : voters.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No voters found"
            description={
              searchTerm || selectedElection || activeTab !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by enrolling voters or accepting registrations.'
            }
            actionLabel="Add Voter"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="pb-3 px-4">Voter Identity</th>
                  <th className="pb-3 px-4">Voter ID</th>
                  <th className="pb-3 px-4">Assigned Election</th>
                  <th className="pb-3 px-4 text-center">Verification Status</th>
                  <th className="pb-3 px-4 text-center">Vote Cast</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {voters.map((voter) => {
                  const isVerified = voter.is_verified === 1;
                  const hasVoted = voter.has_voted === 1;
                  return (
                    <tr
                      key={voter.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{voter.full_name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="truncate max-w-[180px]">{voter.email}</span>
                          {voter.phone && <span>• {voter.phone}</span>}
                        </div>
                      </td>

                      {/* Voter ID */}
                      <td className="py-4 px-4 font-mono text-indigo-300 font-medium">
                        {voter.voter_id_number}
                      </td>

                      {/* Election */}
                      <td className="py-4 px-4">
                        <span className="text-slate-300 font-medium">
                          {voter.election_title || 'General Election'}
                        </span>
                      </td>

                      {/* Verification Status with Toggle Button */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleVerify(voter)}
                          disabled={togglingId === voter.id}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all
                            ${isVerified
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                            }
                          `}
                          title="Click to toggle verification status"
                        >
                          {togglingId === voter.id ? (
                            <span className="animate-spin text-xs">⏳</span>
                          ) : isVerified ? (
                            <>
                              <CheckCircle2 size={14} /> Verified
                            </>
                          ) : (
                            <>
                              <Clock size={14} /> Pending (Click to Verify)
                            </>
                          )}
                        </button>
                      </td>

                      {/* Voting Status */}
                      <td className="py-4 px-4 text-center">
                        {hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            <Vote size={13} /> Voted
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Not Voted
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setDeleteDialog({ isOpen: true, id: voter.id, name: voter.full_name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Voter"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-800 text-sm text-slate-400">
            <div>
              Showing <span className="text-white font-medium">{voters.length}</span> of{' '}
              <span className="text-white font-medium">{pagination.total}</span> voters
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchVoters(pagination.page - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </Button>
              <span className="px-3 py-1 bg-slate-800 rounded-lg text-white font-medium text-xs">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVoters(pagination.page + 1)}
              >
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Voter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !creating && setIsCreateModalOpen(false)}
        title="Register New Voter"
      >
        <form onSubmit={handleCreateVoter} className="space-y-4">
          <Input
            id="full_name"
            label="Full Legal Name"
            placeholder="e.g. Eleanor Vance"
            value={newVoter.full_name}
            onChange={(e) => setNewVoter({ ...newVoter, full_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="voter_id_number"
              label="Voter ID Number"
              placeholder="e.g. VOTER-2044"
              value={newVoter.voter_id_number}
              onChange={(e) => setNewVoter({ ...newVoter, voter_id_number: e.target.value })}
              required
            />
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="voter@example.com"
              value={newVoter.email}
              onChange={(e) => setNewVoter({ ...newVoter, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="phone"
              type="tel"
              label="Phone Number"
              placeholder="+1 555-0182"
              value={newVoter.phone}
              onChange={(e) => setNewVoter({ ...newVoter, phone: e.target.value })}
            />
            <Input
              id="password"
              type="password"
              label="Default Password"
              placeholder="Default: voter123"
              value={newVoter.password}
              onChange={(e) => setNewVoter({ ...newVoter, password: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Assigned Election <span className="text-red-400">*</span>
            </label>
            <select
              value={newVoter.election_id}
              onChange={(e) => setNewVoter({ ...newVoter, election_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Election</option>
              {elections.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_verified"
              checked={newVoter.is_verified}
              onChange={(e) => setNewVoter({ ...newVoter, is_verified: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_verified" className="text-sm text-slate-300">
              Mark as Verified immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Register Voter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => !isDeleting && setDeleteDialog({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDeleteVoter}
        title="Delete Voter Record"
        message={`Are you sure you want to delete "${deleteDialog.name}"? This voter will not be able to participate in the election.`}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default VotersPage;
