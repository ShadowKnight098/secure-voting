import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      <div className={`
        relative w-full ${sizeClasses[size]} glass-panel rounded-xl overflow-hidden shadow-2xl animate-slide-up
        flex flex-col max-h-[90vh]
      `}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
