import React from 'react';

const variants = {
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const dotColors = {
  upcoming: 'bg-blue-400',
  active: 'bg-emerald-400',
  completed: 'bg-slate-400',
  cancelled: 'bg-red-400',
};

export const Badge = ({ status, className = '' }) => {
  const normalizedStatus = status.toLowerCase();
  const variantClass = variants[normalizedStatus] || variants.completed;
  const dotClass = dotColors[normalizedStatus] || dotColors.completed;

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
      border ${variantClass} ${className}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} ${normalizedStatus === 'active' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
};

export default Badge;
