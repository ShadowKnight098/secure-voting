import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { electionService } from '../../services/electionService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export const ElectionFormPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming'
  });

  useEffect(() => {
    if (isEdit) {
      const fetchElection = async () => {
        try {
          const data = await electionService.getById(id);
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toISOString().split('T')[0];
          };
          
          setFormData({
            title: data.title || '',
            description: data.description || '',
            startDate: formatDate(data.startDate),
            endDate: formatDate(data.endDate),
            status: data.status || 'upcoming'
          });
        } catch (err) {
          toast.error('Failed to load election details');
          navigate('/admin/elections');
        } finally {
          setLoading(false);
        }
      };
      fetchElection();
    }
  }, [id, navigate, isEdit]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('End date must be on or after start date');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (isEdit) {
        await electionService.update(id, payload);
        toast.success('Election updated successfully');
      } else {
        await electionService.create(payload);
        toast.success('Election created successfully');
      }
      navigate('/admin/elections');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save election');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-[14px] animate-skeleton max-w-3xl mx-auto"></div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up text-ink">
      <button 
        onClick={() => navigate('/admin/elections')}
        className="inline-flex items-center text-sm font-bold text-ink bg-surface border-2 border-ink px-3 py-1.5 rounded-[10px] shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-all mb-6"
      >
        <ArrowLeft size={16} className="mr-1.5" />
        Back to elections
      </button>

      <Card className="p-6 md:p-8 shadow-neo-xl">
        <div className="mb-6 pb-4 border-b-2 border-ink">
          <div className="inline-block px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-bold text-ink shadow-neo-sm mb-2">
            {isEdit ? 'Configuration' : 'New Event'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
            {isEdit ? 'Edit election details' : 'Create new election'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="title"
            label="Election title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Student Council General Election 2026"
            required
          />

          <Input
            id="description"
            type="textarea"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide context and guidelines about this election event..."
            rows={4}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="startDate"
              type="date"
              label="Voting start date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <Input
              id="endDate"
              type="date"
              label="Voting end date"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>

          {isEdit && (
            <Input
              id="status"
              type="select"
              label="Election status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Input>
          )}

          <div className="pt-6 flex justify-end gap-4 border-t-2 border-ink">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => navigate('/admin/elections')} 
              disabled={submitting}
            >
              Cancel
            </Button>
            {/* One Main Pink Action */}
            <Button 
              type="submit" 
              variant="primary"
              loading={submitting}
            >
              {isEdit ? 'Save changes' : 'Create election'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ElectionFormPage;
