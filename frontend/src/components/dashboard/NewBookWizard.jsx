import React, { useState } from 'react';
import { X, RefreshCw, ChevronRight, Check, Plus, Minus, Send, UploadCloud, BookOpen, Sparkles } from 'lucide-react';
import client from '../../api/client';

export function NewBookWizard({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wizard mode selector
  const [wizardMode, setWizardMode] = useState('scratch'); // 'scratch' | 'upload'
  const [file, setFile] = useState(null);
  const [healthReport, setHealthReport] = useState('');

  // Step 1: Book config
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('non-fiction');
  const [trimSize, setTrimSize] = useState('6x9');
  const [locale, setLocale] = useState('en-US');
  const [prompt, setPrompt] = useState('');

  // Swarm response
  const [outline, setOutline] = useState(null); // contains { id, projectId, tocData: [...] }
  const [answers, setAnswers] = useState({}); // maps question -> user answer
  
  // Outline customization states
  const [adjusting, setAdjusting] = useState(false);
  const [customFeedback, setCustomFeedback] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStep(2);

    try {
      if (wizardMode === 'upload') {
        if (!file) {
          throw new Error('Please select a manuscript file to upload.');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('genre', genre);
        formData.append('languageLocale', locale);
        formData.append('trimSize', trimSize);

        const res = await client.post('/projects/upload-manuscript', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (!res.data.success) {
          throw new Error(res.data.error || 'Failed to upload and parse manuscript');
        }

        const result = res.data.data;
        setOutline({
          id: result.outlineId,
          projectId: result.projectId,
          tocData: result.tocData
        });
        setHealthReport(result.healthReport);
        setStep(3);
      } else {
        // Standard AI outline generation
        const projRes = await client.post('/projects', {
          title,
          genre,
          trimSize,
          languageLocale: locale
        });

        if (!projRes.data.success) {
          throw new Error(projRes.data.error || 'Failed to initialize project');
        }

        const project = projRes.data.data;

        const outlineRes = await client.post('/swarm/generate-outline', {
          projectId: project.id,
          prompt,
          genre
        });

        if (!outlineRes.data.success) {
          throw new Error(outlineRes.data.error || 'Failed to generate outline');
        }

        setOutline(outlineRes.data.data);
        
        // Initialize discovery answers structure
        const tocObj = outlineRes.data.data.tocData || {};
        const questions = tocObj.discoveryQuestions || [];
        const answersInit = {};
        questions.forEach((q, idx) => {
          answersInit[`q${idx}`] = { question: q, answer: '' };
        });
        setAnswers(answersInit);
        setStep(3);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during book setup');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustOutline = async (action) => {
    if (!outline) return;
    setAdjusting(true);
    setError(null);

    const currentToC = outline.tocData?.toc || [];
    let targetChapterCount = currentToC.length;

    if (action === 'expand') {
      targetChapterCount += 1;
    } else if (action === 'condense') {
      targetChapterCount = Math.max(1, targetChapterCount - 1);
    }

    try {
      const res = await client.post('/swarm/adjust-outline', {
        projectId: outline.projectId,
        action,
        targetChapterCount,
        feedback: action === 'custom' ? customFeedback : null
      });

      if (res.data.success) {
        const adjustedToC = res.data.data.tocData;
        setOutline(prev => ({
          ...prev,
          tocData: {
            ...prev.tocData,
            toc: adjustedToC
          }
        }));
        setCustomFeedback('');
      } else {
        throw new Error(res.data.error || 'Failed to scale outline');
      }
    } catch (err) {
      setError(err.message || 'Failed to adjust outline structure.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Format answers map to submit
    const discoveryAnswers = {};
    Object.values(answers).forEach(val => {
      discoveryAnswers[val.question] = val.answer;
    });

    try {
      const response = await client.post('/swarm/approve-outline', {
        outlineId: outline.id,
        discoveryAnswers
      });

      if (response.data.success) {
        onComplete(outline.projectId);
      } else {
        throw new Error(response.data.error || 'Failed to approve outline');
      }
    } catch (err) {
      setError(err.message || 'Failed to approve outline');
    } finally {
      setLoading(false);
    }
  };

  const tocList = outline?.tocData?.toc || [];
  const questionsList = Object.entries(answers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>PublishFlow AI Project Wizard</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="px-8 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/40 flex items-center space-x-6 text-xs font-semibold text-slate-400 select-none">
          <span className={step === 1 ? 'text-indigo-600 dark:text-indigo-400' : outline ? 'text-emerald-500' : ''}>1. Project Source</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={step === 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>2. Analysis & Setup</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className={step === 3 ? 'text-indigo-600 dark:text-indigo-400' : ''}>3. Review & Scale</span>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1 Form */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              
              {/* Toggle Choice Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setWizardMode('scratch')}
                  className={`border p-4 rounded-2xl cursor-pointer flex flex-col justify-between transition-all select-none ${
                    wizardMode === 'scratch'
                      ? 'border-indigo-500 bg-indigo-50/10 shadow-md ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className={`w-5 h-5 ${wizardMode === 'scratch' ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Start from Scratch</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Co-write a book with a customized multi-agent LLM swarm outline builder.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setWizardMode('upload')}
                  className={`border p-4 rounded-2xl cursor-pointer flex flex-col justify-between transition-all select-none ${
                    wizardMode === 'upload'
                      ? 'border-indigo-500 bg-indigo-50/10 shadow-md ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UploadCloud className={`w-5 h-5 ${wizardMode === 'upload' ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Import Manuscript</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Upload an existing `.docx`, `.txt`, or `.md` manuscript for gap analysis and layout refinement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Book Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="wizard-title">
                    Book Title
                  </label>
                  <input
                    id="wizard-title"
                    type="text"
                    placeholder="e.g. Beyond the Swarm"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500 transition-all font-serif"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">Genre</label>
                  <select
                    value={genre}
                    onChange={e => setGenre(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500"
                  >
                    <option value="non-fiction">Non-Fiction</option>
                    <option value="fiction">Fiction</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">Trim Size</label>
                  <select
                    value={trimSize}
                    onChange={e => setTrimSize(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500"
                  >
                    <option value="6x9">6" x 9" (KDP Standard)</option>
                    <option value="5.5x8.5">5.5" x 8.5"</option>
                    <option value="5x8">5" x 8"</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">Language Locale</label>
                  <select
                    value={locale}
                    onChange={e => setLocale(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500"
                  >
                    <option value="en-US">American English (en-US)</option>
                    <option value="en-GB">British English (en-GB)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs based on Mode */}
              {wizardMode === 'scratch' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block" htmlFor="wizard-prompt">
                    Concept / Prompt Description
                  </label>
                  <textarea
                    id="wizard-prompt"
                    rows="4"
                    placeholder="Detail the core concept, target audience, tone guidelines, and key themes you want the swarm to capture."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500 transition-all resize-none font-serif"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 block">
                    Upload Manuscript File (.docx, .txt, .md)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl p-6 text-center flex flex-col items-center justify-center transition-all bg-slate-50/50 dark:bg-slate-900/10 cursor-pointer relative">
                    <input
                      type="file"
                      accept=".docx,.txt,.md"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      required
                    />
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    {file ? (
                      <div>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{file.name}</span>
                        <p className="text-xs text-slate-450 mt-1">{(file.size / 1024).toFixed(1)} KB - Click to replace file</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Drag & drop your file here or click to browse</span>
                        <p className="text-xs text-slate-400 mt-1">Accepts Microsoft Word (.docx) and plain text (.txt, .md) up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs p-3.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>{wizardMode === 'upload' ? 'Upload & Run Gap Analysis' : 'Generate Outline Draft'}</span>
              </button>
            </form>
          )}

          {/* Step 2 Generating Loading */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none">
              <RefreshCw className="animate-spin h-10 w-10 text-indigo-500 mb-6" />
              <h3 className="text-lg font-semibold mb-2">
                {wizardMode === 'upload' ? 'Parsing Manuscript & Auditing Gaps...' : 'Architecting Outline Swarm...'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {wizardMode === 'upload'
                  ? 'Our senior auditor agent is checking your file layout, chapter distribution, pace balance, and readability metrics.'
                  : 'Google Gemini multi-agent swarm is parsing your concept prompt to construct the table of contents and discover style questions.'}
              </p>
            </div>
          )}

          {/* Step 3 Outline Approval & Discovery Refinement */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              
              {/* Manuscript Health Audit Report */}
              {healthReport && (
                <div className="space-y-2">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 font-serif">Manuscript Health Audit</h3>
                  <div className="border border-indigo-150/50 bg-indigo-50/10 dark:border-indigo-950/20 rounded-2xl p-4 max-h-56 overflow-y-auto text-xs prose prose-slate dark:prose-invert">
                    {healthReport.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) return <h4 key={idx} className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-2 mb-1">{line.replace('### ', '')}</h4>;
                      if (line.startsWith('## ')) return <h3 key={idx} className="font-bold text-md text-indigo-700 dark:text-indigo-300 mt-3 mb-2 font-serif">{line.replace('## ', '')}</h3>;
                      if (line.startsWith('- ')) return <li key={idx} className="ml-4 list-disc text-slate-650 dark:text-slate-400 my-0.5">{line.replace('- ', '')}</li>;
                      return <p key={idx} className="text-slate-700 dark:text-slate-350 my-1 leading-relaxed">{line}</p>;
                    })}
                  </div>
                </div>
              )}

              {/* ToC Review and Scaling Controls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 font-serif">Table of Contents Review</h3>
                  
                  {/* Scaling Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={adjusting || tocList.length <= 1}
                      onClick={() => handleAdjustOutline('condense')}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors text-slate-500 disabled:opacity-50 select-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Reduce</span>
                    </button>
                    <button
                      type="button"
                      disabled={adjusting}
                      onClick={() => handleAdjustOutline('expand')}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors text-slate-500 disabled:opacity-50 select-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Increase</span>
                    </button>
                  </div>
                </div>

                <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-900 overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 max-h-56 overflow-y-auto">
                  {adjusting ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <RefreshCw className="animate-spin h-6 w-6 text-indigo-500 mb-2" />
                      <span className="text-xs text-slate-400 font-semibold">Rescaling Outline Swarm...</span>
                    </div>
                  ) : (
                    tocList.map((ch) => (
                      <div key={ch.chapterNumber} className="p-4 flex items-start space-x-3">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-mono mt-0.5">CH {ch.chapterNumber}</span>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{ch.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-normal">{ch.summary}</p>
                          {ch.subtopics && ch.subtopics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ch.subtopics.map((sub, sIdx) => (
                                <span key={sIdx} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full select-none">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Custom Outline Prompt adjustment input */}
                {!adjusting && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Add 2 chapters focusing on case studies or merge chapter 2 and 3..."
                      value={customFeedback}
                      onChange={e => setCustomFeedback(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-2.5 outline-none focus:border-indigo-500 transition-all font-serif"
                    />
                    <button
                      type="button"
                      disabled={!customFeedback.trim()}
                      onClick={() => handleAdjustOutline('custom')}
                      className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Refine</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Discovery Questions (only for Scratch mode) */}
              {wizardMode === 'scratch' && questionsList.length > 0 && (
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-1 font-serif">Discovery Questions</h3>
                  <p className="text-xs text-slate-400 mb-4">Refine the style, tone, and pacing of the swarm's output</p>
                  
                  <div className="space-y-4">
                    {questionsList.map(([key, item]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block leading-snug">
                          {item.question}
                        </label>
                        <input
                          type="text"
                          placeholder="Type answer to refine tone..."
                          value={item.answer}
                          onChange={e => {
                            setAnswers(prev => ({
                              ...prev,
                              [key]: { ...prev[key], answer: e.target.value }
                            }));
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl p-3 outline-none focus:border-indigo-500 transition-all font-serif"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs p-3.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || adjusting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-55"
              >
                <Check className="w-5 h-5" />
                <span>{wizardMode === 'upload' ? 'Confirm Chapters & Initialize Project' : 'Approve Outline & Start Writing'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
