import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
          const res = await electionService.getById(id);
          const data = res;
          // Format dates for input type="datetime-local"
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
    
    // Basic validation
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error('End date must be after start date');
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
    return <div className="h-96 rounded-xl animate-skeleton"></div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <button 
        onClick={() => navigate('/admin/elections')}
        className="flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Elections
      </button>

      <Card className="p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          {isEdit ? 'Edit Election' : 'Create New Election'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="title"
            label="Election Title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Presidential Election 2026"
            required
          />

          <Input
            id="description"
            type="textarea"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide details about this election..."
            rows={4}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="startDate"
              type="datetime-local"
              label="Start Date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <Input
              id="endDate"
              type="datetime-local"
              label="End Date"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>

          {isEdit && (
            <Input
              id="status"
              type="select"
              label="Status"
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

          <div className="pt-4 flex justify-end gap-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/elections')} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save Changes' : 'Create Election'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ElectionFormPage;
