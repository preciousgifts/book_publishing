import React from 'react';
import { ChevronRight, FileText, Wand2, Sparkles, CheckCircle2 } from 'lucide-react';

export function Sidebar({
  outline,
  paragraphs,
  activeChapterIndex,
  onSelectChapter,
  onWriteChapter,
  isGenerating
}) {
  // Extract ToC list from outline tocData
  const tocObj = outline?.tocData || {};
  const tocList = tocObj.toc || (Array.isArray(tocObj) ? tocObj : []);

  // Determine which chapters have paragraphs written
  const writtenChapterIndices = new Set(
    paragraphs.map(p => p.chapterIndex)
  );

  // Find first unwritten chapter index
  const nextUnwrittenChapter = tocList.find(ch => 
    !writtenChapterIndices.has(ch.chapterNumber - 1) && 
    !writtenChapterIndices.has(ch.chapterIndex)
  );

  const getChapterIndex = (ch) => {
    return ch.chapterIndex !== undefined ? ch.chapterIndex : (ch.chapterNumber - 1);
  };

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 flex flex-col h-full select-none">
      <div className="flex-1 overflow-y-auto space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Manuscript Swarm Outline
          </h2>
          
          <nav className="space-y-1">
            {tocList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No outline generated.</p>
            ) : (
              tocList.map((ch) => {
                const idx = getChapterIndex(ch);
                const isWritten = writtenChapterIndices.has(idx);
                const isActive = activeChapterIndex === idx;

                return (
                  <div
                    key={ch.chapterNumber || idx}
                    className={`group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'
                    }`}
                    onClick={() => onSelectChapter(idx)}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className={`mt-0.5 p-1 rounded ${
                        isWritten ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'text-slate-400 bg-slate-50 dark:bg-slate-900'
                      }`}>
                        {isWritten ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      
                      <div>
                        <h4 className={`text-sm font-semibold leading-tight ${
                          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          Chapter {ch.chapterNumber || (idx + 1)}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {ch.title}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isGenerating}
                      onClick={(e) => {
                        e.stopPropagation();
                        onWriteChapter(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 disabled:opacity-50 p-1 text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded"
                      title={isWritten ? "Regenerate chapter" : "Draft chapter"}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* Prominent Next Chapter Swarm Trigger */}
      {nextUnwrittenChapter && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 mt-4">
          <button
            disabled={isGenerating}
            onClick={() => onWriteChapter(getChapterIndex(nextUnwrittenChapter))}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-900 text-white disabled:text-slate-400 rounded-xl shadow font-semibold text-sm transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Draft Chapter {nextUnwrittenChapter.chapterNumber}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
