import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, Pause, Stop, CaretRight, MagicWand, ArrowClockwise, Warning, Check, GearSix, Sparkle } from '@phosphor-icons/react';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { EditableParagraph } from './EditableParagraph';
import { Toolbar } from './Toolbar';
import { parseHtmlToWords } from '../../utils/htmlTextMapper';
import { Sidebar } from '../studio/Sidebar';
import { WritingProgressOverlay } from '../studio/SwarmProgressOverlay';
import { KdpPagePreview } from './KdpPagePreview';
import { PipelineStatus } from '../studio/PipelineStatus';
import { PromptModal } from '../common/PromptModal';
import { NotificationToast } from '../common/NotificationToast';
import { MatterInputsModal } from './MatterInputsModal';
import { API_BASE_URL } from '../../config/apiConfig';

const PAGE_TITLES = {
  title_page: 'Title Page',
  copyright_page: 'Copyright Page',
  dedication: 'Dedication',
  epigraph: 'Epigraph',
  table_of_contents: 'Table of Contents',
  foreword: 'Foreword',
  preface: 'Preface',
  acknowledgments: 'Acknowledgments',
  introduction: 'Introduction',
  appendix: 'Appendix',
  glossary: 'Glossary',
  bibliography: 'Endnotes & Bibliography',
  index: 'Index',
  about_author: 'About the Author',
  also_by_author: 'Also By the Author',
  discussion_questions: 'Discussion Questions',
  call_to_action: 'Call-to-Action / Review Request'
};

