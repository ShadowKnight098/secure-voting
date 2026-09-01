import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Vote, LogOut, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/elections', icon: Vote, label: 'Elections' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-72">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <ShieldCheck className="w-8 h-8 text-indigo-500 mr-3" />
        <span className="text-xl font-bold text-gradient">SecureVote</span>
        {isOpen && (
          <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => isOpen && onClose()}
              className={`
                flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <link.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-indigo-400' : 'group-hover:text-white'}`} />
              {link.label}
            </NavLink>
          );
        })}
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">System Administrator</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Logout
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
