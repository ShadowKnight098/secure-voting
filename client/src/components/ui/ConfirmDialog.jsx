import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action" size="sm">
      <div className="flex flex-col items-center text-center pb-2 pt-2">
        <div className="w-14 h-14 rounded-[14px] bg-coral border-2 border-ink shadow-neo-sm flex items-center justify-center mb-4 text-ink">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h4 className="text-xl font-bold text-ink mb-2">{title}</h4>
        <p className="text-ink/75 text-sm leading-relaxed">{message}</p>
      </div>
      
      <div className="flex gap-3 justify-end mt-6 pt-4 border-t-2 border-ink">
        <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" size="md" onClick={onConfirm} loading={isLoading}>
          Confirm Delete
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
