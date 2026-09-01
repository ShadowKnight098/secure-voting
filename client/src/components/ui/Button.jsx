import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn-primary',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white border-transparent',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
  success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg font-medium',
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : Icon ? (
        <Icon className="w-5 h-5 mr-2" />
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
