import { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export default function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  error,
  disabled = false,
  className = '',
  id
}: SearchableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      // Autofocus search input upon opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false;
      return matchLabel || matchSub;
    });
  }, [options, searchQuery]);

  const handleSelectOption = (optValue: string | number) => {
    onChange(String(optValue));
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-brand-textMuted">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full bg-brand-primary border rounded-xl py-3 px-3.5 pr-10 text-sm text-left flex items-center justify-between min-h-[44px] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? 'ring-2 ring-brand-accent/20 border-brand-accent' : 'border-brand-border hover:border-brand-textMuted/40'}
          ${error ? 'border-brand-destructive focus:ring-brand-destructive/20 focus:border-brand-destructive' : ''}
          ${className}`}
      >
        <span className={`truncate mr-2 ${selectedOption ? 'text-brand-textPrimary' : 'text-brand-textMuted/60'}`}>
          {selectedOption ? (
            <>
              <span className="font-normal">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="ml-1.5 text-xs text-brand-textMuted font-normal">
                  ({selectedOption.subLabel})
                </span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>

        {/* Chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-brand-textMuted">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-accent' : ''}`}
          />
        </div>
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-brand-secondary border border-brand-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Bar */}
          <div className="p-2 border-b border-brand-border/60 bg-brand-primary/40 flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-textMuted shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelectOption(filteredOptions[0].value);
                  }
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-brand-textPrimary placeholder-brand-textMuted/60 focus:outline-none py-1"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="text-brand-textMuted hover:text-brand-textPrimary p-1 rounded cursor-pointer mr-1"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-brand-border/30 py-1">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-xs text-brand-textMuted text-center">
                No se encontraron opciones que coincidan
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectOption(option.value)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer
                      ${isSelected ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-brand-textPrimary hover:bg-brand-primary/60'}`}
                  >
                    <div className="truncate">
                      <div className="truncate">{option.label}</div>
                      {option.subLabel && (
                        <div className="text-[11px] text-brand-textMuted truncate mt-0.5 font-normal">
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <span className="text-xs text-brand-destructive font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
