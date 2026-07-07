import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-brand-textMuted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-brand-textMuted shrink-0">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-brand-primary border rounded-xl py-3 px-3.5 text-sm text-brand-textPrimary placeholder-brand-textMuted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200 disabled:opacity-50 min-h-[44px]
            ${leftIcon ? 'pl-10' : ''} 
            ${rightIcon ? 'pr-10' : ''} 
            ${error ? 'border-brand-destructive focus:ring-brand-destructive/20 focus:border-brand-destructive' : 'border-brand-border hover:border-brand-textMuted/40'} 
            ${className}`}
          onClick={(e) => {
            if (props.type === 'date') {
              try {
                e.currentTarget.showPicker();
              } catch (err) {
                // Fallback silencioso si no es soportado
              }
            }
            if (props.onClick) props.onClick(e);
          }}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 text-brand-textMuted shrink-0">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs text-brand-destructive font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
