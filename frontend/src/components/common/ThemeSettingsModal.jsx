import React from 'react';
import { Modal } from './Modal';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, Moon, Sun } from '@phosphor-icons/react';

const PALETTES = [
  { id: 'midnight', name: 'Midnight Publisher', colors: ['#0B1120', '#D4A853', '#F5F0E8'] },
  { id: 'editorial', name: 'Classic Editorial', colors: ['#1B4332', '#52B788', '#F0EDE5'] },
  { id: 'studio', name: 'Modern Studio', colors: ['#0F172A', '#818CF8', '#E2E8F0'] },
  { id: 'parchment', name: 'Parchment & Ink', colors: ['#2C1810', '#D4A574', '#F5E6D3'] },
];

export function ThemeSettingsModal({ isOpen, onClose }) {
  const { palette, mode, setPalette, toggleMode } = useTheme();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Appearance Settings"
      subtitle="Customize the Scriboral reading and writing experience."
      maxWidth="max-w-md"
    >
      <div className="space-y-6 pt-2 animate-fade-in transition-micro font-sans">
        
        {/* Mode Toggle */}
        <div>
          <h4 className="text-xs font-semibold text-brand-textMuted mb-3 uppercase tracking-wider">
            Theme Mode
          </h4>
          <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border">
            <button
              onClick={() => { if (mode === 'dark') toggleMode(); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-micro ${
                mode === 'light' 
                  ? 'bg-brand-surface shadow text-brand-textMain' 
                  : 'text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              <Sun weight={mode === 'light' ? 'fill' : 'regular'} className="w-4 h-4" />
              <span>Light</span>
            </button>
            <button
              onClick={() => { if (mode === 'light') toggleMode(); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-micro ${
                mode === 'dark' 
                  ? 'bg-brand-surface shadow text-brand-textMain' 
                  : 'text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              <Moon weight={mode === 'dark' ? 'fill' : 'regular'} className="w-4 h-4" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Palette Selection */}
        <div>
          <h4 className="text-xs font-semibold text-brand-textMuted mb-3 uppercase tracking-wider">
            Color Palette
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {PALETTES.map((p) => {
              const isSelected = palette === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPalette && setPalette(p.id)}
                  className={`relative flex flex-col items-start p-3 rounded-xl border transition-micro text-left ${
                    isSelected 
                      ? 'border-brand-primary bg-brand-primary/5' 
                      : 'border-brand-border bg-brand-surface hover:border-brand-primary/50'
                  }`}
                >
                  <span className={`text-sm font-medium mb-2 ${isSelected ? 'text-brand-primary' : 'text-brand-textMain'}`}>
                    {p.name}
                  </span>
                  <div className="flex space-x-1.5">
                    {p.colors.map((hexColor, idx) => (
                      <div 
                        key={idx} 
                        style={{ backgroundColor: hexColor }}
                        className="w-4 h-4 rounded-full border border-black/10" 
                      />
                    ))}
                  </div>
                  {isSelected && (
                    <CheckCircle weight="fill" className="absolute top-3 right-3 w-4 h-4 text-brand-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </Modal>
  );
}
