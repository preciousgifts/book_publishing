import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlass, Sparkle, BookOpenText, Target, WarningCircle, 
  CheckCircle, Lightbulb, FileText, ArrowRight, ArrowClockwise, Plus, Eye, Clock, Trash, Check
} from '@phosphor-icons/react';
import client from '../../api/client';
import { Modal } from '../common/Modal';

export function TopicResearch({ activeProject, onUseInOutline }) {
  const [reportsHistory, setReportsHistory] = useState([]);
  const [activeReportItem, setActiveReportItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showOutlineWizardModal, setShowOutlineWizardModal] = useState(false);

  const [topic, setTopic] = useState('');
  const [workingTitle, setWorkingTitle] = useState('');
  const [bookType, setBookType] = useState('non-fiction');
  const [constraints, setConstraints] = useState('');

  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('non-fiction');
  const [customDirections, setCustomDirections] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResearchHistory();
  }, []);

  const fetchResearchHistory = async () => {
    try {
      setLoading(true);
      const res = await client.get('/research');
      if (res.data.success) {
        setReportsHistory(res.data.data);
      }
    } catch (err) {
      console.error('Fetch research history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await client.post('/research/generate', {
        projectId: null,
        topic: topic.trim(),
        bookType,
        workingTitle: workingTitle.trim(),
        constraints: constraints.trim()
      });

      if (res.data.success) {
        setShowSearchModal(false);
        await fetchResearchHistory();
        
        const newReportId = res.data.data.reportId;
        const newReport = {
          id: newReportId,
          projectId: res.data.data.projectId,
          reportData: res.data.data.reportData
        };
        setActiveReportItem(newReport);
        setIsDetailModalOpen(true);
      } else {
        throw new Error(res.data.error || 'Failed to run topic research');
      }
    } catch (err) {
      setError(err.message || 'Error generating topic research');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (targetProjectId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this research report?')) return;

    try {
      setDeletingId(targetProjectId);
      const res = await client.delete(`/research/${targetProjectId}`);
      if (res.data.success) {
        setReportsHistory(prev => prev.filter(r => r.projectId !== targetProjectId));
        if (activeReportItem?.projectId === targetProjectId) {
          setIsDetailModalOpen(false);
          setActiveReportItem(null);
        }
      }
    } catch (err) {
      alert(`Failed to delete research report: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenOutlineWizard = (reportItem, preferredTitle = null, e = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setActiveReportItem(reportItem);
    
    const data = reportItem?.reportData || {};
    const defaultTitle = data.bookObjective?.workingTitle || data.seoResearch?.mainKeyword || reportItem?.project?.title || 'Researched Book Project';
    const defaultGenre = data.bookObjective?.bookCategory || 'non-fiction';
    
    const titleToUse = preferredTitle || (activeReportItem?.id === reportItem?.id && selectedTitle ? selectedTitle : defaultTitle);

    setSelectedTitle(titleToUse);
    setSelectedGenre(defaultGenre);
    setCustomDirections('');
    setShowOutlineWizardModal(true);
  };

  const handleExecuteCreateOutline = async () => {
    if (!activeReportItem?.projectId) return;
    try {
      setLoading(true);
      const res = await client.post('/research/use-in-outline', {
        projectId: activeReportItem.projectId,
        selectedTitle,
        genre: selectedGenre,
        customPrompt: customDirections.trim() || null
      });

      if (res.data.success) {
        setShowOutlineWizardModal(false);
        setIsDetailModalOpen(false);
        if (onUseInOutline) {
          onUseInOutline(res.data.data);
        }
      }
    } catch (err) {
      alert(`Failed to create outline from research: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activeReport = activeReportItem?.reportData || null;
  const validation = activeReport?.topicValidation || {};
  const titleIdeas = activeReport?.titleIdeas || [];

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8 animate-fade-in text-brand-textMain">
      {/* Header Banner */}
      <div className="bg-brand-surface p-8 md:p-10 rounded-[28px] border border-brand-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 bg-brand-primary/10 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-primary">
            <Sparkle className="w-4 h-4 text-brand-primary" />
            <span>KDP market intelligence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-brand-textMain tracking-tight">
            Topic Research Hub
          </h1>
          <p className="text-sm md:text-base text-brand-textMuted max-w-2xl leading-relaxed font-sans">
            Browse all your researched topics, compare market viability scores, review 15-category reports, select title angles, and generate manuscript outlines.
          </p>
        </div>

        <button
          onClick={() => {
            setTopic('');
            setWorkingTitle('');
            setShowSearchModal(true);
          }}
          className="px-6 py-3.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface font-bold rounded-2xl shadow-md transition-micro flex items-center space-x-2 flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-brand-accent" />
          <span>New Topic Search</span>
        </button>
      </div>

      {error && (
        <div className="bg-brand-danger/10 border border-brand-danger/30 p-4 rounded-2xl text-brand-danger text-xs flex items-center space-x-2">
          <WarningCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid View of ALL Previously Researched Topics */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-serif font-bold text-brand-textMain flex items-center space-x-2">
            <Clock className="w-5 h-5 text-brand-primary" />
            <span>Researched Topics ({reportsHistory.length})</span>
          </h2>
        </div>

        {loading && reportsHistory.length === 0 ? (
          <div className="bg-brand-surface p-12 rounded-[28px] border border-brand-border text-center space-y-3">
            <ArrowClockwise className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
            <p className="text-xs text-brand-textMuted font-medium font-sans">Loading research history...</p>
          </div>
        ) : reportsHistory.length === 0 ? (
          <div className="bg-brand-surface p-12 rounded-[28px] border border-brand-border text-center space-y-4">
            <MagnifyingGlass className="w-10 h-10 text-brand-primary mx-auto opacity-40" />
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-brand-textMain">No Researched Topics Yet</h3>
              <p className="text-xs text-brand-textMuted max-w-md mx-auto leading-relaxed font-sans">
                Run your first KDP topic market research to analyze audience demand, competitor gaps, BSR ranks, and SEO keywords.
              </p>
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-6 py-3 bg-brand-primary text-brand-surface font-bold text-xs rounded-xl shadow-sm hover:bg-brand-primaryHover transition-micro inline-flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-brand-accent" />
              <span>Run First Topic Search</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportsHistory.map((item) => {
              const data = item.reportData || {};
              const obj = data.bookObjective || {};
              const rec = data.topicValidation?.overallRecommendation || 'GO';
              const demandScore = data.topicValidation?.demandScore || 9;
              const profitScore = data.topicValidation?.profitabilityScore || 9;
              const titleText = obj.workingTitle || data.seoResearch?.mainKeyword || item.project?.title || 'Researched Topic';

              return (
                <div 
                  key={item.id}
                  className="bg-brand-surface p-6 rounded-[28px] border border-brand-border hover:border-brand-primary shadow-sm hover:shadow-md transition-micro flex flex-col justify-between space-y-5 group relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                        {obj.bookCategory || 'Non-Fiction'}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        <span className="bg-brand-primary text-brand-bg text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          {rec}
                        </span>

                        {/* Delete Research Item Button */}
                        <button
                          disabled={deletingId === item.projectId}
                          onClick={(e) => handleDeleteReport(item.projectId, e)}
                          className="p-1.5 rounded-lg text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/10 transition-micro cursor-pointer disabled:opacity-50"
                          title="Delete research report"
                        >
                          {deletingId === item.projectId ? (
                            <ArrowClockwise className="w-4 h-4 animate-spin text-brand-danger" />
                          ) : (
                            <Trash className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-lg text-brand-textMain group-hover:text-brand-primary transition-micro line-clamp-2 leading-snug">
                        {titleText}
                      </h3>
                      <p className="text-xs text-brand-textMuted line-clamp-3 mt-1.5 leading-relaxed font-sans">
                        {data.executiveSummary}
                      </p>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-brand-bg p-2.5 rounded-xl border border-brand-border text-center">
                        <span className="text-[10px] font-medium text-brand-textMuted block uppercase font-sans">Demand Score</span>
                        <span className="text-xs font-extrabold text-brand-primary">{demandScore}/10</span>
                      </div>
                      <div className="bg-brand-bg p-2.5 rounded-xl border border-brand-border text-center">
                        <span className="text-[10px] font-medium text-brand-textMuted block uppercase font-sans">Profitability</span>
                        <span className="text-xs font-extrabold text-brand-primary">{profitScore}/10</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-brand-border pt-4 gap-2">
                    <button
                      onClick={() => {
                        setActiveReportItem(item);
                        const d = item.reportData || {};
                        const defTitle = d.bookObjective?.workingTitle || d.seoResearch?.mainKeyword || item.project?.title || 'Researched Topic';
                        setSelectedTitle(defTitle);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-brand-bg hover:bg-brand-border text-brand-textMain text-xs font-bold rounded-xl transition-micro flex items-center space-x-1.5 cursor-pointer font-sans"
                    >
                      <Eye className="w-4 h-4 text-brand-primary" />
                      <span>View Details</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenOutlineWizard(item, e)}
                      disabled={loading}
                      className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 font-sans"
                    >
                      <span>Generate Outline</span>
                      <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Topic Search Modal */}
      <Modal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Run KDP Topic Market Research"
        subtitle="Perform 15-category Amazon intelligence, competitor gap analysis, and SEO search"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleGenerateResearch} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-textMuted mb-1.5 font-sans">Book topic / core subject *</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Project managers & agile teams"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-textMuted mb-1.5 font-sans">Working book title (optional)</label>
              <input
                type="text"
                placeholder="The publishing revolution"
                value={workingTitle}
                onChange={(e) => setWorkingTitle(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-textMuted mb-1.5 font-sans">Book type / format</label>
              <select
                value={bookType}
                onChange={(e) => setBookType(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans cursor-pointer"
              >
                <option value="non-fiction">Non-Fiction Step-by-Step Guide</option>
                <option value="educational">Educational / Textbook</option>
                <option value="self-help">Self-help and transformation</option>
                <option value="workbook">Workbook / Practice Guide</option>
                <option value="memoir">Memoir & Personal Narrative</option>
                <option value="cookbook">Cookbook & Recipe Collection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-textMuted mb-1.5 font-sans">Special constraints / instructions</label>
              <input
                type="text"
                placeholder="Focus on low-competition sub-genres"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setShowSearchModal(false)}
              className="px-4 py-2.5 text-xs font-semibold text-brand-textMuted hover:text-brand-textMain font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center space-x-2 disabled:opacity-50 cursor-pointer font-sans"
            >
              {loading ? <ArrowClockwise className="w-4 h-4 animate-spin text-brand-accent" /> : <MagnifyingGlass className="w-4 h-4 text-brand-surface" />}
              <span>{loading ? 'Running Market Research...' : 'Run KDP Topic Research'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Detailed 15-Category Report Modal for Selected Topic */}
      {activeReport && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={activeReport.bookObjective?.workingTitle || activeReport.seoResearch?.mainKeyword || '15-Category Market Intelligence Report'}
          subtitle={`Genre: ${activeReport.bookObjective?.bookCategory || 'Non-fiction'} • Category Analysis & Validation`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 pt-1 max-h-[75vh] overflow-y-auto pr-1">
            {/* Executive Summary & Go/No-Go Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-brand-bg p-6 rounded-2xl border border-brand-border space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center space-x-2 font-sans">
                  <FileText className="w-4 h-4" />
                  <span>Executive Summary</span>
                </h3>
                <p className="text-xs leading-relaxed text-brand-textMain font-sans">
                  {activeReport.executiveSummary}
                </p>
              </div>

              <div className="bg-brand-bg p-6 rounded-2xl border border-brand-border flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-1.5 font-sans">Publishing Recommendation</h3>
                  <div className="inline-flex items-center space-x-2 bg-brand-primary px-3 py-1 rounded-lg text-brand-surface font-bold text-xs font-sans">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-accent" />
                    <span>{validation.overallRecommendation || 'GO'}</span>
                  </div>
                  <p className="text-[11px] text-brand-textMuted mt-1.5 leading-normal font-sans">
                    {validation.rationale}
                  </p>
                </div>

                <div className="space-y-1.5 border-t border-brand-border pt-2 text-[11px] font-sans">
                  <div className="flex justify-between">
                    <span>Demand Score</span>
                    <span className="font-bold text-brand-primary">{validation.demandScore || 9}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Competition Score</span>
                    <span className="font-bold text-brand-primary">{validation.competitionManageableScore || 8}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profitability Score</span>
                    <span className="font-bold text-brand-primary">{validation.profitabilityScore || 9}/10</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audience & Pain Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-brand-bg p-6 rounded-2xl border border-brand-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center space-x-2 font-sans">
                  <Target className="w-4 h-4" />
                  <span>Target Reader Persona</span>
                </h3>
                <div className="space-y-2 text-xs text-brand-textMain font-sans">
                  <p><strong>Demographics:</strong> {activeReport.targetAudience?.demographics}</p>
                  <p><strong>Reading Habits:</strong> {activeReport.targetAudience?.readingHabits}</p>
                  <p><strong>Transformation:</strong> {activeReport.bookObjective?.expectedTransformation}</p>
                  <p><strong>Language Level:</strong> {activeReport.targetAudience?.languageLevel}</p>
                </div>
              </div>

              <div className="bg-brand-bg p-6 rounded-2xl border border-brand-border space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center space-x-2 font-sans">
                  <WarningCircle className="w-4 h-4" />
                  <span>Top Reader Pain Points</span>
                </h3>
                <ul className="space-y-2 text-xs font-sans">
                  {activeReport.readerPainPoints?.map((p, idx) => (
                    <li key={idx} className="flex items-start space-x-2 bg-brand-surface p-2.5 rounded-xl border border-brand-border text-brand-textMain font-medium">
                      <span className="text-brand-primary font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Titles & Subtitles Selector */}
            <div className="bg-brand-bg p-6 rounded-2xl border border-brand-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center space-x-2 font-sans">
                <Lightbulb className="w-4 h-4" />
                <span>Advised Book Title Angles ({titleIdeas.length}) &mdash; Select a title angle:</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {titleIdeas.map((t, idx) => {
                  const fullTitle = `${t.title}${t.subtitle ? `: ${t.subtitle}` : ''}`;
                  const isSelected = selectedTitle === fullTitle || selectedTitle === t.title;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedTitle(fullTitle)}
                      className={`p-4 rounded-xl border cursor-pointer transition-micro space-y-1 ${
                        isSelected 
                          ? 'bg-brand-primary text-brand-surface border-brand-primary shadow-md' 
                          : 'bg-brand-surface text-brand-textMain border-brand-border hover:border-brand-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs font-serif leading-tight">{t.title}</h4>
                        {isSelected && <Check className="w-4 h-4 text-brand-accent" />}
                      </div>
                      <p className={`text-[11px] italic leading-tight font-sans ${isSelected ? 'text-brand-surface/80' : 'text-brand-textMuted'}`}>
                        {t.subtitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-brand-border">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-textMain font-sans"
              >
                Close Details
              </button>
              <button
                onClick={(e) => handleOpenOutlineWizard(activeReportItem, selectedTitle, e)}
                disabled={loading}
                className="px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center space-x-2 disabled:opacity-50 cursor-pointer font-sans"
              >
                <BookOpenText className="w-4 h-4 text-brand-accent" />
                <span>Configure Project & Generate Outline</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-accent" />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pre-filled Create Project & Outline Wizard Modal */}
      {activeReportItem && (
        <Modal
          isOpen={showOutlineWizardModal}
          onClose={() => setShowOutlineWizardModal(false)}
          title="Create Book Project from Research"
          subtitle="Review pre-filled metadata and advised title before generating the manuscript outline"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-accent font-sans">
                Selected Book Title & Angle
              </label>
              <input
                type="text"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-accent font-sans">
                Book Genre / Category
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans cursor-pointer"
              >
                <option value="non-fiction">Non-Fiction Step-by-Step</option>
                <option value="self-help">Self-Help & Personal Transformation</option>
                <option value="educational">Educational / Textbook</option>
                <option value="business">Business & Entrepreneurship</option>
                <option value="memoir">Memoir & Personal Narrative</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-accent font-sans">
                Additional Author Directions (Optional)
              </label>
              <textarea
                rows={3}
                value={customDirections}
                onChange={(e) => setCustomDirections(e.target.value)}
                placeholder="e.g. Include 10 chapters, emphasize practical exercises, or focus on beginner audiences..."
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-sans resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setShowOutlineWizardModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-brand-textMuted hover:text-brand-textMain font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCreateOutline}
                disabled={loading || !selectedTitle.trim()}
                className="px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow-sm transition-micro flex items-center space-x-2 disabled:opacity-50 cursor-pointer font-sans"
              >
                {loading ? <ArrowClockwise className="w-4 h-4 animate-spin text-brand-accent" /> : <Sparkle className="w-4 h-4 text-brand-accent" />}
                <span>Proceed & Generate Outline</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
