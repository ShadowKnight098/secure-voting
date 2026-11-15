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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className={`
        relative w-full ${sizeClasses[size]} bg-surface border-2 border-ink rounded-[14px] sm:rounded-[16px] 
        overflow-hidden shadow-neo-xl animate-slide-up flex flex-col max-h-[92dvh] sm:max-h-[90vh] z-10 text-ink my-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-ink bg-lavender flex-shrink-0">
          <h3 className="text-base sm:text-xl font-extrabold text-ink truncate pr-2">{title}</h3>
          <button 
            onClick={onClose}
            className="text-ink hover:bg-surface p-1.5 rounded-lg border-2 border-transparent hover:border-ink hover:shadow-neo-sm transition-all flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto bg-surface">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-ink bg-lavender/60 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
