import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const Header = ({ onMenuClick }) => {
  const location = useLocation();
  
  // Basic title extraction from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('elections/new')) return 'Create Election';
    if (path.includes('elections') && path.includes('edit')) return 'Edit Election';
    if (path.includes('candidates/new')) return 'Add Candidate';
    if (path.includes('candidates') && path.includes('edit')) return 'Edit Candidate';
    if (path.includes('candidates')) return 'Candidates';
    if (path.includes('elections')) return 'Elections';
    return 'Admin Panel';
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 mr-3 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse border border-slate-900"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
