import React, { forwardRef, useId, useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Convert YYYY-MM-DD to DD/MM/YYYY
const toDisplayFormat = (val: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  }
  return val;
};

// Convert DD/MM/YYYY to YYYY-MM-DD
const toIsoFormat = (val: string): string => {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [day, month, year] = val.split('/');
    return `${year}-${month}-${day}`;
  }
  return val;
};

const formatAsDateMask = (val: string) => {
  const clean = val.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
};

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  type,
  placeholder,
  value,
  onChange,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const isDateType = type === 'date';
  const [displayVal, setDisplayVal] = useState('');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDateType && value !== undefined) {
      const propStr = String(value);
      setDisplayVal(toDisplayFormat(propStr));
    }
  }, [value, isDateType]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const isAdding = val.length > displayVal.length;

    if (isAdding) {
      val = formatAsDateMask(val);
    }

    setDisplayVal(val);

    const isoVal = toIsoFormat(val);

    if (onChange) {
      const simulatedEvent = {
        ...e,
        target: {
          ...e.target,
          value: isoVal,
          name: props.name || ''
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange(simulatedEvent);
    }
  };

  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const formatted = toDisplayFormat(isoVal);
      setDisplayVal(formatted);
      if (onChange) {
        const simulatedEvent = {
          ...e,
          target: {
            ...e.target,
            value: isoVal,
            name: props.name || ''
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(simulatedEvent);
      }
    }
  };

  // Sync hidden picker value
  const currentIsoVal = toIsoFormat(displayVal);
  const hiddenInputValue = /^\d{4}-\d{2}-\d{2}$/.test(currentIsoVal) ? currentIsoVal : '';

  const calendarButton = isDateType ? (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation();
        try {
          hiddenInputRef.current?.showPicker();
        } catch (err) {
          // Fallback
        }
      }}
      className="absolute right-3.5 p-1 rounded-lg text-brand-textMuted hover:bg-brand-border/30 hover:text-brand-textPrimary transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent/30 flex items-center justify-center cursor-pointer"
      title="Seleccionar desde calendario"
    >
      <Calendar className="w-4 h-4" />
    </button>
  ) : null;

  const actualType = isDateType ? 'text' : type;
  const actualPlaceholder = isDateType ? (placeholder || 'DD/MM/AAAA') : placeholder;
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
          value={isDateType ? displayVal : value}
          onChange={isDateType ? handleTextChange : onChange}
          className={`w-full bg-brand-primary border rounded-xl py-3 px-3.5 text-sm text-brand-textPrimary placeholder-brand-textMuted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200 disabled:opacity-50 min-h-[44px]
            ${leftIcon ? 'pl-10' : ''} 
            ${hasRightIcon ? 'pr-10' : ''} 
            ${error ? 'border-brand-destructive focus:ring-brand-destructive/20 focus:border-brand-destructive' : 'border-brand-border hover:border-brand-textMuted/40'} 
            ${className}`}
          {...props}
        />
        {rightIcon && !isDateType && (
          <span className="absolute right-3.5 text-brand-textMuted shrink-0">
            {rightIcon}
          </span>
        )}
        {calendarButton}
        
        {/* Hidden picker */}
        {isDateType && (
          <input
            type="date"
            ref={hiddenInputRef}
            value={hiddenInputValue}
            onChange={handleHiddenDateChange}
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
            style={{ width: 0, height: 0 }}
          />
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
