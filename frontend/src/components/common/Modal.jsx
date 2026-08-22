import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

/**
 * Accessible Modal wrapper component.
 * Features: ESC to close, backdrop click to close, body scroll locking,
 * ARIA roles, and smooth 150-200ms micro-animations.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md'
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus modal container ONLY if no input element inside modal is already focused
      if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
        modalRef.current.focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (onCloseRef.current) onCloseRef.current();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (previousFocusRef.current && previousFocusRef.current.focus) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in transition-micro"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={subtitle ? 'modal-subtitle' : undefined}
        className={`bg-brand-surface text-brand-surfaceText border border-brand-border w-full ${maxWidth} rounded-2xl p-6 shadow-2xl animate-fade-in transition-micro space-y-4 outline-none select-none slide-in-bottom-4`}
      >
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div>
            <h3 id="modal-title" className="font-bold text-base font-serif text-brand-surfaceText">
              {title}
            </h3>
            {subtitle && (
              <p id="modal-subtitle" className="text-xs font-sans text-brand-textMuted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-brand-textMuted hover:text-brand-surfaceText transition-micro p-1 rounded-lg hover:bg-brand-primary/20"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
