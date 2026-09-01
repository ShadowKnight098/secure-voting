import React from 'react';
import { Search } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({ 
  icon: Icon = Search, 
  title = 'No results found', 
  description = 'Try adjusting your search or filters.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
