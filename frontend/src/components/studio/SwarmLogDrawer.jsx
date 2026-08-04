import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export function SwarmLogDrawer({ active, projectId, chapterIndex }) {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!active || !projectId) {
      setLogs([]);
      return;
    }

    setLogs([{ 
      time: new Date().toLocaleTimeString(), 
      text: `[SYSTEM] Connecting to swarm pipeline worker log stream...` 
    }]);

    const token = localStorage.getItem('token');
    const url = `http://localhost:5000/api/swarm/logs/${projectId}?token=${token}`;
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
        text: `[SYSTEM] Log stream connection disconnected or pending new events...`
      }]);
    };

    return () => {
      eventSource.close();
    };
  }, [active, projectId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!active) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 h-64 bg-black border-t border-slate-800 text-emerald-400 font-mono text-xs flex flex-col z-40 shadow-2xl select-none">
      {/* Log Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between text-slate-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="font-semibold">PublishFlow Swarm Logs Terminal</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold animate-pulse">Running Swarm</span>
      </div>

      {/* Terminal View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start space-x-2">
            <span className="text-slate-600 font-bold">[{log.time}]</span>
            <span className="break-all">{log.text}</span>
          </div>
        ))}
        
        {/* Blinking cursor */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-600 font-bold">[{new Date().toLocaleTimeString()}]</span>
          <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
        </div>
        
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
