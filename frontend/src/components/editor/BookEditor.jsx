import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Pause, Square, ChevronRight, Wand2, RefreshCw } from 'lucide-react';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { EditableParagraph } from './EditableParagraph';
import { Toolbar } from './Toolbar';
import { parseHtmlToWords } from '../../utils/htmlTextMapper';
import { Sidebar } from '../studio/Sidebar';
import { SwarmLogDrawer } from '../studio/SwarmLogDrawer';
import { PipelineStatus } from '../studio/PipelineStatus';

export function BookEditor({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [isLoading, setIsLoading] = useState(true);
  const [isSwarming, setIsSwarming] = useState(false);
  const [swarmProgress, setSwarmProgress] = useState('');
  const [error, setError] = useState(null);

  const paragraphsRef = useRef([]);
  paragraphsRef.current = paragraphs;
  
  const activeParagraphIndexRef = useRef(0);
  activeParagraphIndexRef.current = activeParagraphIndex;

  const saveTimeouts = useRef({});
  const handleParagraphFinishedRef = useRef(null);

  // 1. TTS Synthesis Hook
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

  // 2. Fetch manuscript data from Express Gateway API (port 5000)
  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to load project details');
      
      const resData = await response.json();
      if (resData.success) {
        const proj = resData.data;
        if (proj && !proj.outline && proj.outlines && proj.outlines.length > 0) {
          proj.outline = proj.outlines.find(o => o.approved) || proj.outlines[proj.outlines.length - 1];
        }
        setProject(proj);
        setParagraphs(proj.paragraphs || []);
        
        // Restore user progress index and playback settings
        if (resData.data.userProgress) {
          const progress = resData.data.userProgress;
          setActiveParagraphIndex(progress.activeParagraphIndex || 0);
          if (progress.playbackSpeed) {
            setRate(progress.playbackSpeed);
          }
        }
      } else {
        throw new Error(resData.error || 'Failed to fetch project');
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

  // Play specific paragraph index
  const playParagraph = useCallback((index) => {
    const currentParagraphs = paragraphsRef.current;
    if (index < 0 || index >= currentParagraphs.length) {
      stop();
      return;
    }
    setActiveParagraphIndex(index);
    saveProgressToDb(index);

    // Filter HTML elements and map text for TTS synthesis
    const wordTokens = parseHtmlToWords(currentParagraphs[index].formattedHtml || currentParagraphs[index].content || '');
    const textToSpeak = wordTokens.map(w => w.text).join('');

    speak(textToSpeak);
  }, [speak, stop]);

  // Handle continuous audio track transitions with queue deferral
  const handleParagraphFinished = useCallback(() => {
    const nextIndex = activeParagraphIndexRef.current + 1;
    if (nextIndex < paragraphsRef.current.length) {
      // Speak next paragraph
      playParagraph(nextIndex);
    } else {
      stop();
    }
  }, [playParagraph, stop]);

  useEffect(() => {
    handleParagraphFinishedRef.current = handleParagraphFinished;
  }, [handleParagraphFinished]);

  // Background task to save progress index
  const saveProgressToDb = async (index) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('http://localhost:5000/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          activeParagraphIndex: index,
          playbackSpeed: playbackRate,
          activeChapterIndex: paragraphsRef.current[index]?.chapterIndex || 0
        })
      });
    } catch (err) {
      console.error('Failed to sync reading progress:', err);
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

  const handleParagraphPlay = (index) => {
    if (isPlaying && activeParagraphIndex === index) {
      if (isPaused) resume();
      else pause();
    } else {
      playParagraph(index);
    }
  };

  // 3. Save paragraph changes back to the database
  const saveParagraphToDb = async (paragraphId, htmlContent) => {
    if (saveTimeouts.current[paragraphId]) {
      clearTimeout(saveTimeouts.current[paragraphId]);
      delete saveTimeouts.current[paragraphId];
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/paragraphs/${paragraphId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawContent: htmlContent.replace(/<[^>]*>/g, ''), // strip tags for rawContent
          formattedHtml: htmlContent
        })
      });
      
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || 'Failed to save');
      
      setSaveStatus('saved');
    } catch (err) {
      console.error('Paragraph save error:', err);
      setSaveStatus('error');
    }
  };

  const handleParagraphInput = (paragraphId, updatedHtml) => {
    setSaveStatus('saving');
    setParagraphs(prev => prev.map(p => p.id === paragraphId ? { ...p, formattedHtml: updatedHtml } : p));

    if (saveTimeouts.current[paragraphId]) {
      clearTimeout(saveTimeouts.current[paragraphId]);
    }

    saveTimeouts.current[paragraphId] = setTimeout(() => {
      saveParagraphToDb(paragraphId, updatedHtml);
    }, 1500);
  };

  const handleParagraphSave = (paragraphId, updatedHtml) => {
    saveParagraphToDb(paragraphId, updatedHtml);
  };

  const handleParagraphFocus = (index) => {
    setActiveParagraphIndex(index);
    saveProgressToDb(index);
  };

  // 4. Exporter Triggers
  const handleExportFile = async (format) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/export/${projectId}/${format}?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to generate file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'manuscript'}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  // 5. Swarm triggers
  const handleSwarmOutline = async () => {
    const prompt = window.prompt("Enter core theme/prompt to regenerate outlines swarm:", "A deep dive into advanced agentic AI architectures.");
    if (!prompt) return;

    setIsSwarming(true);
    setSwarmProgress('Regenerating outline with Multi-Agent swarm (Lead Architect)...');
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/swarm/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          prompt,
          genre: project?.genre || 'non-fiction'
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      // Auto approve generated outline
      setSwarmProgress('Approving generated outline outline and setting layout...');
      const approveRes = await fetch('http://localhost:5000/api/swarm/approve-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          outlineId: data.data.id,
          discoveryAnswers: { style: 'formal', depth: 'deep' }
        })
      });
      const approveData = await approveRes.json();
      if (!approveData.success) throw new Error(approveData.error);

      // Successfully regenerated
      alert("Outline successfully generated and approved!");
      fetchProjectData();
    } catch (err) {
      alert(`Swarm Outline error: ${err.message}`);
    } finally {
      setIsSwarming(false);
      setSwarmProgress('');
    }
  };

  const handleSwarmWriteChapter = async (chapterIndex) => {
    setIsSwarming(true);
    setSwarmProgress(`AI writing Chapter ${chapterIndex + 1} (Writer -> Editor -> Auditor pipeline)...`);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/swarm/write-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          chapterIndex
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      alert(`Chapter ${chapterIndex + 1} generated successfully!`);
      fetchProjectData();
    } catch (err) {
      alert(`Swarm Chapter Write error: ${err.message}`);
    } finally {
      setIsSwarming(false);
      setSwarmProgress('');
    }
  };

  // Group paragraphs by chapters for table of contents layout
  const chapters = useMemo(() => {
    const map = {};
    paragraphs.forEach(p => {
      const chIdx = p.chapterIndex || 0;
      if (!map[chIdx]) map[chIdx] = [];
      map[chIdx].push(p);
    });
    return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [paragraphs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-500">
        <RefreshCw className="animate-spin h-8 w-8 text-indigo-600 mb-4" />
        <p className="text-sm font-medium">Loading document and progress...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* 1. Header Toolbar */}
      <Toolbar
        bookTitle={project?.title || 'Manuscript'}
        saveStatus={saveStatus}
        onBack={onBack}
        onExportDocx={() => handleExportFile('docx')}
        onExportPdf={() => handleExportFile('pdf')}
        onSwarmOutline={handleSwarmOutline}
      />

      {/* Pipeline Status Stepper */}
      <PipelineStatus
        outline={project?.outline}
        paragraphs={paragraphs}
        activeChapterIndex={paragraphs[activeParagraphIndex] ? (paragraphs[activeParagraphIndex].chapterIndex || 0) : 0}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side TOC sidebar */}
        <Sidebar
          outline={project?.outline}
          paragraphs={paragraphs}
          activeChapterIndex={paragraphs[activeParagraphIndex] ? (paragraphs[activeParagraphIndex].chapterIndex || 0) : 0}
          onSelectChapter={(idx) => {
            const chParas = paragraphs.filter(p => (p.chapterIndex || 0) === idx);
            if (chParas.length > 0) {
              const targetIdx = paragraphs.indexOf(chParas[0]);
              if (targetIdx !== -1) {
                setActiveParagraphIndex(targetIdx);
                const el = document.getElementById(`p-${chParas[0].id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }}
          onWriteChapter={handleSwarmWriteChapter}
          isGenerating={isSwarming}
        />

        {/* 2. Manuscript Sheet Paper Workspace */}
        <main className="flex-1 overflow-y-auto px-8 py-12 flex justify-center bg-slate-50 dark:bg-slate-900">
          <div 
            className="w-[812px] min-h-[1054px] bg-white dark:bg-slate-950 shadow-2xl border border-slate-200/60 dark:border-slate-800 rounded-md p-16 relative"
            style={{ minHeight: '1054px' }}
          >
            {/* Mirror margin indicator lines (aesthetic details for KDP book gutter) */}
            <div className="absolute top-0 bottom-0 left-12 border-l border-slate-100 dark:border-slate-900 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-12 border-r border-slate-100 dark:border-slate-900 pointer-events-none" />

            {/* Book title header decoration */}
            <div className="text-center text-xs text-slate-350 dark:text-slate-600 border-b border-slate-100 dark:border-slate-900 pb-3 mb-10 select-none uppercase tracking-widest font-serif">
              {project?.title} &mdash; Manuscript Draft
            </div>

            {paragraphs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 select-none">
                <Wand2 className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                <p className="font-serif italic text-lg mb-2">The pages are blank...</p>
                <p className="text-sm max-w-sm mb-6">Regenerate the outline using the swarms button above to begin writing chapters.</p>
                <button
                  onClick={handleSwarmOutline}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                >
                  Generate Book Outline
                </button>
              </div>
            ) : (
              paragraphs.map((p, idx) => (
                <div key={p.id} id={`p-${p.id}`}>
                  <EditableParagraph
                    id={p.id}
                    index={idx}
                    initialContent={p.formattedHtml || p.content || ''}
                    isActive={activeParagraphIndex === idx}
                    isSpeaking={isPlaying && activeParagraphIndex === idx}
                    activeCharIndex={activeCharIndex}
                    onSave={handleParagraphSave}
                    onInput={handleParagraphInput}
                    onFocus={handleParagraphFocus}
                    onPlay={() => handleParagraphPlay(idx)}
                  />
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Real-time Swarm log terminal drawer */}
      <SwarmLogDrawer
        active={isSwarming}
        projectId={projectId}
        chapterIndex={paragraphs[activeParagraphIndex] ? (paragraphs[activeParagraphIndex].chapterIndex || 0) : 0}
      />

      {/* 3. Persistent Bottom Proofreader Control Bar */}
      <footer className="h-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between shadow-lg select-none z-30 transition-all duration-150">
        <div className="flex items-center space-x-6">
          <button
            onClick={handlePlayToggle}
            className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            title={isPlaying && !isPaused ? "Pause proofreading" : "Start proofreading"}
          >
            {isPlaying && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <button
            onClick={stop}
            disabled={!isPlaying}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Stop proofreading"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>

          <div className="text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider block">Currently Auditing</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 font-serif">
              {paragraphs[activeParagraphIndex] ? `Chapter ${Number(paragraphs[activeParagraphIndex].chapterIndex || 0) + 1}, Paragraph ${activeParagraphIndex + 1}` : 'No section playing'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          {/* Playback Rate Slider */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">Speed: {playbackRate.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Voice Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Voice:</span>
            <select
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                if (voice) setVoice(voice);
              }}
              className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500"
            >
              {voices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>
      </footer>
    </div>
  );
}
