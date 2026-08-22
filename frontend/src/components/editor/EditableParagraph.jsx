import React, { useRef, useEffect, useMemo } from 'react';
import { parseHtmlToWords } from '../../utils/htmlTextMapper';

/**
 * Calculates absolute text character offset of selection caret relative to container element
 */
function getCaretAbsoluteOffset(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !element) return 0;
  try {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  } catch (err) {
    return 0;
  }
}

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
  onFocus,
  onNavigateNext,
  onNavigatePrev
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

  const handleKeyDown = (e) => {
    if (!editorRef.current) return;

    if (e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = editorRef.current.getBoundingClientRect();

        const totalLen = (editorRef.current.textContent || '').length;
        const currentOffset = getCaretAbsoluteOffset(editorRef.current);

        // Caret is at the last line AND caret is at end of full paragraph text
        const isAtLastLine = containerRect.bottom > 0 && rect.bottom >= containerRect.bottom - 16;
        const isAtEnd = currentOffset >= totalLen;

        if (isAtLastLine && isAtEnd) {
          if (onNavigateNext) {
            e.preventDefault();
            onNavigateNext(index);
          }
        }
      }
    } else if (e.key === 'ArrowUp') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = editorRef.current.getBoundingClientRect();

        const currentOffset = getCaretAbsoluteOffset(editorRef.current);

        // Caret is at the first line AND caret is at start of paragraph text
        const isAtFirstLine = containerRect.top > 0 && rect.top <= containerRect.top + 16;
        const isAtStart = currentOffset === 0;

        if (isAtFirstLine && isAtStart) {
          if (onNavigatePrev) {
            e.preventDefault();
            onNavigatePrev(index);
          }
        }
      }
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

  // Overlay word highlight when speaking (no select-none)
  if (isSpeaking && parsedWords) {
    return (
      <div className="group relative flex items-start p-2 rounded transition-micro bg-brand-primary/10 border-l-2 border-brand-primary mb-4 animate-fade-in">
        {/* Play Button positioned in the left page margin gutter on hover */}
        <button
          onClick={onPlay}
          className="absolute -left-12 top-2 p-1.5 rounded-full bg-brand-primary hover:bg-brand-primaryHover text-white shadow-md hover:scale-105 active:scale-95 transition-all z-10"
          title="Pause reading"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <div className="flex-1 max-w-full break-words overflow-wrap-anywhere text-brand-textMain text-[17px] leading-relaxed font-sans font-normal">
          {parsedWords.map((w, idx) => {
            const classes = [];
            if (w.bold) classes.push('font-bold');
            if (w.italic) classes.push('italic');
            
            const isHighlighted = w.isWord && activeWord && w.start === activeWord.start;
            if (isHighlighted) {
              classes.push('bg-brand-warning text-slate-900 font-medium px-0.5 rounded border-b border-brand-warning shadow-sm mx-0.5');
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
    <div className={`group relative flex items-start p-2 rounded transition-micro mb-4 border-l-2 ${
      isActive
        ? 'bg-brand-primary/10 border-brand-primary'
        : 'hover:bg-brand-bg border-transparent'
    }`}>
      {/* Play Button in the margin gutter */}
      <button
        onClick={onPlay}
        className="absolute -left-12 top-2 p-1.5 rounded-full bg-brand-bg hover:bg-brand-primary/10 hover:text-brand-primary text-brand-textMuted opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm border border-brand-border hover:scale-105 active:scale-95 z-10"
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
        onKeyDown={handleKeyDown}
        className="flex-1 max-w-full break-words overflow-wrap-anywhere outline-none text-brand-textMain text-[17px] leading-relaxed font-sans font-normal"
        style={{ minHeight: '1.5em' }}
      />
    </div>
  );
}
