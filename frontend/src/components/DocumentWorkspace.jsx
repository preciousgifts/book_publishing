import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { parseHtmlToWords } from '../utils/htmlTextMapper';

// Reusable Sub-Component for a single paragraph that resolves the React contentEditable caret jumping bug
function EditableParagraph({
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

  // Prevent saving during transitions to speech mode
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


  // Highlighting engine: Parse paragraph HTML to words and match the speech boundary
  const parsedWords = useMemo(() => {
    if (!isSpeaking) return null;
    return parseHtmlToWords(initialContent);
  }, [isSpeaking, initialContent]);

  const activeWord = useMemo(() => {
    if (activeCharIndex === null || !parsedWords) return null;
    return parsedWords.find(w => w.isWord && activeCharIndex >= w.start && activeCharIndex < w.end);
  }, [parsedWords, activeCharIndex]);

  // When speaking, we swap out contentEditable for a styled text renderer to prevent input cursor clashing
  if (isSpeaking && parsedWords) {
    return (
      <div className="group relative flex items-start p-2 rounded transition-all duration-150 bg-indigo-50/40 border-l-2 border-indigo-500/80 mb-4">
        {/* Play Button positioned in the left page margin gutter on hover */}
        <button
          onClick={onPlay}
          className="absolute -left-12 top-2 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
          title="Pause reading"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <div className="flex-1 text-slate-900 text-[17px] leading-relaxed select-none font-serif font-normal">
          {parsedWords.map((w, idx) => {
            const classes = [];
            if (w.bold) classes.push('font-bold text-black');
            if (w.italic) classes.push('italic');
            
            const isHighlighted = w.isWord && activeWord && w.start === activeWord.start;
            if (isHighlighted) {
              // Soft, physical-highlighter yellow highlight matching MS Word style
              classes.push('bg-yellow-200 text-slate-950 font-medium px-0.5 rounded border-b border-yellow-400/50 shadow-sm mx-0.5');
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
        ? 'bg-indigo-50/20 border-indigo-500/30'
        : 'hover:bg-slate-50/50 border-transparent'
    }`}>
      {/* Play Button in the margin gutter - only visible when hovering over the paragraph */}
      <button
        onClick={onPlay}
        className="absolute -left-12 top-2 p-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm border border-slate-200/50 hover:scale-105 active:scale-95"
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
        className="flex-1 outline-none text-slate-900 text-[17px] leading-relaxed font-serif font-normal"
        style={{ minHeight: '1.5em' }}
      />
    </div>
  );
}

export function DocumentWorkspace({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const paragraphsRef = useRef([]);
  paragraphsRef.current = paragraphs;
  
  const activeParagraphIndexRef = useRef(0);
  activeParagraphIndexRef.current = activeParagraphIndex;

  const saveTimeouts = useRef({});

  // Ref to bypass circular callback hoisting dependencies
  const handleParagraphFinishedRef = useRef(null);

  // 1. Initialize custom TTS hook with end-of-speech paragraph advances
  const {
    supported,
    voices,
    selectedVoice,
    playbackRate,
    isPlaying,
    isPaused,
    activeCharIndex,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice
  } = useSpeechSynthesis({
    onEnd: () => {
      if (handleParagraphFinishedRef.current) {
        handleParagraphFinishedRef.current();
      }
    }
  });

  // 2. Fetch project, paragraphs, and progress from backend
  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to load project');
      
      const data = await response.json();
      setProject(data.project);
      setParagraphs(data.paragraphs);
      
      // Load progress
      if (data.progress) {
        setActiveParagraphIndex(data.progress.active_paragraph_index || 0);
        if (data.progress.playback_speed) {
          setRate(data.progress.playback_speed);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setRate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // 3. Play synthesis for a specific paragraph index
  const playParagraph = useCallback((index) => {
    const currentParagraphs = paragraphsRef.current;
    if (index < 0 || index >= currentParagraphs.length) {
      stop();
      return;
    }
    setActiveParagraphIndex(index);
    
    // Save progress to PostgreSQL in the background
    saveProgressToDb(index);

    // Render plain text of paragraph
    const wordTokens = parseHtmlToWords(currentParagraphs[index].content);
    const textToSpeak = wordTokens.map(w => w.text).join('');

    speak(textToSpeak);
  }, [speak, stop]);

  // Defer transitions to allow the SpeechSynthesis queue to fully clear
  const handleParagraphFinished = useCallback(() => {
    const nextIndex = activeParagraphIndexRef.current + 1;
    if (nextIndex < paragraphsRef.current.length) {
      setTimeout(() => {
        playParagraph(nextIndex);
      }, 150);
    } else {
      stop();
    }
  }, [playParagraph, stop]);

  // Keep callback reference updated
  useEffect(() => {
    handleParagraphFinishedRef.current = handleParagraphFinished;
  }, [handleParagraphFinished]);

  // Background task to sync progress index
  const saveProgressToDb = async (index) => {
    try {
      await fetch('http://localhost:8000/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          active_paragraph_index: index,
          playback_speed: playbackRate
        })
      });
    } catch (err) {
      console.error('Failed to save progress index:', err);
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      playParagraph(activeParagraphIndex);
    }
  };

  // 4. Save modified paragraph text to database
  const saveParagraphToDb = async (paragraphId, content) => {
    if (saveTimeouts.current[paragraphId]) {
      clearTimeout(saveTimeouts.current[paragraphId]);
      delete saveTimeouts.current[paragraphId];
    }

    try {
      const response = await fetch(`http://localhost:8000/api/paragraphs/${paragraphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Save failed');

      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save paragraph:', err);
      setSaveStatus('error');
    }
  };

  // OnInput updates local state immediately, and sets up a 1.5s debounced database save
  const handleParagraphInput = (paragraphId, updatedHtml) => {
    setSaveStatus('saving');
    setParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, content: updatedHtml } : p));

    if (saveTimeouts.current[paragraphId]) {
      clearTimeout(saveTimeouts.current[paragraphId]);
    }

    saveTimeouts.current[paragraphId] = setTimeout(() => {
      saveParagraphToDb(paragraphId, updatedHtml);
    }, 1500);
  };

  // OnBlur triggers database save immediately to ensure no data loss
  const handleParagraphSave = (paragraphId, updatedHtml) => {
    saveParagraphToDb(paragraphId, updatedHtml);
  };

  const handleParagraphFocus = (index) => {
    setActiveParagraphIndex(index);
    saveProgressToDb(index);
  };

  // Export current document state to docx
  const handleExport = async () => {
    if (!project) return;
    try {
      const response = await fetch(`http://localhost:8000/api/export/${projectId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to export document');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-medium">Loading document from database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-xl text-center shadow-lg">
          <h4 className="font-bold text-lg mb-2">Error Loading Document</h4>
          <p className="text-sm mb-4">{error}</p>
          <button onClick={fetchProjectData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 pb-36">
      {/* Sleek Light Header Bar (Microsoft Word Style Ribbon / Status Bar) */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            title="Back to dashboard"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{project?.title || 'Untitled Project'}</h1>
            <p className="text-xs text-slate-500">
              ID: #{project?.id} • Paragraphs: {paragraphs.length}
            </p>
          </div>
        </div>

        {/* Database Auto-Save Badge */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              All changes saved to DB
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-yellow-600 text-xs bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 font-medium animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
              Saving...
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-rose-600 text-xs bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              Save Error
            </span>
          )}
        </div>
      </header>

      {/* Editor Canvas: Microsoft Word Print Layout View */}
      <div className="px-4 py-8 sm:px-6 md:py-12">
        <article className="w-full max-w-[850px] bg-white border border-gray-300/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] mx-auto p-12 sm:p-16 md:p-20 min-h-[1100px] text-slate-800 rounded-sm">
          <div className="space-y-1">
            {paragraphs.map((p, idx) => (
              <EditableParagraph
                key={p.id}
                id={p.id}
                index={idx}
                initialContent={p.content}
                isActive={activeParagraphIndex === idx}
                isSpeaking={isPlaying && activeParagraphIndex === idx}
                activeCharIndex={activeCharIndex}
                onSave={handleParagraphSave}
                onInput={handleParagraphInput}
                onPlay={() => {
                  if (isPlaying && activeParagraphIndex === idx) {
                    if (isPaused) resume();
                    else pause();
                  } else {
                    playParagraph(idx);
                  }
                }}
                onFocus={handleParagraphFocus}
              />
            ))}
            {paragraphs.length === 0 && (
              <div className="text-center text-slate-400 py-32 font-sans text-sm">
                No text found in this manuscript.
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Elegant Persistent Bottom Control Bar (Light Mode) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 px-6 py-4 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] flex flex-wrap items-center justify-between gap-4">
        {/* Left Section: Active info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900 line-clamp-1">{project?.title}</p>
            <p className="text-xs text-slate-500">
              Active Paragraph: <span className="text-indigo-600 font-semibold">#{activeParagraphIndex + 1}</span> of {paragraphs.length}
            </p>
          </div>
        </div>

        {/* Center Section: Playback Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayToggle}
            className={`p-3.5 rounded-full transition-all duration-300 ${
              isPlaying && !isPaused
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
            } hover:scale-105 active:scale-95`}
            title={isPlaying && !isPaused ? 'Pause Speech' : 'Play Speech'}
          >
            {isPlaying && !isPaused ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {isPlaying && (
            <button
              onClick={stop}
              className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full transition-all border border-rose-100 hover:scale-105 active:scale-95"
              title="Stop Speech"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Right Section: Speed, Voice & Download */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Speed slider */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-xs text-slate-500 font-semibold w-8 text-right">{playbackRate.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-24 h-1 rounded bg-slate-200 appearance-none cursor-pointer accent-indigo-600 outline-none"
              title="Playback Rate"
            />
          </div>

          {/* Voice Dropdown */}
          <select
            value={selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : ''}
            onChange={(e) => {
              const voice = voices.find(v => `${v.name} (${v.lang})` === e.target.value);
              if (voice) setVoice(voice);
            }}
            className="bg-white border border-gray-300 text-slate-700 text-xs rounded-xl p-2 outline-none cursor-pointer max-w-[180px] focus:border-indigo-500 transition-all shadow-sm"
            title="System Voice"
          >
            {voices.map((voice, idx) => (
              <option key={idx} value={`${voice.name} (${voice.lang})`}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>

          {/* Download Word Doc Button */}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-xl flex items-center gap-2 border border-indigo-100 transition-all active:scale-[0.97] shadow-sm"
            title="Download Word Document"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
            </svg>
            Download Word Doc
          </button>
        </div>
      </div>
    </div>
  );
}
