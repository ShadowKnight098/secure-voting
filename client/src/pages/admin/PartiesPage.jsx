import React, { useState, useEffect } from 'react';
import { Flag, Plus, Trash2, Edit2, Search, Users, AlertCircle, Building2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { partyService } from '../../services/partyService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';

export const PartiesPage = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    logo_url: ''
  });

  // Delete confirm dialog
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '', candidateCount: 0 });

  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await partyService.getAll();
      setParties(data || []);
    } catch (err) {
      toast.error('Failed to load political parties roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleOpenCreate = () => {
    setEditingParty(null);
    setFormData({ name: '', code: '', description: '', logo_url: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (party) => {
    setEditingParty(party);
    setFormData({
      name: party.name || '',
      code: party.code || '',
      description: party.description || '',
      logo_url: party.logo_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Party name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingParty) {
        await partyService.update(editingParty.id, formData);
        toast.success(`Party "${formData.name}" updated successfully`);
      } else {
        await partyService.create(formData);
        toast.success(`Party "${formData.name}" created successfully`);
      }
      setIsModalOpen(false);
      fetchParties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save party');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await partyService.delete(deleteDialog.id);
      toast.success('Party removed successfully');
      setDeleteDialog({ isOpen: false, id: null, name: '', candidateCount: 0 });
      fetchParties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete party');
    }
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <Building2 className="text-violet" size={30} />
            Political Parties
          </h2>
          <p className="text-ink/70 font-medium text-sm mt-1">
            Register and manage recognized political parties, organizations, and independent rosters.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
          Add Party
        </Button>
      </div>

      <Card className="p-4 sm:p-6 shadow-neo">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-stretch sm:items-center">
          <div className="w-full sm:w-80">
            <Input
              icon={Search}
              placeholder="Search parties or codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs font-bold text-ink/70 flex items-center gap-1.5 px-3 py-1.5 bg-lavender/60 border border-ink rounded-[10px]">
            <Building2 size={15} className="text-violet" />
            <span>Total Parties: <strong>{parties.length}</strong></span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-[14px] animate-skeleton"></div>
            ))}
          </div>
        ) : filteredParties.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={searchTerm ? 'No parties matching search' : 'No political parties registered'}
            description={searchTerm ? 'Try a different search keyword.' : 'Add your first political party to associate candidates with.'}
            actionLabel="Add Party"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredParties.map((party) => (
              <Card
                key={party.id}
                hover
                className="p-5 flex flex-col justify-between relative group border-2 border-ink shadow-neo"
              >
                <div>
                  {/* Top Bar: Code badge + Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-violet text-white text-xs font-black rounded-full border border-ink shadow-neo-sm">
                      {party.code || 'PARTY'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(party)}
                        className="p-1.5 rounded-[8px] bg-surface border-2 border-ink shadow-neo-sm text-ink hover:bg-lavender hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                        title="Edit party"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({
                          isOpen: true,
                          id: party.id,
                          name: party.name,
                          candidateCount: party.candidate_count || 0
                        })}
                        className="p-1.5 rounded-[8px] bg-coral border-2 border-ink shadow-neo-sm text-ink hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                        title="Delete party"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Party Name */}
                  <h3 className="text-lg font-black text-ink tracking-tight">{party.name}</h3>

                  {/* Description */}
                  {party.description ? (
                    <p className="text-xs font-medium text-ink/75 mt-2 line-clamp-3 leading-relaxed">
                      {party.description}
                    </p>
                  ) : (
                    <p className="text-xs italic text-ink/50 mt-2">No description provided</p>
                  )}
                </div>

                {/* Footer Count */}
                <div className="mt-5 pt-3 border-t-2 border-ink/10 flex items-center justify-between text-xs font-bold text-ink/70">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-violet" />
                    <span>{party.candidate_count || 0} Candidate{(party.candidate_count !== 1) ? 's' : ''}</span>
                  </span>
                  <span className="text-[10px] uppercase font-black text-ink/50">Active Roster</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingParty ? 'Edit Political Party' : 'Add New Political Party'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-ink">
          <div>
            <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
              Party Name <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Liberty Alliance Party"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded-[10px] text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-violet"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
              Party Abbreviation / Code
            </label>
            <input
              type="text"
              placeholder="e.g. LAP"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded-[10px] text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-violet"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
              Party Manifesto / Description
            </label>
            <textarea
              rows={3}
              placeholder="Core values, policies, or manifesto overview..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded-[10px] text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-violet"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t-2 border-ink">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              {editingParty ? 'Save Changes' : 'Create Party'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, name: '', candidateCount: 0 })}
        onConfirm={handleDelete}
        title="Delete Political Party"
        message={`Are you sure you want to remove "${deleteDialog.name}"? ${
          deleteDialog.candidateCount > 0 
            ? `Note: ${deleteDialog.candidateCount} candidate(s) currently belong to this party.` 
            : ''
        }`}
      />
    </div>
  );
};

export default PartiesPage;
