import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Vote, 
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
  { id: 'all', label: 'All voters' },
  { id: 'verified', label: 'Verified', status: '1' },
  { id: 'pending', label: 'Pending verification', status: '0' }
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

  // Photo Preview State
  const [photoPreview, setPhotoPreview] = useState(null);

  return (
    <div className="space-y-6 animate-fade-in text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Voter directory</h2>
          <p className="text-ink/70 font-medium text-sm mt-1">
            Manage voter registrations, review facial biometrics, and approve verifications.
          </p>
        </div>
        {/* One Main Pink Action */}
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} icon={UserPlus}>
          Add voter
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
                className="w-full bg-surface border-2 border-ink rounded-[12px] px-4 py-3 text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-sun/60 transition-all cursor-pointer"
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
                  px-4 py-2 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap transition-all border-2 border-ink
                  ${activeTab === tab.id
                    ? 'bg-sun text-ink font-extrabold shadow-neo-sm -translate-y-0.5'
                    : 'bg-surface text-ink hover:bg-lavender hover:shadow-neo-sm'
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
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-[12px] animate-skeleton"></div>
            ))}
          </div>
        ) : voters.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No voters found"
            description={
              searchTerm || selectedElection || activeTab !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Get started by enrolling voters or accepting registrations.'
            }
            actionLabel="Add voter"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-lavender border-b-2 border-ink text-xs font-extrabold uppercase text-ink tracking-wider">
                  <th className="py-3.5 px-4">Voter Identity</th>
                  <th className="py-3.5 px-4">Biometrics</th>
                  <th className="py-3.5 px-4">Voter ID</th>
                  <th className="py-3.5 px-4">Assigned Election</th>
                  <th className="py-3.5 px-4 text-center">Verification Status</th>
                  <th className="py-3.5 px-4 text-center">Vote Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink text-sm">
                {voters.map((voter) => {
                  const isVerified = voter.is_verified === 1;
                  const hasVoted = voter.has_voted === 1;
                  const hasFace = voter.has_face_data === 1 || !!voter.face_photo_url;
                  return (
                    <tr
                      key={voter.id}
                      className="hover:bg-lavender/60 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[10px] border-2 border-ink bg-violet text-white font-extrabold flex items-center justify-center shadow-neo-sm flex-shrink-0 overflow-hidden">
                            {voter.face_photo_url ? (
                              <img 
                                src={voter.face_photo_url} 
                                alt={voter.full_name} 
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setPhotoPreview({ url: voter.face_photo_url, name: voter.full_name })}
                              />
                            ) : (
                              <span>{voter.full_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-ink text-base">{voter.full_name}</div>
                            <div className="text-xs text-ink/75 font-medium flex items-center gap-2 mt-0.5">
                              <span className="truncate max-w-[180px]">{voter.email}</span>
                              {voter.phone && <span>• {voter.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Biometric Status */}
                      <td className="py-4 px-4">
                        {hasFace ? (
                          <button
                            onClick={() => voter.face_photo_url && setPhotoPreview({ url: voter.face_photo_url, name: voter.full_name })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-mint text-ink font-bold text-xs border-2 border-ink shadow-neo-sm hover:-translate-y-0.5 transition-all"
                            title="Click to view enrolled face scan"
                          >
                            <span>📸</span> Enrolled
                          </button>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-[8px] bg-surface text-ink/60 font-bold text-xs border-2 border-ink/40">
                            No Scan
                          </span>
                        )}
                      </td>

                      {/* Voter ID */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-[8px] bg-lavender/80 border-2 border-ink font-mono font-bold text-xs text-ink shadow-neo-sm">
                          {voter.voter_id_number}
                        </span>
                      </td>

                      {/* Election */}
                      <td className="py-4 px-4 font-bold text-ink">
                        {voter.election_title || 'General Election'}
                      </td>

                      {/* Verification Status with Toggle Button */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleVerify(voter)}
                          disabled={togglingId === voter.id}
                          className={`
                            inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border-2 border-ink shadow-neo-sm hover:shadow-neo-hover active:shadow-neo-active hover:-translate-y-0.5 active:translate-y-0.5 transition-all
                            ${isVerified
                              ? 'bg-mint text-ink font-bold'
                              : 'bg-sun text-ink font-bold'
                            }
                          `}
                          title="Click to toggle verification status"
                        >
                          {togglingId === voter.id ? (
                            <span className="animate-spin">⏳</span>
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
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky text-ink border-2 border-ink shadow-neo-sm">
                            <Vote size={14} /> Voted
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-surface text-ink/75 border-2 border-ink shadow-neo-sm">
                            Not Voted
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setDeleteDialog({ isOpen: true, id: voter.id, name: voter.full_name })}
                          className="p-2 rounded-[10px] bg-coral border-2 border-ink shadow-neo-sm text-ink hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                          title="Delete Voter"
                        >
                          <Trash2 size={15} />
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t-2 border-ink text-sm font-medium text-ink">
            <div>
              Showing <span className="font-bold">{voters.length}</span> of{' '}
              <span className="font-bold">{pagination.total}</span> registered voters
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchVoters(pagination.page - 1)}
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </Button>
              <span className="px-3 py-1.5 bg-sun border-2 border-ink rounded-[10px] text-ink font-bold text-xs shadow-neo-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVoters(pagination.page + 1)}
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Voter Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !creating && setIsCreateModalOpen(false)}
        title="Register new voter"
      >
        <form onSubmit={handleCreateVoter} className="space-y-4">
          <Input
            id="full_name"
            label="Full legal name"
            placeholder="e.g. Eleanor Vance"
            value={newVoter.full_name}
            onChange={(e) => setNewVoter({ ...newVoter, full_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="voter_id_number"
              label="Voter ID number"
              placeholder="e.g. VOTER-2044"
              value={newVoter.voter_id_number}
              onChange={(e) => setNewVoter({ ...newVoter, voter_id_number: e.target.value })}
              required
            />
            <Input
              id="email"
              type="email"
              label="Email address"
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
              label="Phone number"
              placeholder="+1 555-0182"
              value={newVoter.phone}
              onChange={(e) => setNewVoter({ ...newVoter, phone: e.target.value })}
            />
            <Input
              id="password"
              type="password"
              label="Default password"
              placeholder="Default: voter123"
              value={newVoter.password}
              onChange={(e) => setNewVoter({ ...newVoter, password: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-ink">
              Assigned election <span className="text-coral">*</span>
            </label>
            <select
              value={newVoter.election_id}
              onChange={(e) => setNewVoter({ ...newVoter, election_id: e.target.value })}
              className="w-full bg-surface border-2 border-ink rounded-[12px] px-4 py-3 text-sm font-bold text-ink focus:outline-none focus:ring-4 focus:ring-sun/60 cursor-pointer"
              required
            >
              <option value="">Select election</option>
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
              className="w-5 h-5 rounded-[6px] bg-surface border-2 border-ink text-violet focus:ring-sun cursor-pointer"
            />
            <label htmlFor="is_verified" className="text-sm font-bold text-ink cursor-pointer">
              Mark as Verified immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-ink">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            {/* One Main Pink Action */}
            <Button type="submit" variant="primary" loading={creating}>
              Register voter
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => !isDeleting && setDeleteDialog({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDeleteVoter}
        title="Delete voter record"
        message={`Are you sure you want to delete "${deleteDialog.name}"? This voter will not be able to participate in the election.`}
        isLoading={isDeleting}
      />

      {/* Enrolled Face Photo Preview Modal */}
      <Modal
        isOpen={!!photoPreview}
        onClose={() => setPhotoPreview(null)}
        title={`Biometric Scan: ${photoPreview?.name || 'Voter'}`}
      >
        <div className="text-center space-y-4">
          <div className="w-full max-w-sm mx-auto aspect-square rounded-[14px] border-2 border-ink overflow-hidden shadow-neo bg-slate-900">
            {photoPreview?.url && (
              <img
                src={photoPreview.url}
                alt={photoPreview.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="p-3 bg-mint/40 border-2 border-ink rounded-[10px] text-xs font-bold text-ink">
            ✓ 128-dimensional biometric descriptor is securely linked in the database
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setPhotoPreview(null)}>
              Close preview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VotersPage;
