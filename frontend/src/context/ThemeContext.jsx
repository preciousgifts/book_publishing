import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const PALETTES = ['midnight', 'editorial', 'studio', 'parchment'];
const MODES = ['light', 'dark'];

const STORAGE_KEY_PALETTE = 'scriboral-palette';
const STORAGE_KEY_MODE = 'scriboral-mode';

export function ThemeProvider({ children }) {
  const [palette, setPaletteState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PALETTE);
    return PALETTES.includes(stored) ? stored : 'midnight';
  });

  const [mode, setModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE);
    return MODES.includes(stored) ? stored : 'dark';
  });

  // Apply palette and mode to the <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);

    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem(STORAGE_KEY_PALETTE, palette);
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }, [palette, mode]);

  const setPalette = useCallback((newPalette) => {
    if (PALETTES.includes(newPalette)) {
      setPaletteState(newPalette);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setMode = useCallback((newMode) => {
    if (MODES.includes(newMode)) {
      setModeState(newMode);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ palette, mode, setPalette, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
