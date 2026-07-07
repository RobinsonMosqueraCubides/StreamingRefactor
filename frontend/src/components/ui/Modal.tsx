import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-brand-primary/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content Wrapper */}
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        className="bg-brand-secondary border border-brand-border rounded-2xl w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
          <h3 id="modal-title" className="text-lg font-semibold text-brand-textPrimary">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-brand-textMuted hover:text-brand-textPrimary p-1.5 rounded-lg hover:bg-brand-primary/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow text-brand-textPrimary/90 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-3 bg-brand-secondary/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
