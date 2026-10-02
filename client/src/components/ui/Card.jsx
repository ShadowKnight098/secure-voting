import React from 'react';

export const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  selected = false,
  ...props 
}) => {
  return (
    <div 
      className={`
        border-2 border-ink rounded-[14px] overflow-hidden text-ink
        transition-all duration-150 ease-out
        ${selected 
          ? 'bg-sun shadow-neo-sm translate-x-[2px] translate-y-[2px]' 
          : 'bg-surface shadow-neo'
        }
        ${hover && !selected ? 'hover:shadow-neo-hover hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
