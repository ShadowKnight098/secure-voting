import React, { forwardRef, useId } from 'react';

export const Input = forwardRef(({
  label,
  error,
  type = 'text',
  icon: Icon,
  className = '',
  required,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const isTextarea = type === 'textarea';
  
  const baseClasses = `
    w-full bg-surface border-2 border-ink rounded-[12px] 
    text-ink placeholder:text-slate-400 font-medium
    focus:outline-none focus:ring-4 focus:ring-sun/60 focus:border-ink
    transition-all duration-150
    disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed
    ${Icon ? 'pl-11' : 'pl-4'} pr-4
    ${isTextarea ? 'py-3' : 'h-12'}
    ${error ? 'border-coral ring-2 ring-coral/30' : ''}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-ink mb-1.5">
          {label} {required && <span className="text-coral">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/70 pointer-events-none">
            <Icon size={20} />
          </div>
        )}
        
        {isTextarea ? (
          <textarea
            ref={ref}
            id={inputId}
            required={required}
            className={baseClasses}
            {...props}
          />
        ) : type === 'select' ? (
          <select
            ref={ref}
            id={inputId}
            required={required}
            className={`${baseClasses} cursor-pointer`}
            {...props}
          >
            {props.children}
          </select>
        ) : (
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            className={baseClasses}
            {...props}
          />
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs sm:text-sm font-semibold text-coral animate-slide-up flex items-center gap-1">
          <span>●</span> {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
