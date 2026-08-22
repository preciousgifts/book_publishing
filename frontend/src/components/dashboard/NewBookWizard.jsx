import React, { useState, useEffect } from 'react';
import { ArrowClockwise, CaretRight, Check, Plus, Minus, PaperPlaneRight, CloudArrowUp, BookOpenText, Sparkle, FileText, CaretDown, CaretUp } from '@phosphor-icons/react';
import { Modal } from '../common/Modal';
import client from '../../api/client';
import { FRONT_MATTER_CATALOG, BACK_MATTER_CATALOG, getRecommendedDefaults } from '../../config/frontMatterCatalog';

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

  // Outline response
  const [outline, setOutline] = useState(null);
  const [answers, setAnswers] = useState({});
  
  // Outline customization states
  const [adjusting, setAdjusting] = useState(false);
  const [customFeedback, setCustomFeedback] = useState('');

  // Step 4: Matter page selections map: { [pageType]: { included: boolean, authorInputs: {} } }
  const [matterSelections, setMatterSelections] = useState({});
  const [expandedInputType, setExpandedInputType] = useState(null);

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

  const handleStep3ToStep4 = (e) => {
    e.preventDefault();
    const defaultsSet = new Set(getRecommendedDefaults(genre));
    const initSelections = {};

    [...FRONT_MATTER_CATALOG, ...BACK_MATTER_CATALOG].forEach((cat) => {
      initSelections[cat.pageType] = {
        included: defaultsSet.has(cat.pageType),
        authorInputs: {}
      };
    });

    setMatterSelections(initSelections);
    setStep(4);
  };

  const handleToggleMatterIncluded = (pageType) => {
    setMatterSelections(prev => ({
      ...prev,
      [pageType]: {
        ...prev[pageType],
        included: !prev[pageType]?.included
      }
    }));
  };

  const handleMatterInputChange = (pageType, inputKey, value) => {
    setMatterSelections(prev => ({
      ...prev,
      [pageType]: {
        ...prev[pageType],
        authorInputs: {
          ...(prev[pageType]?.authorInputs || {}),
          [inputKey]: value
        }
      }
    }));
  };

  const handleFinalWizardSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const discoveryAnswers = {};
    Object.values(answers).forEach(val => {
      discoveryAnswers[val.question] = val.answer;
    });

    try {
      const response = await client.post('/swarm/approve-outline', {
        outlineId: outline.id,
        discoveryAnswers
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to approve outline');
      }

      if (outline.projectId) {
        const matterPagesRes = await client.get(`/projects/${outline.projectId}/matter`);
        const existingPages = matterPagesRes.data.data || [];

        const batchUpdates = existingPages.map((page) => {
          const selection = matterSelections[page.pageType];
          return {
            id: page.id,
            included: Boolean(selection?.included),
            authorInputs: selection?.authorInputs || {}
          };
        });

        await client.post(`/projects/${outline.projectId}/matter/batch-toggle`, {
          items: batchUpdates
        });
      }

      onComplete(outline.projectId);
    } catch (err) {
      setError(err.message || 'Failed to finalize project creation');
    } finally {
      setLoading(false);
    }
  };

  const tocList = outline?.tocData?.toc || [];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Scriboral Project Wizard"
      subtitle="Configure your manuscript settings and run outline generation"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Wizard Steps indicator */}
        <div className="px-4 py-2 bg-brand-bg/60 rounded-xl border border-brand-border flex items-center space-x-4 text-xs font-semibold text-brand-textMuted select-none font-sans">
          <span className={step === 1 ? 'text-brand-primary font-bold' : outline ? 'text-brand-info' : ''}>1. Project Source</span>
          <CaretRight className="w-3.5 h-3.5" />
          <span className={step === 2 ? 'text-brand-primary font-bold' : ''}>2. Project Setup</span>
          <CaretRight className="w-3.5 h-3.5" />
          <span className={step === 3 ? 'text-brand-primary font-bold' : step > 3 ? 'text-brand-info' : ''}>3. Outline</span>
          <CaretRight className="w-3.5 h-3.5" />
          <span className={step === 4 ? 'text-brand-primary font-bold' : ''}>4. Front & Back Matter</span>
        </div>

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
              <div
                onClick={() => setWizardMode('scratch')}
                className={`border p-3.5 rounded-2xl cursor-pointer flex flex-col justify-between transition-micro select-none ${
                  wizardMode === 'scratch'
                    ? 'border-brand-primary bg-brand-primary/10 shadow-sm'
                    : 'border-brand-border hover:bg-brand-bg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkle className={`w-4 h-4 ${wizardMode === 'scratch' ? 'text-brand-primary' : 'text-brand-textMuted'}`} />
                  <h4 className="font-bold text-xs text-brand-surfaceText">Start New Book</h4>
                </div>
                  <p className="text-[11px] text-brand-textMuted mt-1">
                    Co-write a book with a customized outline builder.
                  </p>
              </div>

              <div
                onClick={() => setWizardMode('upload')}
                className={`border p-3.5 rounded-2xl cursor-pointer flex flex-col justify-between transition-micro select-none ${
                  wizardMode === 'upload'
                    ? 'border-brand-primary bg-brand-primary/10 shadow-sm'
                    : 'border-brand-border hover:bg-brand-bg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CloudArrowUp className={`w-4 h-4 ${wizardMode === 'upload' ? 'text-brand-primary' : 'text-brand-textMuted'}`} />
                  <h4 className="font-bold text-xs text-brand-surfaceText">Import Manuscript</h4>
                </div>
                <p className="text-[11px] text-brand-textMuted mt-1">
                  Upload an existing `.docx`, `.txt`, or `.md` manuscript for gap analysis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
              <div>
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Book Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Beyond the Pages"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border text-xs rounded-xl p-2.5 outline-none focus:border-brand-primary transition-micro font-serif"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Book Type / Genre</label>
                <select
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border text-xs rounded-xl p-2.5 outline-none font-semibold cursor-pointer"
                >
                  <option value="non-fiction">Non-Fiction (General)</option>
                  <option value="fiction">Fiction (General)</option>
                  <option value="memoir">Memoir / Biography</option>
                  <option value="educational">Educational / Textbook</option>
                  <option value="guide">Guide / How-To</option>
                  <option value="workbook">Workbook / Journal</option>
                  <option value="cookbook">Cookbook</option>
                  <option value="children">Children's Book</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
              <div>
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Trim Size</label>
                <select
                  value={trimSize}
                  onChange={e => setTrimSize(e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border text-xs rounded-xl p-2.5 outline-none font-semibold cursor-pointer"
                >
                  <option value="6x9">6" x 9" (KDP Standard)</option>
                  <option value="5.5x8.5">5.5" x 8.5"</option>
                  <option value="5x8">5" x 8"</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Language Locale</label>
                <select
                  value={locale}
                  onChange={e => setLocale(e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border text-xs rounded-xl p-2.5 outline-none font-semibold cursor-pointer"
                >
                  <option value="en-US">American English (en-US)</option>
                  <option value="en-GB">British English (en-GB)</option>
                </select>
              </div>
            </div>

            {wizardMode === 'scratch' ? (
              <div className="font-sans">
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Concept Prompt *</label>
                <textarea
                  rows="3"
                  placeholder="Detail the core concept, target audience, and key themes..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border text-xs rounded-xl p-2.5 outline-none focus:border-brand-primary transition-micro font-serif resize-none"
                  required
                />
              </div>
            ) : (
              <div className="font-sans">
                <label className="text-xs font-semibold text-brand-textMuted block mb-1">Upload Manuscript File</label>
                <input
                  type="file"
                  accept=".docx,.txt,.md"
                  onChange={handleFileChange}
                  className="w-full text-xs text-brand-textMuted bg-brand-bg p-2 rounded-xl border border-brand-border cursor-pointer"
                  required
                />
              </div>
            )}

            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-xs p-3 rounded-xl font-sans">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <span>{wizardMode === 'upload' ? 'Upload & Run Gap Analysis' : 'Generate Outline Draft'}</span>
            </button>
          </form>
        )}

        {/* Step 2 Loading */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 text-center select-none space-y-2 font-sans">
            <ArrowClockwise className="animate-spin h-8 w-8 text-brand-primary mb-2" />
            <h3 className="text-sm font-bold text-brand-surfaceText">
              {wizardMode === 'upload' ? 'Parsing Manuscript & Auditing Gaps...' : 'Architecting Outline Draft...'}
            </h3>
            <p className="text-xs text-brand-textMuted max-w-sm mx-auto">
              Pipeline is analyzing your input...
            </p>
          </div>
        )}

        {/* Step 3 Outline Approval */}
        {step === 3 && (
          <form onSubmit={handleStep3ToStep4} className="space-y-4 font-sans">
            {healthReport && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-primary uppercase">Health Audit</h3>
                <div className="bg-brand-bg border border-brand-border rounded-xl p-3 max-h-36 overflow-y-auto text-xs text-brand-textMuted whitespace-pre-wrap">
                  {healthReport}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-brand-primary uppercase">Table of Contents</h3>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={adjusting || tocList.length <= 1}
                    onClick={() => handleAdjustOutline('condense')}
                    className="px-2 py-1 bg-brand-bg border border-brand-border rounded text-[10px] font-semibold flex items-center gap-1 text-brand-surfaceText cursor-pointer transition-micro hover:bg-brand-border"
                  >
                    <Minus className="w-3 h-3" />
                    <span>Reduce</span>
                  </button>
                  <button
                    type="button"
                    disabled={adjusting}
                    onClick={() => handleAdjustOutline('expand')}
                    className="px-2 py-1 bg-brand-bg border border-brand-border rounded text-[10px] font-semibold flex items-center gap-1 text-brand-surfaceText cursor-pointer transition-micro hover:bg-brand-border"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Increase</span>
                  </button>
                </div>
              </div>

              <div className="border border-brand-border rounded-xl bg-brand-bg max-h-48 overflow-y-auto p-2 space-y-2 text-xs">
                {tocList.map((ch) => (
                  <div key={ch.chapterNumber} className="p-2 border-b border-brand-border/50 last:border-0">
                    <span className="font-bold text-brand-primary font-mono">CH {ch.chapterNumber}: </span>
                    <span className="font-semibold text-brand-textMain">{ch.title}</span>
                    <p className="text-[11px] text-brand-textMuted line-clamp-1 mt-0.5">{ch.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || adjusting}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Front & Back Matter Setup</span>
              <CaretRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 4 Front & Back Matter Selection */}
        {step === 4 && (
          <form onSubmit={handleFinalWizardSubmit} className="space-y-4 font-sans">
            <div className="text-xs text-brand-textMuted">
              Select which front & back matter pages to include in your book manuscript. Recommended defaults for <strong className="text-brand-primary">{genre}</strong> are pre-checked.
            </div>

            <div className="max-h-72 overflow-y-auto pr-1 space-y-4">
              {/* Front Matter Group */}
              <div>
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Front Matter (Before Chapter 1)</span>
                </h4>
                <div className="space-y-2">
                  {FRONT_MATTER_CATALOG.map((item) => {
                    const isIncluded = Boolean(matterSelections[item.pageType]?.included);
                    const isExpanded = expandedInputType === item.pageType;
                    const inputs = matterSelections[item.pageType]?.authorInputs || {};

                    return (
                      <div key={item.pageType} className="border border-brand-border rounded-xl bg-brand-bg p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2.5 cursor-pointer flex-1 select-none">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => handleToggleMatterIncluded(item.pageType)}
                              className="rounded border-brand-border text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-brand-surfaceText">{item.title}</span>
                              <p className="text-[11px] text-brand-textMuted">{item.description}</p>
                            </div>
                          </label>

                          {item.requiresInput && isIncluded && (
                            <button
                              type="button"
                              onClick={() => setExpandedInputType(isExpanded ? null : item.pageType)}
                              className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1 ml-2 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Inputs' : 'Author Inputs'}</span>
                              {isExpanded ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Inline author input fields if expanded */}
                        {isExpanded && isIncluded && (
                          <div className="mt-2 pt-2 border-t border-brand-border space-y-2">
                            {item.pageType === 'epigraph' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Quote text"
                                  value={inputs.quoteText || ''}
                                  onChange={e => handleMatterInputChange(item.pageType, 'quoteText', e.target.value)}
                                  className="bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs outline-none focus:border-brand-primary"
                                />
                                <input
                                  type="text"
                                  placeholder="Quote source"
                                  value={inputs.quoteSource || ''}
                                  onChange={e => handleMatterInputChange(item.pageType, 'quoteSource', e.target.value)}
                                  className="bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs outline-none focus:border-brand-primary"
                                />
                              </div>
                            )}

                            {item.pageType === 'foreword' && (
                              <input
                                type="text"
                                placeholder="Foreword attributed author name"
                                value={inputs.forewordBy || ''}
                                onChange={e => handleMatterInputChange(item.pageType, 'forewordBy', e.target.value)}
                                className="w-full bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs outline-none focus:border-brand-primary"
                              />
                            )}

                            {item.pageType === 'acknowledgments' && (
                              <input
                                type="text"
                                placeholder="Names / entities to thank"
                                value={inputs.namesToThank || ''}
                                onChange={e => handleMatterInputChange(item.pageType, 'namesToThank', e.target.value)}
                                className="w-full bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs outline-none focus:border-brand-primary"
                              />
                            )}

                            {['dedication', 'preface', 'introduction', 'about_author', 'also_by_author'].includes(item.pageType) && (
                              <textarea
                                rows={2}
                                placeholder="Optional prompt or notes..."
                                value={inputs.promptText || inputs.notes || inputs.bioNotes || inputs.otherTitles || ''}
                                onChange={e => handleMatterInputChange(item.pageType, item.pageType === 'dedication' ? 'promptText' : item.pageType === 'about_author' ? 'bioNotes' : item.pageType === 'also_by_author' ? 'otherTitles' : 'notes', e.target.value)}
                                className="w-full bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs resize-none outline-none focus:border-brand-primary"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back Matter Group */}
              <div>
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2 flex items-center gap-1.5 mt-4">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Back Matter (After Final Chapter)</span>
                </h4>
                <div className="space-y-2">
                  {BACK_MATTER_CATALOG.map((item) => {
                    const isIncluded = Boolean(matterSelections[item.pageType]?.included);
                    const isExpanded = expandedInputType === item.pageType;
                    const inputs = matterSelections[item.pageType]?.authorInputs || {};

                    return (
                      <div key={item.pageType} className="border border-brand-border rounded-xl bg-brand-bg p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2.5 cursor-pointer flex-1 select-none">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => handleToggleMatterIncluded(item.pageType)}
                              className="rounded border-brand-border text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-brand-surfaceText">{item.title}</span>
                              <p className="text-[11px] text-brand-textMuted">{item.description}</p>
                            </div>
                          </label>

                          {item.requiresInput && isIncluded && (
                            <button
                              type="button"
                              onClick={() => setExpandedInputType(isExpanded ? null : item.pageType)}
                              className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1 ml-2 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Inputs' : 'Author Inputs'}</span>
                              {isExpanded ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Inline author input fields if expanded */}
                        {isExpanded && isIncluded && (
                          <div className="mt-2 pt-2 border-t border-brand-border space-y-2">
                            <textarea
                              rows={2}
                              placeholder="Notes or terms for this back matter page..."
                              value={inputs.bioNotes || inputs.otherTitles || inputs.themeNotes || inputs.notes || ''}
                              onChange={e => handleMatterInputChange(item.pageType, item.pageType === 'about_author' ? 'bioNotes' : item.pageType === 'also_by_author' ? 'otherTitles' : item.pageType === 'discussion_questions' ? 'themeNotes' : 'notes', e.target.value)}
                              className="w-full bg-brand-surface text-brand-textMain border border-brand-border rounded p-1.5 text-xs resize-none outline-none focus:border-brand-primary"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-xs p-3 rounded-xl font-sans">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 text-brand-accent" />
              <span>Approve & Complete Project Setup</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
