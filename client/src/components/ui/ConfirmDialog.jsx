import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Action" size="sm">
      <div className="flex flex-col items-center text-center pb-4 pt-2">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
      
      <div className="flex gap-3 justify-end mt-6">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isLoading}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
