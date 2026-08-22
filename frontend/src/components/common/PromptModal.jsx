import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Sparkle } from '@phosphor-icons/react';

export function PromptModal({ isOpen, onClose, onSubmit, title, placeholder, initialValue = '' }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || "Regenerate Outline"}
      subtitle="Provide new directions, topics, or guidelines for the outline"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 animate-fade-in transition-micro">
        <div>
          <label className="block text-xs font-semibold font-sans text-brand-textMuted mb-1 uppercase tracking-wider">
            Concept / Prompt Guidelines
          </label>
          <textarea
            rows={4}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder || "e.g. Focus on practical implementation strategies and add a case study chapter..."}
            className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-sans resize-none"
            required
          />
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold font-sans text-brand-textMuted hover:text-brand-surfaceText transition-micro"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold font-sans rounded-xl shadow transition-micro flex items-center space-x-2 disabled:opacity-50"
          >
            <Sparkle weight="fill" className="w-3.5 h-3.5 text-brand-accent" />
            <span>Regenerate Outline</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
