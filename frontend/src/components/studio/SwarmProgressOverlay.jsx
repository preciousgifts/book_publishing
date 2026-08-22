import React, { useState, useEffect, useRef } from 'react';
import { Sparkle, PencilSimple, ShieldCheck, Terminal, Copy, Check, CaretDown, CaretUp, SpinnerGap } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/apiConfig';

export function WritingProgressOverlay({ active, projectId, chapterIndex }) {
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeStage, setActiveStage] = useState(1); // 1: Writer, 2: Editor, 3: Auditor
  const [statusMessage, setStatusMessage] = useState('Initializing Writing Process...');
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!active || !projectId) {
      setLogs([]);
      setActiveStage(1);
      setShowConsole(false);
      setStatusMessage('Initializing Writing Process...');
      return;
    }

    setLogs([{ 
      time: new Date().toLocaleTimeString(), 
      text: `[SYSTEM] Initializing 3-stage writing process for Chapter ${(chapterIndex || 0) + 1}...` 
    }]);

    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/swarm/logs/${projectId}?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data);
        const text = logData.message || '';
        
        setLogs(prev => [...prev, {
          time: logData.timestamp || new Date().toLocaleTimeString(),
          text
        }]);

        // Parse human-readable process stage & status
        if (text.includes('[WRITER]')) {
          setActiveStage(1);
          if (text.includes('Generating')) {
            setStatusMessage(`Drafting Stage: Drafting Chapter ${(chapterIndex || 0) + 1} prose...`);
          } else {
            setStatusMessage('Drafting Stage active: Crafting chapter structure & arguments...');
          }
        } else if (text.includes('[EDITOR]')) {
          setActiveStage(2);
          setStatusMessage('Editing Stage active: Polishing grammar, flow & prose dynamics...');
        } else if (text.includes('[CRITIQUE]') || text.includes('[AUDITOR]')) {
          setActiveStage(3);
          setStatusMessage('Reviewing Stage active: Running verification...');
        } else if (text.includes('Attempting LLM')) {
          setStatusMessage(`Engaging text generation process...`);
        }
      } catch (err) {
        console.error('Failed to parse SSE log:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource stream error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [active, projectId, chapterIndex]);

  useEffect(() => {
    if (logsEndRef.current && showConsole) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showConsole]);

  const handleCopyLogs = () => {
    const fullText = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!active) return null;

  const getProgressPercentage = () => {
    if (activeStage === 1) return 35;
    if (activeStage === 2) return 70;
    if (activeStage === 3) return 92;
    return 15;
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-fade-in transition-micro">
      {/* Visual Floating Progress Card */}
      <div className="bg-brand-surface text-brand-surfaceText border border-brand-primary/40 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Card Header */}
        <div className="px-6 py-4 bg-brand-primary/10 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-brand-primary/20 text-brand-accent animate-pulse">
              <Sparkle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-serif text-brand-surfaceText flex items-center space-x-2">
                <span>Writing Chapter {(chapterIndex || 0) + 1}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-accent text-brand-bg uppercase tracking-wider">
                  Live Activity
                </span>
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5 line-clamp-1">
                {statusMessage}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConsole(!showConsole)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-brand-textMuted hover:text-brand-surfaceText bg-brand-bg/60 hover:bg-brand-bg rounded-xl border border-brand-border transition-micro cursor-pointer"
            title={showConsole ? "Hide Progress Logs" : "Show Progress Logs"}
          >
            <Terminal className="w-3.5 h-3.5 text-brand-accent" />
            <span className="text-[11px]">{showConsole ? "Hide Logs" : "View Logs"}</span>
            {showConsole ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 3-Stage Process Visual Stepper */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Step 1: Writer */}
            <div className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center text-center ${
              activeStage === 1
                ? 'bg-brand-primary/15 border-brand-primary text-brand-surfaceText shadow-sm scale-102'
                : activeStage > 1
                ? 'bg-brand-info/10 border-brand-info/30 text-brand-info'
                : 'bg-brand-bg/40 border-brand-border text-brand-textMuted opacity-60'
            }`}>
              <div className="mb-1.5">
                {activeStage === 1 ? (
                  <SpinnerGap className="w-5 h-5 animate-spin text-brand-accent" />
                ) : (
                  <PencilSimple className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold font-serif">1. Drafting</span>
              <span className="text-[10px] mt-0.5 line-clamp-1">Drafting Prose</span>
            </div>

            {/* Step 2: Editor */}
            <div className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center text-center ${
              activeStage === 2
                ? 'bg-brand-primary/15 border-brand-primary text-brand-surfaceText shadow-sm scale-102'
                : activeStage > 2
                ? 'bg-brand-info/10 border-brand-info/30 text-brand-info'
                : 'bg-brand-bg/40 border-brand-border text-brand-textMuted opacity-60'
            }`}>
              <div className="mb-1.5">
                {activeStage === 2 ? (
                  <SpinnerGap className="w-5 h-5 animate-spin text-brand-accent" />
                ) : (
                  <PencilSimple className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold font-serif">2. Editing</span>
              <span className="text-[10px] mt-0.5 line-clamp-1">Polishing Tone</span>
            </div>

            {/* Step 3: Auditor */}
            <div className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center text-center ${
              activeStage === 3
                ? 'bg-brand-primary/15 border-brand-primary text-brand-surfaceText shadow-sm scale-102'
                : 'bg-brand-bg/40 border-brand-border text-brand-textMuted opacity-60'
            }`}>
              <div className="mb-1.5">
                {activeStage === 3 ? (
                  <SpinnerGap className="w-5 h-5 animate-spin text-brand-accent" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold font-serif">3. Reviewing</span>
              <span className="text-[10px] mt-0.5 line-clamp-1">Verification</span>
            </div>
          </div>

          {/* Animated Shimmering Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-brand-textMuted font-semibold">
              <span>Overall Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-border">
              <div
                className="h-full bg-gradient-to-r from-brand-primary via-brand-accent to-brand-info transition-all duration-500 rounded-full"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Technical Console Log Stream */}
        {showConsole && (
          <div className="border-t border-brand-border bg-brand-bg font-mono text-xs p-4 max-h-56 overflow-y-auto space-y-1.5">
            <div className="flex items-center justify-between pb-2 border-b border-brand-border text-[11px] text-brand-textMuted">
              <span className="font-bold text-brand-accent">Scriboral Progress Stream</span>
              <button
                onClick={handleCopyLogs}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-brand-surface hover:bg-brand-border text-brand-textMain cursor-pointer transition-micro"
              >
                {copied ? <Check className="w-3 h-3 text-brand-info" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-[11px] text-brand-textMain leading-snug">
                <span className="text-brand-textMuted font-mono flex-shrink-0">[{log.time}]</span>
                <span className="break-all">{log.text}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

