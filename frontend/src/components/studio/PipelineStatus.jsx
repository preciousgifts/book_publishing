import React from 'react';
import { CheckCircle, Warning, PlayCircle, DownloadSimple } from '@phosphor-icons/react';

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
      icon: <CheckCircle className="w-4 h-4 text-brand-info" />
    },
    {
      label: `Chapter ${chNumber}: Drafted`,
      status: isCurrentChapterWritten ? 'completed' : 'pending',
      description: isCurrentChapterWritten ? 'Prose generated' : 'Pending generation',
      icon: isCurrentChapterWritten ? (
        <CheckCircle className="w-4 h-4 text-brand-info" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-brand-border" />
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
          <Warning className="w-4 h-4 text-brand-warning" />
        ) : (
          <CheckCircle className="w-4 h-4 text-brand-info" />
        )
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-brand-border" />
      )
    },
    {
      label: 'Ready for Audio/Export',
      status: allChaptersWritten ? 'completed' : 'pending',
      description: allChaptersWritten ? 'All chapters complete' : 'Chapters remaining',
      icon: allChaptersWritten ? (
        <DownloadSimple className="w-4 h-4 text-brand-info" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-brand-border" />
      )
    }
  ];

  return (
    <div className="w-full bg-brand-surface border-b border-brand-border px-6 py-2.5 transition-colors duration-150 transition-micro">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left section: status description */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-textMuted select-none">
          <span className="uppercase tracking-widest text-[10px] bg-brand-bg px-2 py-0.5 rounded text-brand-textMuted font-mono">
            Progress Monitor
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
                      ? 'bg-brand-info/10 border-brand-info/20 text-brand-info font-medium'
                      : isWarning
                      ? 'bg-brand-warning/10 border-brand-warning/20 text-brand-warning font-medium animate-pulse'
                      : 'bg-brand-bg border-transparent text-brand-textMuted'
                  }`}
                  title={step.description}
                >
                  {step.icon}
                  <span>{step.label}</span>
                </div>
                
                {idx < steps.length - 1 && (
                  <span className="text-brand-textMuted font-mono select-none text-xs">
                    ➔
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right placeholder for balance */}
        <div className="hidden md:block w-28 text-right text-[10px] text-brand-textMuted font-mono font-bold select-none">
          {allChaptersWritten ? 'Writing Complete 100%' : 'Writing Activity...'}
        </div>
      </div>
    </div>
  );
}
