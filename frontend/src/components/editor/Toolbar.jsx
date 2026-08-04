import React from 'react';
import { Moon, Sun, ArrowLeft, Download, RotateCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function Toolbar({
  bookTitle,
  saveStatus,
  onBack,
  onExportDocx,
  onExportPdf,
  onSwarmOutline,
  onSwarmChapter
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-150">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 font-serif">
            {bookTitle}
          </h1>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
              saveStatus === 'error' ? 'bg-red-500' : 'bg-emerald-500'
            }`} />
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {saveStatus === 'saving' ? 'Saving changes...' :
               saveStatus === 'error' ? 'Failed to save' : 'All changes saved'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Swarm Actions */}
        <button
          onClick={onSwarmOutline}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Regen Outline</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Exports */}
        <div className="relative group">
          <button className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all">
            <Download className="w-4 h-4" />
            <span>Export Manuscript</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-42 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden py-1 z-20">
            <button
              onClick={onExportDocx}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Word (.docx)
            </button>
            <button
              onClick={onExportPdf}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              PDF (.pdf)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
