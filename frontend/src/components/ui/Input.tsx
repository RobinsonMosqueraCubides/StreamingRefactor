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
        <label htmlFor={inputId} className="text-xs font-medium text-slate-400">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-slate-500 shrink-0">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-slate-950/60 border rounded-xl py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 disabled:opacity-50
            ${leftIcon ? 'pl-10' : ''} 
            ${rightIcon ? 'pr-10' : ''} 
            ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-800 hover:border-slate-700'} 
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
          <span className="absolute right-3.5 text-slate-500 shrink-0">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <span className="text-xs text-red-400 font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
