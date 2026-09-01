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
  const id = useId();
  const isTextarea = type === 'textarea';
  
  const baseClasses = `
    w-full bg-slate-800/50 border border-slate-700 rounded-lg 
    text-slate-200 placeholder-slate-500
    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
    transition-colors duration-200
    disabled:opacity-50 disabled:bg-slate-900
    ${Icon ? 'pl-10' : 'pl-4'} pr-4
    ${isTextarea ? 'py-3' : 'h-11'}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        
        {isTextarea ? (
          <textarea
            ref={ref}
            id={id}
            required={required}
            className={baseClasses}
            {...props}
          />
        ) : type === 'select' ? (
          <select
            ref={ref}
            id={id}
            required={required}
            className={`${baseClasses} appearance-none`}
            {...props}
          >
            {props.children}
          </select>
        ) : (
          <input
            ref={ref}
            id={id}
            type={type}
            required={required}
            className={baseClasses}
            {...props}
          />
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400 animate-slide-up">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
