import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, ArrowLeft, DownloadSimple as Download, ArrowClockwise as RotateCw, TextAlignJustify as AlignJustify, TextAlignLeft as AlignLeft, TextAlignCenter as AlignCenter, TextHTwo as Heading2, TextHThree as Heading3, Quotes as Quote, TextIndent as Indent, Image as ImagePlus, ChartPie as PieChart, X, CaretDown as ChevronDown, BookOpenText } from '@phosphor-icons/react';
import { useTheme } from '../../context/ThemeContext';

export function Toolbar({
  bookTitle,
  saveStatus,
  onBack,
  onExportDocx,
  onExportPdf,
  onExportEpub,
  onSwarmOutline,
  onInsertFigure,
  onTogglePreview,
  isPreviewOpen
}) {
  const { mode: theme, toggleMode: toggleTheme } = useTheme();
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagramType, setDiagramType] = useState('flowchart');
  const [diagramCaption, setDiagramCaption] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Src = event.target?.result;
      if (base64Src && onInsertFigure) {
        onInsertFigure({
          type: 'image',
          src: base64Src,
          caption: file.name.replace(/\.[^/.]+$/, "")
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIDiagram = () => {
    const caption = diagramCaption.trim() || `${diagramType.toUpperCase()} Diagram`;
    let svgContent = '';

    if (diagramType === 'flowchart') {
      svgContent = `<svg viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg" style="max-width:100%; height:auto;">
        <rect x="20" y="35" width="110" height="50" rx="8" fill="#27445D" stroke="#90B800" stroke-width="2"/>
        <text x="75" y="65" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Step 1: Input</text>
        <path d="M 130 60 L 170 60" stroke="#90B800" stroke-width="3" marker-end="url(#arrow)"/>
        
        <rect x="185" y="35" width="130" height="50" rx="8" fill="#063B00" stroke="#90B800" stroke-width="2"/>
        <text x="250" y="65" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Step 2: Process</text>
        <path d="M 315 60 L 355 60" stroke="#90B800" stroke-width="3"/>
        
        <rect x="370" y="35" width="110" height="50" rx="8" fill="#27445D" stroke="#90B800" stroke-width="2"/>
        <text x="425" y="65" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Step 3: Output</text>
      </svg>`;
    } else if (diagramType === 'barchart') {
      svgContent = `<svg viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg" style="max-width:100%; height:auto;">
        <rect x="50" y="80" width="60" height="50" fill="#063B00" rx="4"/>
        <text x="80" y="72" fill="#90B800" font-size="11" font-weight="bold" text-anchor="middle">45%</text>
        <text x="80" y="145" fill="#64748b" font-size="11" text-anchor="middle">Phase A</text>

        <rect x="170" y="40" width="60" height="90" fill="#266210" rx="4"/>
        <text x="200" y="32" fill="#90B800" font-size="11" font-weight="bold" text-anchor="middle">78%</text>
        <text x="200" y="145" fill="#64748b" font-size="11" text-anchor="middle">Phase B</text>

        <rect x="290" y="20" width="60" height="110" fill="#90B800" rx="4"/>
        <text x="320" y="12" fill="#063B00" font-size="11" font-weight="bold" text-anchor="middle">95%</text>
        <text x="320" y="145" fill="#64748b" font-size="11" text-anchor="middle">Phase C</text>
      </svg>`;
    } else {
      svgContent = `<svg viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg" style="max-width:100%; height:auto;">
        <circle cx="100" cy="60" r="45" fill="#063B00" opacity="0.85"/>
        <text x="100" y="64" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">Core Theory</text>
        <circle cx="400" cy="60" r="45" fill="#27445D" opacity="0.85"/>
        <text x="400" y="64" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">Practice</text>
        <path d="M 145 60 Q 250 15 355 60" fill="none" stroke="#90B800" stroke-width="3"/>
        <text x="250" y="30" fill="#90B800" font-size="11" font-weight="bold" text-anchor="middle">Synergy</text>
      </svg>`;
    }

    const svgBase64 = `data:image/svg+xml;base64,${btoa(svgContent)}`;

    if (onInsertFigure) {
      onInsertFigure({
        type: 'diagram',
        src: svgBase64,
        caption
      });
    }

    setShowDiagramModal(false);
    setDiagramCaption('');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-brand-surface text-brand-surfaceText border-b border-brand-border shadow-sm transition-micro">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-brand-surfaceText hover:bg-brand-primary/20 transition-micro"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold font-serif text-brand-surfaceText">
            {bookTitle}
          </h1>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-brand-warning animate-pulse' :
              saveStatus === 'error' ? 'bg-brand-danger' : 'bg-brand-info'
            }`} />
            <span className="text-xs text-brand-textMuted capitalize">
              {saveStatus === 'saving' ? 'Saving changes...' :
               saveStatus === 'error' ? 'Failed to save' : 'All changes saved'}
            </span>
          </div>
        </div>
      </div>

      {/* Book Formatting Toolbar */}
      <div className="flex items-center space-x-1.5 bg-brand-bg/50 p-1.5 rounded-xl border border-brand-border">
        {/* Alignment */}
        <button
          onClick={() => executeCommand('justifyFull')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Justify (Default Print Typesetting)"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-brand-border mx-1" />

        {/* Headings */}
        <button
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Chapter Title (H2)"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Subheading (H3)"
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand('formatBlock', '<blockquote>')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="Block Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand('indent')}
          className="p-1.5 text-brand-surfaceText hover:bg-brand-primary/30 rounded transition-micro"
          title="First-Line Indent"
        >
          <Indent className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-brand-border mx-1" />

        {/* Figure & Diagram Insertion */}
        <label className="p-1.5 text-brand-accent hover:bg-brand-primary/30 rounded transition-micro cursor-pointer" title="Upload Image/Figure">
          <ImagePlus className="w-4 h-4" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        <button
          onClick={() => setShowDiagramModal(true)}
          className="p-1.5 text-brand-accent hover:bg-brand-primary/30 rounded transition-micro"
          title="Generate Diagram"
        >
          <PieChart className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-3">
        {/* Swarm Actions */}
        <button
          onClick={onSwarmOutline}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-brand-surfaceText bg-brand-primary/30 hover:bg-brand-primary/50 rounded-lg transition-micro"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Regen Outline</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          className="p-2 rounded-lg text-brand-surfaceText hover:bg-brand-primary/30 transition-micro"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-brand-accent" /> : <Moon className="w-5 h-5 text-brand-accent" />}
        </button>

        {/* Print Preview Toggle */}
        <button
          onClick={onTogglePreview}
          aria-label="Toggle print preview"
          className={`p-2 rounded-lg transition-micro ${isPreviewOpen ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-surfaceText hover:bg-brand-primary/30'}`}
          title="Toggle Print Preview"
        >
          <BookOpenText className="w-5 h-5 text-brand-accent" />
        </button>

        {/* Exports */}
        <div className="relative" ref={exportRef}>
          <button 
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primaryHover rounded-xl shadow-sm transition-micro cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-accent" />
            <span>Export Book</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-brand-surface text-brand-surfaceText border border-brand-border rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  if (onExportDocx) onExportDocx();
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-brand-primary/30 transition-micro flex items-center justify-between cursor-pointer"
              >
                <span>Word Manuscript (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  if (onExportPdf) onExportPdf();
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-brand-primary/30 transition-micro flex items-center justify-between cursor-pointer border-t border-brand-border/50"
              >
                <span>Print PDF (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  if (onExportEpub) onExportEpub();
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-brand-primary/30 transition-micro flex items-center justify-between cursor-pointer border-t border-brand-border/50"
              >
                <span>eBook EPUB (.epub)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Diagram Generator Modal */}
      {showDiagramModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="bg-brand-surface text-brand-surfaceText border border-brand-border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-modal-content space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-brand-accent" />
                <h3 className="font-bold text-base font-serif">Insert Diagram</h3>
              </div>
              <button onClick={() => setShowDiagramModal(false)} className="text-brand-textMuted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-brand-accent uppercase">Diagram Type</label>
              <select
                value={diagramType}
                onChange={(e) => setDiagramType(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs font-semibold outline-none"
              >
                <option value="flowchart">Step-by-Step Flowchart</option>
                <option value="barchart">Comparative Bar Chart</option>
                <option value="concept">Core Concept Map</option>
              </select>

              <label className="block text-xs font-semibold text-brand-accent uppercase pt-2">Figure Caption</label>
              <input
                type="text"
                value={diagramCaption}
                onChange={(e) => setDiagramCaption(e.target.value)}
                placeholder="e.g. Figure 1.1: System Flow Diagram"
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiagramModal(false)}
                className="px-3 py-2 text-xs font-semibold text-brand-textMuted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAIDiagram}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-semibold rounded-xl shadow transition-micro"
              >
                Insert Vector Diagram
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
