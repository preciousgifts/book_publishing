import React, { useRef, useEffect, useMemo } from 'react';
import { parseHtmlToWords } from '../../utils/htmlTextMapper';

/**
 * High-fidelity paragraph editor component.
 * Prevents React caret jumping by using contentEditable directly with ref updates.
 * Guards against unmount/focus race conditions with an isModified ref guard.
 */
export function EditableParagraph({
  id,
  index,
  initialContent,
  isActive,
  isSpeaking,
  activeCharIndex,
  onSave,
  onInput,
  onPlay,
  onFocus
}) {
  const editorRef = useRef(null);
  const isEditing = useRef(false);
  const isModified = useRef(false);

  // Synchronize database content changes to the editor DOM only when NOT actively editing
  useEffect(() => {
    if (editorRef.current && !isEditing.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  // Handle caret guard when speaking starts (unmount contentEditable view state)
  useEffect(() => {
    if (isSpeaking) {
      isEditing.current = false;
      // Reset isModified to prevent ghost onBlur events during transition
      isModified.current = false;
    }
  }, [isSpeaking]);

  const handleInput = () => {
    if (editorRef.current) {
      isModified.current = true;
      onInput(id, editorRef.current.innerHTML);
    }
  };

  const handleFocus = () => {
    isEditing.current = true;
    onFocus(index);
  };

  const handleBlur = () => {
    isEditing.current = false;
    if (editorRef.current && isModified.current) {
      isModified.current = false;
      onSave(id, editorRef.current.innerHTML);
    }
  };

  // Highlighting engine: Parse HTML to words and match character indices
  const parsedWords = useMemo(() => {
    if (!isSpeaking) return null;
    return parseHtmlToWords(initialContent);
  }, [isSpeaking, initialContent]);

  const activeWord = useMemo(() => {
    if (activeCharIndex === null || !parsedWords) return null;
    return parsedWords.find(w => w.isWord && activeCharIndex >= w.start && activeCharIndex < w.end);
  }, [parsedWords, activeCharIndex]);

  // Overlay word highlight when speaking
  if (isSpeaking && parsedWords) {
    return (
      <div className="group relative flex items-start p-2 rounded transition-all duration-150 bg-indigo-50/40 dark:bg-indigo-950/20 border-l-2 border-indigo-500/80 mb-4 select-none">
        {/* Play Button positioned in the left page margin gutter on hover */}
        <button
          onClick={onPlay}
          className="absolute -left-12 top-2 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-105 active:scale-95 transition-all z-10"
          title="Pause reading"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <div className="flex-1 text-slate-900 dark:text-slate-100 text-[17px] leading-relaxed font-serif font-normal" style={{ fontFamily: 'Georgia, serif' }}>
          {parsedWords.map((w, idx) => {
            const classes = [];
            if (w.bold) classes.push('font-bold text-black dark:text-white');
            if (w.italic) classes.push('italic');
            
            const isHighlighted = w.isWord && activeWord && w.start === activeWord.start;
            if (isHighlighted) {
              classes.push('bg-yellow-200 dark:bg-yellow-800 text-slate-950 dark:text-slate-100 font-medium px-0.5 rounded border-b border-yellow-400/50 shadow-sm mx-0.5');
            }

            return (
              <span key={idx} className={classes.join(' ')}>
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative flex items-start p-2 rounded transition-all duration-150 mb-4 border-l-2 ${
      isActive
        ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500/30'
        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-transparent'
    }`}>
      {/* Play Button in the margin gutter - only visible when hovering over the paragraph */}
      <button
        onClick={onPlay}
        className="absolute -left-12 top-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm border border-slate-200/50 dark:border-slate-700 hover:scale-105 active:scale-95 z-10"
        title="Listen from here"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="flex-1 outline-none text-slate-900 dark:text-slate-100 text-[17px] leading-relaxed font-serif font-normal"
        style={{ minHeight: '1.5em', fontFamily: 'Georgia, serif' }}
      />
    </div>
  );
}
