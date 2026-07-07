import React, { forwardRef, useId } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-brand-textMuted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-brand-primary border rounded-xl py-3 px-3.5 pr-10 text-sm text-brand-textPrimary placeholder-brand-textMuted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200 disabled:opacity-50 appearance-none cursor-pointer min-h-[44px]
            ${error ? 'border-brand-destructive focus:ring-brand-destructive/20 focus:border-brand-destructive' : 'border-brand-border hover:border-brand-textMuted/40'} 
            ${className}`}
          {...props}
        >
          {options ? options.map((option) => (
            <option key={option.value} value={option.value} className="bg-brand-secondary text-brand-textPrimary">
              {option.label}
            </option>
          )) : props.children}
        </select>
        {/* Custom Chevron Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-brand-textMuted">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-xs text-brand-destructive font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
