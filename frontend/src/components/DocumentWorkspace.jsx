import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { parseHtmlToWords } from '../utils/htmlTextMapper';
import { API_BASE_URL, getAuthHeaders } from '../config/apiConfig';
import { Play, Pause, Stop, ArrowLeft, DownloadSimple, SpinnerGap } from '@phosphor-icons/react';

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
      <div className="group relative flex items-start p-2 rounded transition-all duration-150 bg-brand-primary/10 border-l-2 border-brand-primary mb-4">
        {/* Play Button positioned in the left page margin gutter on hover */}
        <button
          onClick={onPlay}
          className="absolute -left-12 top-2 p-1.5 rounded-full bg-brand-primary hover:bg-brand-primaryHover text-brand-surface shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Pause reading"
        >
          <Pause className="w-4 h-4" />
        </button>
        <div className="flex-1 text-brand-textMain text-[17px] leading-relaxed select-none font-serif font-normal">
          {parsedWords.map((w, idx) => {
            const classes = [];
            if (w.bold) classes.push('font-bold text-brand-textMain');
            if (w.italic) classes.push('italic');
            
            const isHighlighted = w.isWord && activeWord && w.start === activeWord.start;
            if (isHighlighted) {
              classes.push('bg-brand-accent/50 text-brand-textMain font-medium px-0.5 rounded border-b border-brand-accent shadow-sm mx-0.5');
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
        ? 'bg-brand-primary/5 border-brand-primary/30'
        : 'hover:bg-brand-bg border-transparent'
    }`}>
      {/* Play Button in the margin gutter - only visible when hovering over the paragraph */}
      <button
        onClick={onPlay}
        className="absolute -left-12 top-2 p-1.5 rounded-full bg-brand-surface hover:bg-brand-primary/10 hover:text-brand-primary text-brand-textMuted opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm border border-brand-border hover:scale-105 active:scale-95 cursor-pointer"
        title="Listen from here"
      >
        <Play className="w-4 h-4" />
      </button>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="flex-1 outline-none text-brand-textMain text-[17px] leading-relaxed font-serif font-normal"
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
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        headers: getAuthHeaders()
      });
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
      await fetch(`${API_BASE_URL}/progress`, {
        method: 'POST',
        headers: getAuthHeaders(),
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
      const response = await fetch(`${API_BASE_URL}/paragraphs/${paragraphId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
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
      const response = await fetch(`${API_BASE_URL}/export/${projectId}/docx`, {
        headers: getAuthHeaders()
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg text-brand-textMuted">
        <SpinnerGap className="animate-spin w-8 h-8 text-brand-primary mb-4" />
        <p className="text-sm font-medium font-sans">Loading document from database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-bg">
        <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger p-6 rounded-2xl max-w-xl text-center shadow-lg font-sans">
          <h4 className="font-bold text-lg mb-2 font-serif">Error Loading Document</h4>
          <p className="text-sm mb-4">{error}</p>
          <button onClick={fetchProjectData} className="px-4 py-2 bg-brand-danger hover:bg-brand-danger/80 text-brand-surface rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textMain pb-36">
      {/* Sleek Light Header Bar (Microsoft Word Style Ribbon / Status Bar) */}
      <header className="bg-brand-surface border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm font-sans">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-brand-textMuted hover:text-brand-textMain bg-brand-bg hover:bg-brand-border rounded-lg transition-all cursor-pointer"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-brand-textMain font-serif">{project?.title || 'Untitled Project'}</h1>
            <p className="text-xs text-brand-textMuted">
              ID: #{project?.id} • Paragraphs: {paragraphs.length}
            </p>
          </div>
        </div>

        {/* Database Auto-Save Badge */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-brand-info text-xs bg-brand-info/10 px-3 py-1.5 rounded-full border border-brand-info/20 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-info"></span>
              All changes saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-brand-warning text-xs bg-brand-warning/10 px-3 py-1.5 rounded-full border border-brand-warning/20 font-medium animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-warning"></span>
              Saving...
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-brand-danger text-xs bg-brand-danger/10 px-3 py-1.5 rounded-full border border-brand-danger/20 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-danger"></span>
              Save Error
            </span>
          )}
        </div>
      </header>

      {/* Editor Canvas: Microsoft Word Print Layout View */}
      <div className="px-4 py-8 sm:px-6 md:py-12">
        <article className="w-full max-w-[850px] bg-brand-surface border border-brand-border shadow-md mx-auto p-12 sm:p-16 md:p-20 min-h-[1100px] text-brand-textMain rounded-sm">
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
              <div className="text-center text-brand-textMuted py-32 font-sans text-sm">
                No text found in this manuscript.
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Elegant Persistent Bottom Control Bar (Light Mode) */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-surface/95 backdrop-blur-xl border-t border-brand-border px-6 py-4 z-50 shadow-md flex flex-wrap items-center justify-between gap-4 font-sans">
        {/* Left Section: Active info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-brand-textMain font-serif line-clamp-1">{project?.title}</p>
            <p className="text-xs text-brand-textMuted">
              Active Paragraph: <span className="text-brand-primary font-semibold">#{activeParagraphIndex + 1}</span> of {paragraphs.length}
            </p>
          </div>
        </div>

        {/* Center Section: Playback Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayToggle}
            className={`p-3.5 rounded-full transition-all duration-300 cursor-pointer ${
              isPlaying && !isPaused
                ? 'bg-brand-warning text-brand-textMain hover:bg-brand-warning/80 shadow-sm'
                : 'bg-brand-primary text-brand-surface hover:bg-brand-primaryHover shadow-sm'
            } hover:scale-105 active:scale-95`}
            title={isPlaying && !isPaused ? 'Pause Speech' : 'Play Speech'}
          >
            {isPlaying && !isPaused ? (
              <Pause className="w-5 h-5" weight="fill" />
            ) : (
              <Play className="w-5 h-5" weight="fill" />
            )}
          </button>

          {isPlaying && (
            <button
              onClick={stop}
              className="p-3 bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger rounded-full transition-all border border-brand-danger/20 hover:scale-105 active:scale-95 cursor-pointer"
              title="Stop Speech"
            >
              <Stop className="w-4 h-4" weight="fill" />
            </button>
          )}
        </div>

        {/* Right Section: Speed, Voice & Download */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {/* Speed slider */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <span className="text-xs text-brand-textMuted font-semibold w-8 text-right">{playbackRate.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-24 h-1 rounded bg-brand-border appearance-none cursor-pointer accent-brand-primary outline-none"
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
            className="bg-brand-surface border border-brand-border text-brand-textMain text-xs rounded-xl p-2 outline-none cursor-pointer max-w-[180px] focus:border-brand-primary transition-micro shadow-sm"
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
            className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold rounded-xl flex items-center gap-2 border border-brand-primary/20 transition-micro active:scale-[0.97] shadow-sm cursor-pointer"
            title="Download Word Document"
          >
            <DownloadSimple className="w-3.5 h-3.5" />
            Download Word Doc
          </button>
        </div>
      </div>
    </div>
  );
}
