import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Copy, Check, CaretDown, CaretUp, Pause, Play, ArrowClockwise, XCircle, Funnel } from '@phosphor-icons/react';
import { API_BASE_URL } from '../../config/apiConfig';

export function ActivityLogDrawer({ active, projectId, chapterIndex, onCancelSwarm, onRetrySwarm }) {
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('ALL');
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!active || !projectId) {
      setLogs([]);
      return;
    }

    setLogs([{ 
      time: new Date().toLocaleTimeString(), 
      text: `[SYSTEM] Connecting to Scriboral Writing Activity progress...` 
    }]);

    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/swarm/logs/${projectId}?token=${token}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data);
        setLogs(prev => [...prev, {
          time: logData.timestamp || new Date().toLocaleTimeString(),
          text: logData.message
        }]);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource connection error:', err);
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        text: `[SYSTEM] Process stream standing by for next event...`
      }]);
    };

    return () => {
      eventSource.close();
    };
  }, [active, projectId]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized, autoScroll]);

  const handleCopyLogs = () => {
    const fullText = filteredLogs.map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter logs by selected agent role
  const filteredLogs = useMemo(() => {
    if (selectedAgentFilter === 'ALL') return logs;
    return logs.filter(l => {
      const upper = (l.text || '').toUpperCase();
      if (selectedAgentFilter === 'SYSTEM') return upper.includes('[SYSTEM]') || upper.includes('PROCESS');
      if (selectedAgentFilter === 'OUTLINING') return upper.includes('[ARCHITECT]') || upper.includes('OUTLINE');
      if (selectedAgentFilter === 'RESEARCH') return upper.includes('[RESEARCH]') || upper.includes('FACT');
      if (selectedAgentFilter === 'DRAFTING') return upper.includes('[WRITER]') || upper.includes('DRAFT');
      if (selectedAgentFilter === 'EDITING') return upper.includes('[EDITOR]') || upper.includes('REWRITE');
      if (selectedAgentFilter === 'REVIEWING') return upper.includes('[AUDITOR]') || upper.includes('AFC');
      return true;
    });
  }, [logs, selectedAgentFilter]);

  const getLogStyle = (text) => {
    if (!text) return 'text-brand-textMain';
    if (text.includes('401') || text.includes('Error') || text.includes('failed') || text.includes('Unauthorized')) {
      return 'text-brand-danger font-semibold bg-brand-danger/10 px-1 py-0.5 rounded';
    }
    if (text.includes('Attempting LLM') || text.includes('Fallback')) {
      return 'text-brand-warning font-medium';
    }
    if (text.includes('200 OK') || text.includes('successfully') || text.includes('completed')) {
      return 'text-brand-info font-medium';
    }
    if (text.startsWith('[SYSTEM]') || text.startsWith('[RESEARCH]') || text.includes('AFC is enabled')) {
      return 'text-brand-primary font-medium';
    }
    return 'text-brand-textMain';
  };

  if (!active) return null;

  return (
    <div className={`fixed bottom-20 left-0 right-0 z-40 bg-brand-surface/95 backdrop-blur-xl border-t border-brand-border shadow-2xl transition-all duration-300 font-mono text-xs select-none animate-fade-in ${
      isMinimized ? 'h-12' : 'h-80'
    }`}>
      {/* Top Terminal Header Bar */}
      <div className="bg-brand-bg border-b border-brand-border px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-brand-surface px-2.5 py-1 rounded-md border border-brand-border">
            <Terminal className="w-3.5 h-3.5 text-brand-accent" />
            <span className="text-brand-accent font-bold text-[11px] tracking-wide">Scriboral Activity Logs</span>
          </div>

          <div className="inline-flex items-center space-x-1.5 bg-brand-info/10 border border-brand-info/30 px-2.5 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-brand-info animate-ping" />
            <span className="text-[10px] text-brand-info font-bold uppercase tracking-wider">LIVE ACTIVITY STREAM</span>
          </div>
        </div>

        {/* Stage Role Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1">
          <Funnel className="w-3 h-3 text-brand-textMuted mr-1" />
          {['ALL', 'SYSTEM', 'OUTLINING', 'RESEARCH', 'DRAFTING', 'EDITING', 'REVIEWING'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedAgentFilter(role)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                selectedAgentFilter === role
                  ? 'bg-brand-primary text-brand-surface'
                  : 'bg-brand-surface/60 text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-[10px] font-semibold rounded flex items-center space-x-1 transition-micro ${
              autoScroll ? 'bg-brand-surface text-brand-primary' : 'bg-brand-warning/20 text-brand-warning border border-brand-warning/40'
            }`}
            title={autoScroll ? "Auto-scroll Enabled" : "Auto-scroll Paused"}
          >
            {autoScroll ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{autoScroll ? 'Auto-Scroll' : 'Paused'}</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            className="px-2.5 py-1 text-[11px] font-semibold text-brand-textMuted hover:text-brand-textMain bg-brand-surface/60 hover:bg-brand-surface rounded-lg transition-micro flex items-center space-x-1 cursor-pointer"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-brand-info" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Retry Activity */}
          {onRetrySwarm && (
            <button
              onClick={onRetrySwarm}
              className="px-2.5 py-1 text-[11px] font-semibold text-brand-warning hover:text-brand-warning/80 bg-brand-warning/10 border border-brand-warning/30 hover:bg-brand-warning/20 rounded-lg transition-micro flex items-center space-x-1 cursor-pointer"
              title="Retry Activity Execution"
            >
              <ArrowClockwise className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          {/* Cancel Activity */}
          {onCancelSwarm && (
            <button
              onClick={onCancelSwarm}
              className="px-2.5 py-1 text-[11px] font-semibold text-brand-danger hover:text-brand-danger/80 bg-brand-danger/10 border border-brand-danger/30 hover:bg-brand-danger/20 rounded-lg transition-micro flex items-center space-x-1 cursor-pointer"
              title="Cancel Activity Execution"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-brand-textMuted hover:text-brand-textMain bg-brand-surface/60 hover:bg-brand-surface rounded-lg transition-micro cursor-pointer"
            title={isMinimized ? "Expand Terminal" : "Minimize Terminal"}
          >
            {isMinimized ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Log Stream View */}
      {!isMinimized && (
        <div className="h-[calc(100%-48px)] overflow-y-auto p-5 space-y-2 font-mono bg-brand-bg">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start space-x-3 leading-relaxed">
              <span className="text-brand-textMuted font-mono text-[11px] select-none flex-shrink-0 pt-0.5">
                [{log.time}]
              </span>
              <span className={`break-all ${getLogStyle(log.text)}`}>
                {log.text}
              </span>
            </div>
          ))}
          
          {/* Active Terminal Prompt Line */}
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-brand-textMuted font-mono text-[11px] select-none">
              [{new Date().toLocaleTimeString()}]
            </span>
            <span className="text-brand-info font-bold">$</span>
            <span className="w-2 h-4 bg-brand-accent animate-pulse inline-block rounded-sm" />
          </div>
          
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
