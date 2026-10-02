import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-pink text-white hover:bg-pink-hover active:bg-pink',
  secondary: 'bg-white text-ink hover:bg-violet-50 active:bg-white',
  danger: 'bg-coral text-ink hover:bg-coral-hover active:bg-coral',
  ghost: 'bg-transparent text-ink hover:bg-white/80 border-transparent shadow-none hover:border-ink hover:shadow-neo-sm',
  mint: 'bg-mint text-ink hover:bg-mint-hover active:bg-mint',
  violet: 'bg-violet text-white hover:bg-violet-700 active:bg-violet',
  sun: 'bg-sun text-ink hover:bg-sun-hover active:bg-sun',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded-[10px]',
  md: 'px-5 py-2.5 text-sm sm:text-base min-h-[48px] rounded-[14px]',
  lg: 'px-7 py-3.5 text-base sm:text-lg min-h-[52px] rounded-[14px]',
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
  const isGhost = variant === 'ghost';
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-bold tracking-tight
        ${isGhost ? 'border-2 border-transparent' : 'border-2 border-ink shadow-neo hover:shadow-neo-hover active:shadow-neo-active hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px]'}
        transition-all duration-150 ease-out
        focus:outline-none focus:ring-4 focus:ring-sun/60 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-neo-sm
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : Icon ? (
        <Icon className="w-5 h-5 mr-2 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
