import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const VoterAuthContext = createContext(null);

export const VoterAuthProvider = ({ children }) => {
  const [voter, setVoter] = useState(null);
  const [voterToken, setVoterToken] = useState(localStorage.getItem('voter_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateVoterToken = async () => {
      if (!voterToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/voter/profile', {
          headers: {
            Authorization: `Bearer ${voterToken}`
          }
        });
        setVoter(res.data.data);
      } catch (err) {
        console.error('Voter token validation failed', err);
        localStorage.removeItem('voter_token');
        setVoterToken(null);
        setVoter(null);
      } finally {
        setLoading(false);
      }
    };

    validateVoterToken();
  }, [voterToken]);

  const login = async (identifier, password) => {
    try {
      const res = await api.post('/voter/login', { identifier, password });
      const { token: newToken, voter: voterData } = res.data.data;

      localStorage.setItem('voter_token', newToken);
      setVoterToken(newToken);
      setVoter(voterData);
      toast.success(`Welcome, ${voterData.full_name}!`);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/voter/register', formData);
      const { token: newToken, voter: voterData } = res.data.data;

      localStorage.setItem('voter_token', newToken);
      setVoterToken(newToken);
      setVoter(voterData);
      toast.success('Registration submitted successfully!');
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed'
      };
    }
  };

  const refreshProfile = async () => {
    if (!voterToken) return;
    try {
      const res = await api.get('/voter/profile', {
        headers: {
          Authorization: `Bearer ${voterToken}`
        }
      });
      setVoter(res.data.data);
    } catch (err) {
      console.error('Error refreshing profile', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('voter_token');
    setVoterToken(null);
    setVoter(null);
    toast.success('Logged out from Voter Portal');
  };

  const value = {
    voter,
    voterToken,
    loading,
    isAuthenticated: !!voterToken && !!voter,
    login,
    register,
    logout,
    refreshProfile
  };

  return (
    <VoterAuthContext.Provider value={value}>
      {children}
    </VoterAuthContext.Provider>
  );
};

export const useVoterAuth = () => useContext(VoterAuthContext);
