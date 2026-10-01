import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ElectionsPage from './pages/admin/ElectionsPage';
import ElectionFormPage from './pages/admin/ElectionFormPage';
import CandidatesPage from './pages/admin/CandidatesPage';
import CandidateFormPage from './pages/admin/CandidateFormPage';
import VotersPage from './pages/admin/VotersPage';
import VoterLoginPage from './pages/voter/VoterLoginPage';
import VoterRegisterPage from './pages/voter/VoterRegisterPage';
import VoterDashboardPage from './pages/voter/VoterDashboardPage';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';
import { useVoterAuth } from './context/VoterAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const VoterProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useVoterAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/voter/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Admin Auth */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Voter Portal Public & Protected Routes */}
      <Route path="/voter/login" element={<VoterLoginPage />} />
      <Route path="/voter/register" element={<VoterRegisterPage />} />
      <Route path="/voter/dashboard" element={
        <VoterProtectedRoute>
          <VoterDashboardPage />
        </VoterProtectedRoute>
      } />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <AppLayout />
        </AdminProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        <Route path="elections" element={<ElectionsPage />} />
        <Route path="elections/new" element={<ElectionFormPage />} />
        <Route path="elections/:id/edit" element={<ElectionFormPage />} />
        
        <Route path="elections/:electionId/candidates" element={<CandidatesPage />} />
        <Route path="elections/:electionId/candidates/new" element={<CandidateFormPage />} />
        <Route path="elections/:electionId/candidates/:candidateId/edit" element={<CandidateFormPage />} />

        <Route path="voters" element={<VotersPage />} />
      </Route>
      
      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/voter/login" replace />} />
      <Route path="*" element={<Navigate to="/voter/login" replace />} />
    </Routes>
  );
}

export default App;
