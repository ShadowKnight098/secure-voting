import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Vote, Users, LogOut, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/elections', icon: Vote, label: 'Elections' },
    { to: '/admin/voters', icon: Users, label: 'Voters' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r-2 border-ink w-72">
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b-2 border-ink bg-lavender">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-violet text-white border-2 border-ink shadow-neo-sm flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-sun" />
          </div>
          <span className="text-xl font-extrabold text-ink tracking-tight">SecureVote</span>
        </div>
        {isOpen && (
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-[8px] bg-surface text-ink border-2 border-ink shadow-neo-sm"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-3">
        <div className="text-[11px] font-extrabold text-ink/70 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => isOpen && onClose()}
              className={`
                flex items-center px-4 py-3 rounded-[12px] text-sm transition-all duration-150 group
                ${isActive 
                  ? 'bg-sun text-ink font-extrabold border-2 border-ink shadow-neo-sm' 
                  : 'text-ink/80 hover:text-ink hover:bg-lavender/80 font-bold border-2 border-transparent hover:border-ink hover:shadow-neo-sm'
                }
              `}
            >
              <link.icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors ${isActive ? 'text-ink' : 'text-ink/70 group-hover:text-ink'}`} />
              <span className="truncate">{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Admin User Info & Logout */}
      <div className="p-4 border-t-2 border-ink bg-lavender/50">
        <div className="bg-surface rounded-[14px] p-4 border-2 border-ink shadow-neo-sm">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-[12px] bg-sun text-ink border-2 border-ink shadow-neo-sm flex items-center justify-center font-extrabold text-lg flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-ink truncate">{user?.username || 'Administrator'}</p>
              <p className="text-xs font-semibold text-ink/70 truncate">Admin Console</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-bold text-ink bg-coral border-2 border-ink rounded-[10px] shadow-neo-sm hover:shadow-neo-hover active:shadow-neo-active hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
          >
            <LogOut size={14} className="mr-1.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
