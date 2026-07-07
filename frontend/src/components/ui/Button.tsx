import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-brand-accent hover:bg-brand-accentHover text-brand-accentText shadow-md active:scale-98 focus:ring-brand-accent',
    secondary: 'bg-brand-secondary/80 backdrop-blur-md hover:bg-brand-secondary border border-brand-border text-brand-textPrimary active:scale-98 focus:ring-brand-border',
    danger: 'bg-brand-destructive hover:bg-red-600 text-white shadow-md active:scale-98 focus:ring-brand-destructive',
    ghost: 'hover:bg-brand-secondary hover:text-brand-textPrimary text-brand-textMuted active:scale-98 focus:ring-brand-border',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-3 text-sm gap-2 min-h-[44px]', // Garantiza mínimo 44px de altura táctil
    lg: 'px-6 py-3.5 text-base gap-2.5 min-h-[48px]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="flex shrink-0">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
    </button>
  );
}
