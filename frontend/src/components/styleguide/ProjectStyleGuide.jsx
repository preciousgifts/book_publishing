import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, FloppyDisk, CheckCircle, ArrowClockwise } from '@phosphor-icons/react';
import client from '../../api/client';

export function ProjectStyleGuide({ projectId }) {
  const [tone, setTone] = useState('informative');
  const [pov, setPov] = useState('third-person');
  const [targetReadability, setTargetReadability] = useState('general');
  const [customRules, setCustomRules] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchStyleGuide();
    }
  }, [projectId]);

  const fetchStyleGuide = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/style-guide/${projectId}`);
      if (res.data.success && res.data.data) {
        const guide = res.data.data;
        setTone(guide.tone || 'informative');
        setPov(guide.pov || 'third-person');
        setTargetReadability(guide.targetReadability || 'general');
        setCustomRules(guide.styleRules?.customRules || '');
      }
    } catch (err) {
      console.error('Fetch style guide error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStyleGuide = async (e) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      setLoading(true);
      const res = await client.post('/style-guide', {
        projectId,
        tone,
        pov,
        targetReadability,
        styleRules: { customRules }
      });

      if (res.data.success) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      alert(`Failed to save style guide: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in text-brand-textMain">
      <div className="bg-brand-surface text-brand-surfaceText p-8 rounded-3xl shadow-xl border border-brand-border flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 bg-brand-primary/10 px-3 py-1 rounded-full text-xs text-brand-primary font-bold mb-2 font-sans">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manuscript Governance</span>
          </div>
          <h1 className="text-3xl font-bold font-serif">Project Style Guide & Tone Settings</h1>
          <p className="text-xs text-brand-textMuted mt-1 font-sans">
            Configure tone of voice, narrative perspective, target reading level, and custom editorial rules enforced across all generation passes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveStyleGuide} className="bg-brand-surface text-brand-surfaceText p-8 rounded-2xl border border-brand-border shadow-md space-y-6">
        <h3 className="text-sm font-bold font-serif text-brand-primary uppercase tracking-wider">
          Editorial Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-2">Tone of Voice</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-semibold cursor-pointer"
            >
              <option value="informative">Informative & Authoritative</option>
              <option value="conversational">Conversational & Engaging</option>
              <option value="academic">Academic & Rigorous</option>
              <option value="formal">Formal & Professional</option>
              <option value="casual">Casual & Humorous</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-2">Point of View (POV)</label>
            <select
              value={pov}
              onChange={(e) => setPov(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-semibold cursor-pointer"
            >
              <option value="third-person">Third-Person (He/She/They/It)</option>
              <option value="first-person">First-Person (I/We)</option>
              <option value="second-person">Second-Person (You/Your)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-2">Target Reading Level</label>
            <select
              value={targetReadability}
              onChange={(e) => setTargetReadability(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-semibold cursor-pointer"
            >
              <option value="general">General Adult Reader (Grade 8-10)</option>
              <option value="beginner">Beginner / Plain Language</option>
              <option value="highschool">High School / Undergraduate</option>
              <option value="expert">Expert / Industry Specialist</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-textMuted mb-2 font-sans">Custom Style & Terminology Rules</label>
          <textarea
            rows={5}
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder="e.g. Always capitalize 'Scriboral'. Avoid industry buzzwords. Use British spelling for technical terms..."
            className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans resize-none"
          />
        </div>

        <div className="flex items-center justify-between border-t border-brand-border pt-4">
          <div>
            {savedMessage && (
              <span className="text-xs text-brand-info font-semibold flex items-center space-x-1.5 animate-fade-in font-sans">
                <CheckCircle className="w-4 h-4" />
                <span>Style Guide preferences updated successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow transition-micro flex items-center space-x-2 disabled:opacity-50 font-sans cursor-pointer"
          >
            {loading ? <ArrowClockwise className="w-4 h-4 animate-spin text-brand-accent" /> : <FloppyDisk className="w-4 h-4 text-brand-accent" />}
            <span>Save Style Guide</span>
          </button>
        </div>
      </form>
    </div>
  );
}
