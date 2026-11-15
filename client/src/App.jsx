import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ElectionsPage from './pages/admin/ElectionsPage';
import ElectionFormPage from './pages/admin/ElectionFormPage';
import CandidatesPage from './pages/admin/CandidatesPage';
import CandidateFormPage from './pages/admin/CandidateFormPage';
import VotersPage from './pages/admin/VotersPage';
import PartiesPage from './pages/admin/PartiesPage';
import AdminResultsPage from './pages/admin/AdminResultsPage';
import VerifyReceiptPage from './pages/VerifyReceiptPage';
import VoterLoginPage from './pages/voter/VoterLoginPage';
import VoterRegisterPage from './pages/voter/VoterRegisterPage';
import VoterDashboardPage from './pages/voter/VoterDashboardPage';
import VoterBallotPage from './pages/voter/VoterBallotPage';
import VoteReceiptPage from './pages/voter/VoteReceiptPage';
import ElectionResultsPage from './pages/ElectionResultsPage';
import AppLayout from './components/layout/AppLayout';
import VotingLoader from './components/ui/VotingLoader';
import useDelayedLoader from './hooks/useDelayedLoader';
import { useAuth } from './context/AuthContext';
import { useVoterAuth } from './context/VoterAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const showLoader = useDelayedLoader(loading, 650);
  
  if (showLoader) {
    return <VotingLoader message="Authenticating Admin..." submessage="Verifying session" />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const VoterProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useVoterAuth();
  const showLoader = useDelayedLoader(loading, 650);

  if (showLoader) {
    return <VotingLoader message="Loading Voter Portal..." submessage="Verifying credentials" />;
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
      <Route path="/voter/ballot/:electionId" element={
        <VoterProtectedRoute>
          <VoterBallotPage />
        </VoterProtectedRoute>
      } />
      <Route path="/voter/receipt/:electionId" element={
        <VoterProtectedRoute>
          <VoteReceiptPage />
        </VoterProtectedRoute>
      } />

      {/* Shared Results & Verification Pages */}
      <Route path="/elections/:id/results" element={<ElectionResultsPage />} />
      <Route path="/verify-receipt" element={<VerifyReceiptPage />} />

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

        <Route path="results" element={<AdminResultsPage />} />
        <Route path="voters" element={<VotersPage />} />
        <Route path="parties" element={<PartiesPage />} />
      </Route>
      
      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/voter/login" replace />} />
      <Route path="*" element={<Navigate to="/voter/login" replace />} />
    </Routes>
  );
}

export default App;
