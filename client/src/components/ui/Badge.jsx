import React from 'react';

const statusVariants = {
  upcoming: 'bg-sky text-ink',
  active: 'bg-sky text-ink',
  info: 'bg-sky text-ink',
  completed: 'bg-mint text-ink',
  voted: 'bg-mint text-ink',
  verified: 'bg-mint text-ink',
  cancelled: 'bg-coral text-ink',
  closed: 'bg-coral text-ink',
  error: 'bg-coral text-ink',
  pending: 'bg-sun text-ink',
};

const dotColors = {
  upcoming: 'bg-ink',
  active: 'bg-ink animate-ping',
  completed: 'bg-ink',
  voted: 'bg-ink',
  verified: 'bg-ink',
  cancelled: 'bg-ink',
  pending: 'bg-ink',
};

export const Badge = ({ status = 'upcoming', className = '' }) => {
  const normalizedStatus = (status || '').toString().toLowerCase();
  const variantClass = statusVariants[normalizedStatus] || 'bg-white text-ink';
  const dotColor = dotColors[normalizedStatus] || 'bg-ink';

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
      border-2 border-ink shadow-neo-sm ${variantClass} ${className}
    `}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};

export default Badge;
