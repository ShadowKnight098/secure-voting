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
      <div className="w-16 h-16 rounded-[14px] bg-sun border-2 border-ink shadow-neo flex items-center justify-center mb-4 text-ink">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-ink mb-2">{title}</h3>
      <p className="text-ink/70 max-w-sm mb-6 text-sm">{description}</p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
