import React from 'react';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div 
      className={`
        bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden
        ${hover ? 'hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
