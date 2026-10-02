import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const Header = ({ onMenuClick }) => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Admin Dashboard';
    if (path.includes('elections/new')) return 'Create Election';
    if (path.includes('elections') && path.includes('edit')) return 'Edit Election';
    if (path.includes('candidates/new')) return 'Add Candidate';
    if (path.includes('candidates') && path.includes('edit')) return 'Edit Candidate';
    if (path.includes('candidates')) return 'Candidate Roster';
    if (path.includes('voters')) return 'Voter Directory';
    if (path.includes('elections')) return 'Election Management';
    return 'Admin Panel';
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-lavender border-b-2 border-ink sticky top-0 z-30 shadow-neo-sm text-ink">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="p-1.5 rounded-[10px] bg-surface text-ink border-2 border-ink shadow-neo-sm lg:hidden hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-violet text-sun border-2 border-ink shadow-neo-sm hidden sm:flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-sun" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-ink">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Yellow status pill as specified in KEY COMPONENTS */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sun border-2 border-ink text-xs font-extrabold text-ink shadow-neo-sm">
          <span className="w-2 h-2 rounded-full bg-ink animate-ping" />
          <span>System Active</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
