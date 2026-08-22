import React, { useState, useMemo } from 'react';
import { Eye, EyeSlash, MagnifyingGlassPlus as ZoomIn, MagnifyingGlassMinus as ZoomOut, BookOpenText, Stack as Layers } from '@phosphor-icons/react';

/**
 * KdpPagePreview
 * Simulates real KDP print layout (6x9 in, 5.5x8.5 in) with page margins, 
 * inside gutter calculation, safe zones, bleed lines, running headers, and page numbers.
 */
export function KdpPagePreview({
  paragraphs = [],
  bookTitle = 'Untitled Book',
  chapterTitle = '',
  trimSize = '6x9', // '6x9' or '5.5x8.5'
  onTrimSizeChange,
  showGuideLines = true,
  onToggleGuideLines
}) {
  const [zoomLevel, setZoomLevel] = useState(100); // 75%, 100%, 125%

  // KDP trim dimensions in inches
  const trimSpecs = {
    '6x9': { width: 6.0, height: 9.0, label: '6" × 9" (KDP Standard)' },
    '5.5x8.5': { width: 5.5, height: 8.5, label: '5.5" × 8.5" (Trade Paperback)' },
    '5x8': { width: 5.0, height: 8.0, label: '5" × 8" (Digest)' }
  };

  const currentSpec = trimSpecs[trimSize] || trimSpecs['6x9'];

  // Approximate page budget & gutter calculation based on word count
  const totalWords = useMemo(() => {
    return paragraphs.reduce((acc, p) => {
      const text = typeof p === 'string' ? p : p?.content || p?.formattedHtml || p?.text || '';
      return acc + text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    }, 0);
  }, [paragraphs]);

  const estimatedPages = Math.max(1, Math.ceil(totalWords / 280));

  // KDP Minimum Gutter rules based on page count
  const gutterMargin = useMemo(() => {
    if (estimatedPages <= 150) return 0.375; // inches
    if (estimatedPages <= 300) return 0.5;
    if (estimatedPages <= 500) return 0.625;
    return 0.75;
  }, [estimatedPages]);

  const topMargin = 0.625;
  const bottomMargin = 0.625;
  const outsideMargin = 0.5;
  const bleedMargin = 0.125;

  // Simple pagination chunking for visual demonstration
  const pages = useMemo(() => {
    if (!paragraphs || paragraphs.length === 0) {
      return [{ pageNum: 1, paragraphs: ['[No content available]'] }];
    }

    const pageChunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    const wordsPerPage = 260; // Approximate target words per 6x9 page

    paragraphs.forEach((p) => {
      const text = typeof p === 'string' ? p : p?.content || p?.formattedHtml || p?.text || '';
      const pWords = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

      if (currentWordCount + pWords > wordsPerPage && currentChunk.length > 0) {
        pageChunks.push(currentChunk);
        currentChunk = [text];
        currentWordCount = pWords;
      } else {
        currentChunk.push(text);
        currentWordCount += pWords;
      }
    });

    if (currentChunk.length > 0) {
      pageChunks.push(currentChunk);
    }

    return pageChunks.map((paras, idx) => ({
      pageNum: idx + 1,
      paragraphs: paras
    }));
  }, [paragraphs]);

  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-textMain overflow-hidden select-none animate-fade-in transition-micro">
      {/* Top Preview Control Bar - Stacked layout to prevent overflows */}
      <div className="flex flex-col gap-3 p-4 bg-brand-surface border-b border-brand-border text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-brand-primary font-bold">
            <BookOpenText className="w-4 h-4" />
            <span className="text-sm font-serif">KDP Canvas Preview</span>
          </div>
          {/* Guidelines Toggle */}
          <button
            onClick={onToggleGuideLines}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-micro cursor-pointer ${
              showGuideLines
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                : 'bg-brand-bg border-brand-border text-brand-textMuted hover:text-brand-textMain'
            }`}
          >
            {showGuideLines ? <Eye className="w-3.5 h-3.5" /> : <EyeSlash className="w-3.5 h-3.5" />}
            <span>Guides {showGuideLines ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Trim Size Dropdown */}
          <div className="flex items-center justify-between bg-brand-bg border border-brand-border rounded-xl px-2.5 py-1">
            <span className="text-brand-textMuted text-[10px]">Trim:</span>
            <select
              value={trimSize}
              onChange={(e) => onTrimSizeChange && onTrimSizeChange(e.target.value)}
              className="bg-transparent text-brand-textMain font-semibold outline-none text-[11px] cursor-pointer text-right ml-1"
            >
              {Object.entries(trimSpecs).map(([key, spec]) => (
                <option key={key} value={key} className="bg-brand-surface text-brand-textMain">
                  {key}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-between bg-brand-bg border border-brand-border rounded-xl px-1.5 py-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 hover:bg-brand-surface text-brand-textMuted hover:text-brand-textMain rounded transition-micro cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-brand-textMain font-semibold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 15))}
              className="p-1 hover:bg-brand-surface text-brand-textMuted hover:text-brand-textMain rounded transition-micro cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Page & Gutter Info Banner */}
        <div className="flex items-center justify-around bg-brand-bg px-2.5 py-1.5 rounded-xl border border-brand-border text-[11px] text-brand-textMuted">
          <div className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
            <span>Pages: <strong className="text-brand-textMain">{estimatedPages}</strong></span>
          </div>
          <span className="text-brand-borderStrong">|</span>
          <span>Gutter: <strong className="text-brand-textMain">{gutterMargin}"</strong></span>
        </div>
      </div>

      {/* Main Paginated View Canvas */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-brand-bg">
        <div
          className="flex flex-col items-center gap-12 transition-transform duration-200 origin-top"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {pages.map((page) => {
            const isOddPage = page.pageNum % 2 !== 0;
            const leftMargin = isOddPage ? gutterMargin : outsideMargin;
            const rightMargin = isOddPage ? outsideMargin : gutterMargin;

            return (
              <div
                key={page.pageNum}
                className="relative bg-white text-slate-900 shadow-xl rounded-sm transition-shadow hover:shadow-2xl"
                style={{
                  width: `${currentSpec.width * 96}px`,
                  minHeight: `${currentSpec.height * 96}px`,
                  boxSizing: 'border-box',
                  paddingTop: `${topMargin * 96}px`,
                  paddingBottom: `${bottomMargin * 96}px`,
                  paddingLeft: `${leftMargin * 96}px`,
                  paddingRight: `${rightMargin * 96}px`
                }}
              >
                {/* Margin Guidelines Overlay */}
                {showGuideLines && (
                  <>
                    {/* Safe Zone Boundary */}
                    <div
                      className="absolute border border-dashed border-sky-400/40 pointer-events-none"
                      style={{
                        top: `${topMargin * 96}px`,
                        bottom: `${bottomMargin * 96}px`,
                        left: `${leftMargin * 96}px`,
                        right: `${rightMargin * 96}px`
                      }}
                    >
                      <span className="absolute -top-4 left-1 text-[9px] font-mono text-sky-600 bg-sky-50 px-1 rounded border border-sky-200">
                        Safe Zone
                      </span>
                    </div>

                    {/* Bleed Guideline */}
                    <div
                      className="absolute border border-dotted border-rose-400/50 pointer-events-none"
                      style={{
                        top: `-${bleedMargin * 96}px`,
                        bottom: `-${bleedMargin * 96}px`,
                        left: `-${bleedMargin * 96}px`,
                        right: `-${bleedMargin * 96}px`
                      }}
                    >
                      <span className="absolute top-0 right-1 text-[9px] font-mono text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                        Bleed (+0.125")
                      </span>
                    </div>

                    {/* Gutter Highlight Indicator */}
                    <div
                      className="absolute top-0 bottom-0 bg-indigo-500/10 pointer-events-none"
                      style={{
                        left: isOddPage ? 0 : 'auto',
                        right: isOddPage ? 'auto' : 0,
                        width: `${gutterMargin * 96}px`
                      }}
                    >
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase tracking-widest text-indigo-600 font-bold rotate-90 ${
                          isOddPage ? 'left-1' : 'right-1'
                        }`}
                      >
                        Gutter ({gutterMargin}")
                      </span>
                    </div>
                  </>
                )}

                {/* Running Header */}
                <div className="absolute top-4 left-8 right-8 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-serif border-b border-slate-200 pb-1">
                  <span>{isOddPage ? chapterTitle || 'Chapter' : bookTitle}</span>
                  <span className="font-mono text-[9px] text-slate-400">
                    {isOddPage ? 'RECTO (ODD)' : 'VERSO (EVEN)'}
                  </span>
                </div>

                {/* Page Text Content */}
                <div className="font-serif leading-relaxed text-sm text-slate-800 space-y-4 text-justify">
                  {page.paragraphs.map((paraText, pIdx) => (
                    <p
                      key={pIdx}
                      className="indent-4"
                      dangerouslySetInnerHTML={{ __html: paraText }}
                    />
                  ))}
                </div>

                {/* Page Number Footer */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center text-xs font-mono text-slate-600">
                  {page.pageNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