export function BookEditor({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [matterPages, setMatterPages] = useState([]);
  const [activeMatterPage, setActiveMatterPage] = useState(null);
  const [editingMatterPage, setEditingMatterPage] = useState(null); // page object for MatterInputsModal

  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [isLoading, setIsLoading] = useState(true);
  const [isSwarming, setIsSwarming] = useState(false);
  const [swarmProgress, setSwarmProgress] = useState('');
  const [error, setError] = useState(null);
  const [showOutlinePromptModal, setShowOutlinePromptModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [trimSize, setTrimSize] = useState('6x9');
  const [showGuideLines, setShowGuideLines] = useState(true);

  const paragraphsRef = useRef([]);
  paragraphsRef.current = paragraphs;
  
  const activeParagraphIndexRef = useRef(0);
  activeParagraphIndexRef.current = activeParagraphIndex;

  const saveTimeouts = useRef({});
  const handleParagraphFinishedRef = useRef(null);
  const mainContainerRef = useRef(null);

  const scrollToElement = useCallback((el) => {
    if (!el || !mainContainerRef.current) return;
    const container = mainContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const targetTop = container.scrollTop + (elRect.top - containerRect.top) - 48;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, []);

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

  // 2. Fetch manuscript & matter data from Express Gateway API (port 5000)
  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}?t=${Date.now()}`, {
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
        setMatterPages(proj.matterPages || []);
        
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

    const wordTokens = parseHtmlToWords(currentParagraphs[index].formattedHtml || currentParagraphs[index].content || '');
    const textToSpeak = wordTokens.map(w => w.text).join('');

    speak(textToSpeak);
  }, [speak, stop]);

  const handleParagraphFinished = useCallback(() => {
    const nextIndex = activeParagraphIndexRef.current + 1;
    if (nextIndex < paragraphsRef.current.length) {
      playParagraph(nextIndex);
    } else {
      stop();
    }
  }, [playParagraph, stop]);

  useEffect(() => {
    handleParagraphFinishedRef.current = handleParagraphFinished;
  }, [handleParagraphFinished]);

  const saveProgressToDb = async (index) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_BASE_URL}/progress`, {
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
      if (isPaused) resume();
      else pause();
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

  // Save paragraph changes back to the database
  const saveParagraphToDb = async (paragraphId, htmlContent) => {
    if (saveTimeouts.current[paragraphId]) {
      clearTimeout(saveTimeouts.current[paragraphId]);
      delete saveTimeouts.current[paragraphId];
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/paragraphs/${paragraphId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawContent: htmlContent.replace(/<[^>]*>/g, ''),
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
    setSaveStatus('saving');
    saveParagraphToDb(paragraphId, updatedHtml);
  };

  const handleParagraphFocus = (index) => {
    setActiveParagraphIndex(index);
    saveProgressToDb(index);
  };

  const handleNavigateNext = (fromIndex) => {
    const currentIdx = typeof fromIndex === 'number' ? fromIndex : activeParagraphIndex;
    if (currentIdx < paragraphs.length - 1) {
      const nextIdx = currentIdx + 1;
      setActiveParagraphIndex(nextIdx);
      const nextPara = paragraphs[nextIdx];
      if (nextPara) {
        const el = document.getElementById(`p-${nextPara.id}`);
        if (el) {
          scrollToElement(el);
          const editableEl = el.querySelector('[contenteditable="true"]');
          if (editableEl) {
            editableEl.focus();
            try {
              const sel = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(editableEl);
              range.collapse(true);
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch (err) {
              // Fallback
            }
          }
        }
      }
    }
  };

  const handleNavigatePrev = (fromIndex) => {
    const currentIdx = typeof fromIndex === 'number' ? fromIndex : activeParagraphIndex;
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      setActiveParagraphIndex(prevIdx);
      const prevPara = paragraphs[prevIdx];
      if (prevPara) {
        const el = document.getElementById(`p-${prevPara.id}`);
        if (el) {
          scrollToElement(el);
          const editableEl = el.querySelector('[contenteditable="true"]');
          if (editableEl) {
            editableEl.focus();
            try {
              const sel = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(editableEl);
              range.collapse(false);
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch (err) {
              // Fallback
            }
          }
        }
      }
    }
  };

  // Figure insertion
  const handleInsertFigure = async (type, caption) => {
    const currentActive = paragraphs[activeParagraphIndex];
    const targetChapterIndex = currentActive ? (currentActive.chapterIndex || 0) : 0;
    const targetParaIndex = currentActive ? (currentActive.paragraphIndex + 1) : paragraphs.length;

    let figureHtml = '';
    if (type === 'diagram') {
      figureHtml = `<figure style="text-align: center; margin: 16px 0;"><svg width="320" height="120" viewBox="0 0 320 120" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; margin:0 auto;"><rect x="20" y="30" width="80" height="60" rx="6" fill="#4f46e5" opacity="0.8"/><text x="60" y="65" fill="#fff" text-anchor="middle" font-size="12">Input</text><line x1="100" y1="60" x2="140" y2="60" stroke="#6366f1" stroke-width="2"/><polygon points="140,55 150,60 140,65" fill="#6366f1"/><rect x="150" y="30" width="150" height="60" rx="6" fill="#10b981" opacity="0.8"/><text x="225" y="65" fill="#fff" text-anchor="middle" font-size="12">${caption || 'Process Flow'}</text></svg><figcaption style="font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic;">Figure: ${caption || 'Concept Diagram'}</figcaption></figure>`;
    } else {
      const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="#f1f5f9"/><circle cx="200" cy="100" r="40" fill="#6366f1" opacity="0.5"/><text x="200" y="105" fill="#1e293b" text-anchor="middle" font-family="sans-serif" font-size="14">${caption || 'KDP Manuscript Figure'}</text></svg>`;
      const base64Svg = `data:image/svg+xml;base64,${btoa(sampleSvg)}`;
      figureHtml = `<figure style="text-align: center; margin: 16px 0;"><img src="${base64Svg}" alt="${caption}" style="max-width: 80%; margin: 0 auto; border-radius: 6px; shadow: sm;" data-caption="${caption}" /><figcaption style="font-size: 11px; color: #64748b; margin-top: 6px; font-style: italic;">Figure: ${caption}</figcaption></figure>`;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/paragraphs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          chapterIndex: targetChapterIndex,
          paragraphIndex: targetParaIndex,
          rawContent: `[FIGURE: ${caption}]`,
          formattedHtml: figureHtml
        })
      });
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || 'Failed to insert figure');

      setToast({ title: 'Figure Inserted', message: `Inserted ${type === 'diagram' ? 'Diagram' : 'Image'} successfully!`, type: 'success' });
      fetchProjectData();
    } catch (err) {
      console.error('Insert figure error:', err);
      setToast({ title: 'Figure Insert Failed', message: err.message, type: 'error' });
    }
  };

  // Exporter Triggers
  const handleExportFile = async (format) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/export/${projectId}/${format}?t=${Date.now()}`, {
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

  // Front & Back Matter Handlers
  const handleToggleMatterIncluded = async (pageId, included) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/matter/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ included })
      });
      const data = await res.json();
      if (data.success) {
        setMatterPages(prev => prev.map(m => m.id === pageId ? data.data : m));
      }
    } catch (e) {
      console.error('Failed to toggle matter page', e);
    }
  };

  const handleSaveMatterInputs = async (pageId, authorInputs) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/matter/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ authorInputs })
      });
      const data = await res.json();
      if (data.success) {
        setMatterPages(prev => prev.map(m => m.id === pageId ? data.data : m));
        setToast({ title: 'Inputs Saved', message: 'Author inputs updated successfully!', type: 'success' });
      }
    } catch (e) {
      console.error('Failed to save matter inputs', e);
    }
  };

  const handleGenerateMatterPage = async (page) => {
    setIsSwarming(true);
    setSwarmProgress(`Generating ${PAGE_TITLES[page.pageType] || page.pageType} content...`);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/matter/${page.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setMatterPages(prev => prev.map(m => m.id === page.id ? data.data : m));
        if (activeMatterPage?.id === page.id) {
          setActiveMatterPage(data.data);
        }
        setToast({ title: 'Page Generated', message: `${PAGE_TITLES[page.pageType] || page.pageType} draft generated!`, type: 'success' });
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      setToast({ title: 'Generation Failed', message: e.message, type: 'error' });
    } finally {
      setIsSwarming(false);
      setSwarmProgress('');
    }
  };

  const handleApproveMatterPage = async (pageId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/matter/${pageId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMatterPages(prev => prev.map(m => m.id === pageId ? data.data : m));
        if (activeMatterPage?.id === pageId) {
          setActiveMatterPage(data.data);
        }
        setToast({ title: 'Page Approved', message: 'Matter page marked as approved!', type: 'success' });
      }
    } catch (e) {
      console.error('Failed to approve matter page', e);
    }
  };

  const handleMatterContentSave = async (pageId, contentHtml) => {
    setSaveStatus('saving');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/matter/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentHtml })
      });
      const data = await res.json();
      if (data.success) {
        setMatterPages(prev => prev.map(m => m.id === pageId ? data.data : m));
        setSaveStatus('saved');
      }
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleSwarmOutline = () => {
    setShowOutlinePromptModal(true);
  };

  const executeRegenOutline = async (userPrompt) => {
    setIsSwarming(true);
    setSwarmProgress('Regenerating outline with Outline...');
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/swarm/generate-outline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          prompt: userPrompt,
          genre: project?.genre || 'non-fiction'
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setSwarmProgress('Approving generated outline and setting layout...');
      const approveRes = await fetch(`${API_BASE_URL}/swarm/approve-outline`, {
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

      setToast({ title: 'Outline Updated', message: 'Outline successfully generated and approved!', type: 'success' });
      fetchProjectData();
    } catch (err) {
      setToast({ title: 'Swarm Outline Error', message: err.message, type: 'error' });
    } finally {
      setIsSwarming(false);
      setSwarmProgress('');
    }
  };

  const handleSwarmWriteChapter = async (chapterIndex, options = {}) => {
    setIsSwarming(true);
    setSwarmProgress(`Writing Chapter ${chapterIndex + 1} (Drafting -> Editing -> Reviewing)...`);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/swarm/write-chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          chapterIndex,
          customInstruction: options?.customInstruction || null,
          humanizeOverride: options?.humanizeOverride !== undefined ? options.humanizeOverride : null,
          minWordCount: options?.minWordCount ? Number(options.minWordCount) : null
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setToast({ title: 'Chapter Drafted', message: `Chapter ${chapterIndex + 1} generated successfully!`, type: 'success' });
      fetchProjectData();
    } catch (err) {
      setToast({ title: 'Generation Failed', message: err.message, type: 'error' });
    } finally {
      setIsSwarming(false);
      setSwarmProgress('');
    }
  };

  // Calculate unreviewed included matter pages count for warning banner
  const unreviewedMatterCount = useMemo(() => {
    return matterPages.filter(m => m.included && m.status !== 'APPROVED').length;
  }, [matterPages]);

  // Derived TOC structure for Table of Contents page preview
  const tocList = project?.outline?.tocData?.toc || [];
  const includedFrontMatterForToc = matterPages.filter(m => m.section === 'FRONT' && m.included && !['title_page', 'copyright_page', 'table_of_contents'].includes(m.pageType));
  const includedBackMatterForToc = matterPages.filter(m => m.section === 'BACK' && m.included);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg text-brand-textMuted">
        <ArrowClockwise className="animate-spin h-8 w-8 text-brand-accent mb-4" />
        <p className="text-sm font-medium">Loading document and progress...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg text-brand-textMain">
      {/* 1. Header Toolbar */}
      <Toolbar
        bookTitle={project?.title || 'Manuscript'}
        saveStatus={saveStatus}
        onBack={onBack}
        onExportDocx={() => handleExportFile('docx')}
        onExportPdf={() => handleExportFile('pdf')}
        onExportEpub={() => handleExportFile('epub')}
        onSwarmOutline={handleSwarmOutline}
        onInsertFigure={handleInsertFigure}
        onTogglePreview={() => setShowPreviewPanel(!showPreviewPanel)}
        isPreviewOpen={showPreviewPanel}
      />

      {/* Pre-export warning banner for unreviewed matter pages */}
      {unreviewedMatterCount > 0 && (
        <div className="bg-brand-warning/10 border-b border-brand-warning/30 px-6 py-2 flex items-center justify-between text-xs text-brand-warning font-medium">
          <div className="flex items-center space-x-2">
            <Warning className="w-4 h-4 text-brand-warning" />
            <span>
              <strong>Review Warning:</strong> {unreviewedMatterCount} included front/back matter page(s) haven't been approved yet. Exports will include working drafts or placeholders.
            </span>
          </div>
          <button
            onClick={() => {
              const unreviewed = matterPages.find(m => m.included && m.status !== 'APPROVED');
              if (unreviewed) setActiveMatterPage(unreviewed);
            }}
            className="text-brand-warning hover:underline font-bold"
          >
            Review Now &rarr;
          </button>
        </div>
      )}

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
          activeChapterIndex={activeMatterPage ? null : (paragraphs[activeParagraphIndex] ? (paragraphs[activeParagraphIndex].chapterIndex || 0) : 0)}
          activeMatterPageId={activeMatterPage?.id}
          matterPages={matterPages}
          onSelectChapter={(idx) => {
            setActiveMatterPage(null);
            const chParas = paragraphs.filter(p => (p.chapterIndex || 0) === idx);
            if (chParas.length > 0) {
              const targetIdx = paragraphs.indexOf(chParas[0]);
              if (targetIdx !== -1) {
                setActiveParagraphIndex(targetIdx);
                const el = document.getElementById(`p-${chParas[0].id}`);
                if (el) scrollToElement(el);
              }
            }
          }}
          onSelectMatterPage={(page) => setActiveMatterPage(page)}
          onToggleMatterIncluded={handleToggleMatterIncluded}
          onOpenInputsModal={(page) => setEditingMatterPage(page)}
          onGenerateMatterPage={handleGenerateMatterPage}
          onApproveMatterPage={handleApproveMatterPage}
          onWriteChapter={handleSwarmWriteChapter}
          isGenerating={isSwarming}
        />

        {/* 2. Manuscript Sheet Paper Workspace */}
        <main ref={mainContainerRef} className="flex-1 overflow-y-auto px-8 py-12 pb-64 flex justify-center bg-brand-bg transition-micro">
          <div 
            className="w-[812px] max-w-full min-h-[1054px] bg-brand-surface shadow-2xl border border-brand-border rounded-md p-8 sm:p-12 md:p-16 relative"
            style={{ minHeight: '1054px' }}
          >
            {/* Mirror margin indicator lines */}
            <div className="absolute top-0 bottom-0 left-12 border-l border-brand-border pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-12 border-r border-brand-border pointer-events-none" />

            {/* Matter Page Canvas View */}
            {activeMatterPage ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-brand-border pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-brand-primary tracking-wider">
                      {activeMatterPage.section} MATTER &mdash; {activeMatterPage.pageType}
                    </span>
                    <h1 className="text-2xl font-serif font-bold text-brand-surfaceText mt-1">
                      {PAGE_TITLES[activeMatterPage.pageType] || activeMatterPage.pageType}
                    </h1>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingMatterPage(activeMatterPage)}
                      className="px-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-xl font-semibold flex items-center gap-1.5 hover:bg-slate-200"
                    >
                      <GearSix className="w-3.5 h-3.5" />
                      <span>Author Inputs</span>
                    </button>
                    <button
                      disabled={isSwarming}
                      onClick={() => handleGenerateMatterPage(activeMatterPage)}
                      className="px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-primaryHover transition-micro text-white rounded-xl font-semibold flex items-center gap-1.5 shadow"
                    >
                      <MagicWand className="w-3.5 h-3.5" />
                      <span>{activeMatterPage.status === 'NOT_GENERATED' ? 'Generate' : 'Re-Generate'}</span>
                    </button>
                    {activeMatterPage.status === 'GENERATED_PENDING_REVIEW' && (
                      <button
                        onClick={() => handleApproveMatterPage(activeMatterPage.id)}
                        className="px-3 py-1.5 text-xs bg-brand-info hover:bg-brand-info/80 transition-micro text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Draft</span>
                      </button>
                    )}
                  </div>
                </div>

                {activeMatterPage.generatedWithHumanizer && (
                  <div className="text-[11px] text-brand-info bg-brand-info/10 p-2 rounded-lg border border-brand-info/30 flex items-center space-x-1.5">
                    <Sparkle className="w-3.5 h-3.5" />
                    <span>Generated with Natural Tone active (varied rhythm & natural phrasing)</span>
                  </div>
                )}

                {/* Table of Contents Dynamic View */}
                {activeMatterPage.pageType === 'table_of_contents' ? (
                  <div className="p-6 bg-brand-bg/50 rounded-xl border border-brand-border space-y-4 font-serif">
                    <h3 className="text-lg font-bold text-center border-b pb-2">Table of Contents (Live Preview)</h3>

                    {includedFrontMatterForToc.length > 0 && (
                      <div className="space-y-1.5 text-sm">
                        {includedFrontMatterForToc.map(m => (
                          <div key={m.id} className="flex justify-between border-b border-dotted border-brand-border pb-1">
                            <span>{PAGE_TITLES[m.pageType] || m.pageType}</span>
                            <span className="text-brand-textMuted font-sans text-xs">Front Matter</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 text-sm pt-2">
                      {tocList.map((ch, idx) => (
                        <div key={ch.chapterNumber || idx} className="flex justify-between border-b border-dotted border-brand-border pb-1">
                          <span className="font-semibold">Chapter {ch.chapterNumber || idx + 1}: {ch.title}</span>
                          <span className="text-brand-textMuted font-sans text-xs">Chapter</span>
                        </div>
                      ))}
                    </div>

                    {includedBackMatterForToc.length > 0 && (
                      <div className="space-y-1.5 text-sm pt-2">
                        {includedBackMatterForToc.map(m => (
                          <div key={m.id} className="flex justify-between border-b border-dotted border-brand-border pb-1">
                            <span>{PAGE_TITLES[m.pageType] || m.pageType}</span>
                            <span className="text-brand-textMuted font-sans text-xs">Back Matter</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Editable content for all matter pages */
                  <div className="min-h-[400px]">
                    {activeMatterPage.status === 'NOT_GENERATED' && !activeMatterPage.content ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-brand-textMuted select-none">
                        <MagicWand className="w-12 h-12 mb-4 text-brand-borderStrong" />
                        <p className="font-serif italic text-lg mb-2">Content not yet generated...</p>
                        <p className="text-sm max-w-sm mb-6">Click Generate above to draft this page using your provided author inputs.</p>
                        <button
                          onClick={() => handleGenerateMatterPage(activeMatterPage)}
                          className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primaryHover transition-micro rounded-lg shadow"
                        >
                          Generate {PAGE_TITLES[activeMatterPage.pageType] || activeMatterPage.pageType}
                        </button>
                      </div>
                    ) : (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleMatterContentSave(activeMatterPage.id, e.target.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: activeMatterPage.content }}
                        className="w-full text-brand-surfaceText text-[17px] leading-relaxed font-serif outline-none p-4 rounded-xl hover:bg-brand-bg focus:bg-brand-bg/80 transition-micro"
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Regular Chapter Paragraphs View */
              <>
                <div className="text-center text-xs text-brand-textMuted border-b border-brand-border pb-3 mb-10 select-none uppercase tracking-widest font-serif">
                  {project?.title} &mdash; Manuscript Draft
                </div>

                {paragraphs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-brand-textMuted select-none">
                    <MagicWand className="w-12 h-12 mb-4 text-brand-borderStrong" />
                    <p className="font-serif italic text-lg mb-2">The pages are blank...</p>
                    <p className="text-sm max-w-sm mb-6">Regenerate the outline using the swarms button above to begin writing chapters.</p>
                    <button
                      onClick={handleSwarmOutline}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primaryHover transition-micro rounded-lg shadow"
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
                        onNavigateNext={handleNavigateNext}
                        onNavigatePrev={handleNavigatePrev}
                      />
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </main>

        {/* 3. KDP Page Print Preview (Right Side) */}
        {showPreviewPanel && (
          <aside className="w-[420px] border-l border-brand-border bg-brand-surface flex flex-col h-full overflow-y-auto animate-slide-in-right p-4 z-20">
            <KdpPagePreview
              paragraphs={paragraphs}
              bookTitle={project?.title || 'Manuscript'}
              chapterTitle={paragraphs[activeParagraphIndex] ? `Chapter ${Number(paragraphs[activeParagraphIndex].chapterIndex || 0) + 1}` : ''}
              trimSize={trimSize}
              onTrimSizeChange={setTrimSize}
              showGuideLines={showGuideLines}
              onToggleGuideLines={() => setShowGuideLines(!showGuideLines)}
            />
          </aside>
        )}
      </div>

      {/* Writing Progress Overlay */}
      <WritingProgressOverlay
        active={isSwarming}
        projectId={projectId}
        chapterIndex={paragraphs[activeParagraphIndex] ? (paragraphs[activeParagraphIndex].chapterIndex || 0) : 0}
      />

      {/* 3. Persistent Bottom Proofreader Control Bar */}
      <footer className="h-20 bg-brand-surface border-t border-brand-border px-8 flex items-center justify-between shadow-lg select-none z-30 transition-micro duration-150">
        <div className="flex items-center space-x-6">
          <button
            onClick={handlePlayToggle}
            className="p-3 rounded-full bg-brand-primary hover:bg-brand-primaryHover transition-micro text-white shadow-md hover:scale-105 active:scale-95 transition-micro"
            title={isPlaying && !isPaused ? "Pause proofreading" : "Start proofreading"}
          >
            {isPlaying && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          
          <button
            onClick={stop}
            disabled={!isPlaying}
            className="p-2 rounded-lg bg-brand-bg text-brand-textMuted hover:bg-brand-border disabled:opacity-50 disabled:cursor-not-allowed transition-micro"
            title="Stop proofreading"
          >
            <Stop className="w-5 h-5 fill-current" />
          </button>

          <div className="text-sm">
            <span className="text-brand-textMuted text-xs uppercase tracking-wider block">Currently Auditing</span>
            <span className="font-medium text-brand-textMain font-serif">
              {activeMatterPage ? (PAGE_TITLES[activeMatterPage.pageType] || activeMatterPage.pageType) : (paragraphs[activeParagraphIndex] ? `Chapter ${Number(paragraphs[activeParagraphIndex].chapterIndex || 0) + 1}, Paragraph ${activeParagraphIndex + 1}` : 'No section playing')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-brand-textMuted">Speed: {playbackRate.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-brand-textMuted">Voice:</span>
            <select
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                if (voice) setVoice(voice);
              }}
              className="px-3 py-1.5 text-xs bg-brand-bg border border-brand-border rounded-lg text-brand-textMain outline-none focus:border-brand-primary transition-micro"
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

      {/* Prompt Modal for Outline Regeneration */}
      <PromptModal
        isOpen={showOutlinePromptModal}
        onClose={() => setShowOutlinePromptModal(false)}
        onSubmit={executeRegenOutline}
        title="Regenerate Outline"
        placeholder="Provide new directions, topics, or guidelines for the Outline..."
      />

      {/* Matter Inputs Modal */}
      <MatterInputsModal
        isOpen={Boolean(editingMatterPage)}
        onClose={() => setEditingMatterPage(null)}
        page={editingMatterPage}
        onSave={handleSaveMatterInputs}
      />

      {/* Notification Toast */}
      <NotificationToast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
