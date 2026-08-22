import React, { useEffect } from 'react';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';

export function NotificationToast({ toast, onClose }) {
  useEffect(() => {
    if (toast && toast.autoClose !== false) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-sm w-full select-none transition-micro">
      <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start space-x-3 transition-micro bg-brand-surface text-brand-surfaceText ${
        isError
          ? 'border-brand-danger/60'
          : isSuccess
          ? 'border-brand-primary/60'
          : 'border-brand-info/60'
      }`}>
        <div className="mt-0.5 flex-shrink-0">
          {isError ? (
            <WarningCircle weight="fill" className="w-5 h-5 text-brand-danger" />
          ) : isSuccess ? (
            <CheckCircle weight="fill" className="w-5 h-5 text-brand-primary" />
          ) : (
            <Info weight="fill" className="w-5 h-5 text-brand-info" />
          )}
        </div>

        <div className="flex-1 space-y-0.5">
          {toast.title && <h4 className="font-bold font-sans text-xs">{toast.title}</h4>}
          <p className="text-xs font-sans leading-relaxed opacity-90">{toast.message}</p>
        </div>

        <button
          onClick={onClose}
          className="text-brand-textMuted hover:text-brand-surfaceText transition-micro p-1 rounded-lg"
        >
          <X weight="bold" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
