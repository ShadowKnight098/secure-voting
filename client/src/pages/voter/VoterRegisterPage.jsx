import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Hash, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useVoterAuth } from '../../context/VoterAuthContext';
import { voterService } from '../../services/voterService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FaceCapture from '../../components/biometrics/FaceCapture';

export const VoterRegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    voter_id_number: '',
    password: '',
    confirm_password: '',
    election_id: ''
  });
  const [faceData, setFaceData] = useState({
    photo: '',
    descriptor: null
  });
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useVoterAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const data = await voterService.getAvailableElections();
        setElections(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, election_id: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load elections', err);
      } finally {
        setLoadingElections(false);
      }
    };
    fetchElections();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleBiometricCapture = (captured) => {
    setFaceData({
      photo: captured.photo,
      descriptor: captured.descriptor
    });
    setError('');
  };

  const handleBiometricReset = () => {
    setFaceData({
      photo: '',
      descriptor: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.election_id) {
      setError('Please select an election');
      return;
    }

    if (!faceData.photo || !faceData.descriptor) {
      setError('Please capture your facial biometrics before submitting registration');
      return;
    }

    setSubmitting(true);
    const res = await register({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      voter_id_number: formData.voter_id_number,
      password: formData.password,
      election_id: parseInt(formData.election_id, 10),
      face_descriptor: faceData.descriptor,
      face_photo: faceData.photo
    });

    if (res.success) {
      navigate('/voter/dashboard');
    } else {
      setError(res.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative text-ink">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[14px] bg-violet text-white border-2 border-ink shadow-neo mb-4">
          <ShieldCheck className="w-8 h-8 text-sun" />
        </div>
        <h2 className="text-3xl font-extrabold text-ink tracking-tight">Voter registration</h2>
        <p className="mt-2 text-sm font-medium text-ink/70">
          Enroll in the Secure Electronic Voting System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <Card className="p-6 sm:p-10 shadow-neo-xl">
          {error && (
            <div className="mb-6 p-4 rounded-[12px] bg-coral border-2 border-ink text-ink text-sm font-bold shadow-neo-sm animate-slide-up flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="full_name"
                label="Full legal name"
                icon={User}
                placeholder="e.g. Johnathan Doe"
                value={formData.full_name}
                onChange={handleChange}
                required
              />

              <Input
                id="voter_id_number"
                label="National / Voter ID"
                icon={Hash}
                placeholder="e.g. VOTER-9821"
                value={formData.voter_id_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="email"
                type="email"
                label="Email address"
                icon={Mail}
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                id="phone"
                type="tel"
                label="Phone number"
                icon={Phone}
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="election_id" className="block text-sm font-semibold text-ink">
                Participating election <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <select
                  id="election_id"
                  value={formData.election_id}
                  onChange={handleChange}
                  disabled={loadingElections}
                  className="w-full bg-surface border-2 border-ink rounded-[12px] px-4 py-3 text-ink font-bold focus:outline-none focus:ring-4 focus:ring-sun/60 transition-all cursor-pointer"
                  required
                >
                  {loadingElections ? (
                    <option value="">Loading active elections...</option>
                  ) : elections.length === 0 ? (
                    <option value="">No active elections available</option>
                  ) : (
                    elections.map(el => (
                      <option key={el.id} value={el.id}>
                        {el.title} ({el.status.toUpperCase()})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Input
                id="password"
                type="password"
                label="Create password"
                icon={Lock}
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <Input
                id="confirm_password"
                type="password"
                label="Confirm password"
                icon={Lock}
                placeholder="Repeat password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
            </div>

            {/* Facial Biometric Enrollment Component */}
            <div className="pt-2">
              <FaceCapture
                capturedPhoto={faceData.photo}
                onCapture={handleBiometricCapture}
                onReset={handleBiometricReset}
              />
            </div>

            <div className="bg-lavender/70 border-2 border-ink rounded-[12px] p-4 text-xs font-medium text-ink space-y-1.5 shadow-neo-sm">
              <div className="flex items-center text-ink font-bold gap-1.5">
                <CheckCircle2 size={16} className="text-mint fill-ink" />
                <span>Biometric enrollment note:</span>
              </div>
              <p>• Your facial descriptor is recorded securely for 1-to-1 match verification.</p>
              <p>• Administrator will verify your identity before granting active ballot access.</p>
            </div>

            {/* One Main Action: Pink Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={submitting}
              className="mt-6 shadow-neo-lg"
            >
              Complete voter registration <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          <div className="mt-8 text-center text-sm font-semibold text-ink/70">
            Already registered?{' '}
            <Link to="/voter/login" className="text-violet hover:underline font-bold">
              Sign in to voter portal
            </Link>
          </div>
        </Card>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs font-bold text-ink/60 hover:text-ink">
            Are you an administrator? Switch to Admin Login →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VoterRegisterPage;
