import React from 'react';
import { CheckCircle2, AlertCircle, PlayCircle, Download } from 'lucide-react';

export function PipelineStatus({ outline, paragraphs, activeChapterIndex }) {
  // Extract ToC
  const tocObj = outline?.tocData || {};
  const tocList = tocObj.toc || (Array.isArray(tocObj) ? tocObj : []);

  // Determine written chapters
  const writtenChapterIndices = new Set(
    paragraphs.map(p => p.chapterIndex)
  );

  const getChapterIndex = (ch) => {
    return ch.chapterIndex !== undefined ? ch.chapterIndex : (ch.chapterNumber - 1);
  };

  const chNumber = activeChapterIndex + 1;
  const isCurrentChapterWritten = writtenChapterIndices.has(activeChapterIndex);

  // Check if current chapter paragraphs have any fact-check flags
  const currentChapterParas = paragraphs.filter(p => p.chapterIndex === activeChapterIndex);
  let hasFlags = false;
  currentChapterParas.forEach(p => {
    let flags = [];
    try {
      if (typeof p.statusFlags === 'string') {
        flags = JSON.parse(p.statusFlags);
      } else if (Array.isArray(p.statusFlags)) {
        flags = p.statusFlags;
      }
    } catch (e) {
      flags = [];
    }
    if (flags && flags.length > 0) {
      hasFlags = true;
    }
  });

  // Ready for export if all chapters have paragraphs written
  const allChaptersWritten = tocList.length > 0 && tocList.every(ch => 
    writtenChapterIndices.has(getChapterIndex(ch))
  );

  const steps = [
    {
      label: 'Outline Approved',
      status: 'completed',
      description: 'Book layout approved',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    },
    {
      label: `Chapter ${chNumber}: Drafted`,
      status: isCurrentChapterWritten ? 'completed' : 'pending',
      description: isCurrentChapterWritten ? 'Prose generated' : 'Pending generation',
      icon: isCurrentChapterWritten ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-slate-350 dark:border-slate-700" />
      )
    },
    {
      label: `Chapter ${chNumber}: Edited & Audited`,
      status: isCurrentChapterWritten ? (hasFlags ? 'warning' : 'completed') : 'pending',
      description: isCurrentChapterWritten 
        ? (hasFlags ? 'Audited: Review flags' : 'Audited & Verified') 
        : 'Pending verification',
      icon: isCurrentChapterWritten ? (
        hasFlags ? (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-slate-350 dark:border-slate-700" />
      )
    },
    {
      label: 'Ready for Audio/Export',
      status: allChaptersWritten ? 'completed' : 'pending',
      description: allChaptersWritten ? 'All chapters complete' : 'Chapters remaining',
      icon: allChaptersWritten ? (
        <Download className="w-4 h-4 text-emerald-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-slate-350 dark:border-slate-700" />
      )
    }
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 py-2.5 transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left section: status description */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
          <span className="uppercase tracking-widest text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">
            Pipeline Monitor
          </span>
        </div>

        {/* Middle section: pipeline steps */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 lg:gap-8">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isWarning = step.status === 'warning';
            const isPending = step.status === 'pending';

            return (
              <React.Fragment key={idx}>
                <div 
                  className={`flex items-center space-x-2 text-xs py-1 px-3 rounded-lg border transition-all ${
                    isCompleted 
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-450 font-medium'
                      : isWarning
                      ? 'bg-amber-50/50 dark:bg-amber-955/10 border-amber-500/20 text-amber-800 dark:text-amber-450 font-medium animate-pulse'
                      : 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-500 dark:text-slate-400'
                  }`}
                  title={step.description}
                >
                  {step.icon}
                  <span>{step.label}</span>
                </div>
                
                {idx < steps.length - 1 && (
                  <span className="text-slate-350 dark:text-slate-700 font-mono select-none text-xs">
                    ➔
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right placeholder for balance */}
        <div className="hidden md:block w-28 text-right text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold select-none">
          {allChaptersWritten ? 'Swarm Complete 100%' : 'Swarm Executing...'}
        </div>
      </div>
    </div>
  );
}
