import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, X, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { candidateService } from '../../services/candidateService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export const CandidateFormPage = () => {
  const { electionId, candidateId } = useParams();
  const isEdit = !!candidateId;
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    party: '',
    bio: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (isEdit) {
      const fetchCandidate = async () => {
        try {
          const data = await candidateService.getById(electionId, candidateId);
          setFormData({
            name: data.name || '',
            party: data.party || '',
            bio: data.bio || ''
          });
          if (data.photoUrl) setPhotoPreview(data.photoUrl);
        } catch (err) {
          toast.error('Failed to load candidate details');
          navigate(`/admin/elections/${electionId}/candidates`);
        } finally {
          setLoading(false);
        }
      };
      fetchCandidate();
    }
  }, [electionId, candidateId, navigate, isEdit]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('party', formData.party);
    payload.append('bio', formData.bio);
    if (photoFile) {
      payload.append('photo', photoFile);
    }

    try {
      if (isEdit) {
        await candidateService.update(electionId, candidateId, payload);
        toast.success('Candidate updated successfully');
      } else {
        await candidateService.create(electionId, payload);
        toast.success('Candidate added successfully');
      }
      navigate(`/admin/elections/${electionId}/candidates`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save candidate');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-96 rounded-xl animate-skeleton"></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => navigate(`/admin/elections/${electionId}/candidates`)}
          className="mr-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isEdit ? 'Edit Candidate' : 'Add New Candidate'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Provide candidate details and photo</p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
          
          {/* Photo Upload Section */}
          <div className="flex-shrink-0 w-full md:w-64 flex flex-col items-center">
            <div className="w-full relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className={`w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-colors
                ${photoPreview ? 'border-transparent bg-slate-800' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-indigo-500'}
              `}>
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium flex items-center bg-black/50 px-3 py-1.5 rounded-lg">
                        <Upload size={16} className="mr-2" /> Change Photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <User size={24} />
                    </div>
                    <span className="text-sm font-medium text-slate-300 block mb-1">Click to upload</span>
                    <span className="text-xs text-slate-500">JPG, PNG, GIF up to 5MB</span>
                  </div>
                )}
              </div>
            </div>
            
            {photoPreview && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); setPhotoFile(null); }}
                className="mt-3 text-sm text-red-400 hover:text-red-300 flex items-center"
              >
                <X size={14} className="mr-1" /> Remove photo
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg, image/png, image/gif" 
              className="hidden" 
            />
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-5">
            <Input
              id="name"
              label="Full Name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              required
            />

            <Input
              id="party"
              label="Political Party"
              value={formData.party}
              onChange={handleChange}
              placeholder="e.g. Independent"
              required
            />

            <Input
              id="bio"
              type="textarea"
              label="Biography"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Short bio or manifesto..."
              rows={5}
            />

            <div className="pt-4 flex justify-end gap-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => navigate(`/admin/elections/${electionId}/candidates`)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {isEdit ? 'Save Changes' : 'Add Candidate'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CandidateFormPage;
