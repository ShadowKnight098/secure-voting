import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ElectionsPage from './pages/admin/ElectionsPage';
import ElectionFormPage from './pages/admin/ElectionFormPage';
import CandidatesPage from './pages/admin/CandidatesPage';
import CandidateFormPage from './pages/admin/CandidateFormPage';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        <Route path="elections" element={<ElectionsPage />} />
        <Route path="elections/new" element={<ElectionFormPage />} />
        <Route path="elections/:id/edit" element={<ElectionFormPage />} />
        
        <Route path="elections/:electionId/candidates" element={<CandidatesPage />} />
        <Route path="elections/:electionId/candidates/new" element={<CandidateFormPage />} />
        <Route path="elections/:electionId/candidates/:candidateId/edit" element={<CandidateFormPage />} />
      </Route>
      
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
