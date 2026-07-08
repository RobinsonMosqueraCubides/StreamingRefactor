import React, { forwardRef, useId, useState } from 'react';
import { Calendar, Keyboard } from 'lucide-react';

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
  type,
  placeholder,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const isDateType = type === 'date';
  const [isManualDate, setIsManualDate] = useState(false);

  const actualType = isDateType ? (isManualDate ? 'text' : 'date') : type;
  const actualPlaceholder = isDateType && isManualDate ? (placeholder || 'AAAA-MM-DD') : placeholder;

  const toggleDateButton = isDateType ? (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation();
        setIsManualDate(!isManualDate);
      }}
      className="absolute right-3.5 p-1 rounded-lg text-brand-textMuted hover:bg-brand-border/30 hover:text-brand-textPrimary transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent/30 flex items-center justify-center"
      title={isManualDate ? "Seleccionar desde calendario" : "Escribir fecha manualmente"}
    >
      {isManualDate ? (
        <Calendar className="w-4 h-4" />
      ) : (
        <Keyboard className="w-4 h-4" />
      )}
    </button>
  ) : null;

  const hasRightIcon = !!rightIcon || isDateType;

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
          type={actualType}
          placeholder={actualPlaceholder}
          className={`w-full bg-brand-primary border rounded-xl py-3 px-3.5 text-sm text-brand-textPrimary placeholder-brand-textMuted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200 disabled:opacity-50 min-h-[44px]
            ${leftIcon ? 'pl-10' : ''} 
            ${hasRightIcon ? 'pr-10' : ''} 
            ${error ? 'border-brand-destructive focus:ring-brand-destructive/20 focus:border-brand-destructive' : 'border-brand-border hover:border-brand-textMuted/40'} 
            ${className}`}
          onClick={(e) => {
            if (actualType === 'date') {
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
        {rightIcon && !isDateType && (
          <span className="absolute right-3.5 text-brand-textMuted shrink-0">
            {rightIcon}
          </span>
        )}
        {toggleDateButton}
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
