import React, { useState } from 'react';
import { Modal } from '../common/Modal';

export function MatterInputsModal({ isOpen, onClose, page, onSave }) {
  if (!page) return null;

  const { pageType, title } = page;
  const initialInputs = page.authorInputs || {};

  const [inputs, setInputs] = useState(initialInputs);

  const handleChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(page.id, inputs);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Inputs for ${title}`}
      subtitle="Supply author information to tailor generation for this page."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 animate-fade-in transition-micro">
        {pageType === 'title_page' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Author / Pen Name Override (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank to use account author name"
                value={inputs.authorOverride || ''}
                onChange={e => handleChange('authorOverride', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Subtitle Override (Optional)</label>
              <input
                type="text"
                placeholder="Subtitle to display on title page"
                value={inputs.subtitleOverride || ''}
                onChange={e => handleChange('subtitleOverride', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>
          </>
        )}

        {pageType === 'copyright_page' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Copyright Year</label>
                <input
                  type="text"
                  value={inputs.copyrightYear || new Date().getFullYear().toString()}
                  onChange={e => handleChange('copyrightYear', e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Copyright Holder</label>
                <input
                  type="text"
                  placeholder="Author or Publisher Name"
                  value={inputs.copyrightHolder || ''}
                  onChange={e => handleChange('copyrightHolder', e.target.value)}
                  className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">ISBN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 978-3-16-148410-0"
                value={inputs.isbn || ''}
                onChange={e => handleChange('isbn', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary font-mono transition-micro"
              />
            </div>

            {/* Editable Content Generation Disclosure Clause */}
            <div className="p-3 bg-brand-bg border border-brand-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-surfaceText font-sans">KDP Content Generation Disclosure Clause</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.aiDisclosureEnabled ?? true}
                    onChange={e => handleChange('aiDisclosureEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-brand-borderStrong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>

              {(inputs.aiDisclosureEnabled ?? true) && (
                <div>
                  <textarea
                    rows={2}
                    value={inputs.aiDisclosureText || 'This work was created with writing assistance tools.'}
                    onChange={e => handleChange('aiDisclosureText', e.target.value)}
                    className="w-full bg-brand-surface text-brand-textMain border border-brand-border rounded-lg p-2 text-xs outline-none resize-none transition-micro font-sans"
                  />
                  <p className="text-[10px] text-brand-textMuted mt-1 font-sans">
                    Editable disclosure text to satisfy Amazon KDP content generation policy.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {pageType === 'dedication' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Dedication Prompt / Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Dedicated to my family and mentors who made this journey possible..."
              value={inputs.promptText || ''}
              onChange={e => handleChange('promptText', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'epigraph' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Quote Text</label>
              <textarea
                rows={2}
                placeholder="The actual quotation text..."
                value={inputs.quoteText || ''}
                onChange={e => handleChange('quoteText', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none font-serif transition-micro"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Quote Source / Author</label>
              <input
                type="text"
                placeholder="e.g. Marcus Aurelius, Meditations"
                value={inputs.quoteSource || ''}
                onChange={e => handleChange('quoteSource', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>
            <div className="pt-2 border-t border-brand-border">
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Or ask for a suggested public domain quote on a theme:</label>
              <input
                type="text"
                placeholder="e.g. Perseverance and courage"
                value={inputs.aiSuggestTheme || ''}
                onChange={e => handleChange('aiSuggestTheme', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
              />
              <p className="text-[10px] text-brand-textMuted mt-1 font-sans">
                * The system will only suggest public-domain quotes and will mark them for verification.
              </p>
            </div>
          </>
        )}

        {pageType === 'foreword' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Attributed Contributor Name *</label>
              <input
                type="text"
                placeholder="e.g. Dr. Jane Smith, Industry Lead"
                value={inputs.forewordBy || ''}
                onChange={e => handleChange('forewordBy', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Contributor Relationship / Background Notes</label>
              <textarea
                rows={3}
                placeholder="Details on relationship to the book or author..."
                value={inputs.relationship || ''}
                onChange={e => handleChange('relationship', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
              />
            </div>
          </>
        )}

        {['preface', 'introduction', 'appendix'].includes(pageType) && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Author Notes / Specific Directives</label>
            <textarea
              rows={3}
              placeholder="Outline specific points or tone nuances to emphasize..."
              value={inputs.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'acknowledgments' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Names & Relationships to Thank</label>
            <textarea
              rows={3}
              placeholder="e.g. My spouse Sarah, my editor John, and the beta reading community..."
              value={inputs.namesToThank || ''}
              onChange={e => handleChange('namesToThank', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'glossary' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Specific Terms to Include (Optional)</label>
            <textarea
              rows={3}
              placeholder="List terms separated by commas (system will also auto-derive terms from manuscript)..."
              value={inputs.additionalTerms || ''}
              onChange={e => handleChange('additionalTerms', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'about_author' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Author Bio Bullet Facts / Notes</label>
            <textarea
              rows={4}
              placeholder="Credentials, experience, achievements, website, location..."
              value={inputs.bioNotes || ''}
              onChange={e => handleChange('bioNotes', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'also_by_author' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Other Titles List</label>
            <textarea
              rows={3}
              placeholder="List titles of other books or series..."
              value={inputs.otherTitles || ''}
              onChange={e => handleChange('otherTitles', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'discussion_questions' && (
          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Themes to Emphasize in Questions</label>
            <textarea
              rows={3}
              placeholder="Key themes or moral dilemmas to focus on..."
              value={inputs.themeNotes || ''}
              onChange={e => handleChange('themeNotes', e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary resize-none transition-micro font-sans"
            />
          </div>
        )}

        {pageType === 'call_to_action' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Tone Preference</label>
              <select
                value={inputs.callToActionTone || 'friendly'}
                onChange={e => handleChange('callToActionTone', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none font-semibold transition-micro font-sans"
              >
                <option value="friendly">Friendly & Personal</option>
                <option value="professional">Professional & Direct</option>
                <option value="enthusiastic">Enthusiastic & Inspiring</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Author Website URL (Optional)</label>
              <input
                type="text"
                placeholder="e.g. https://myauthorwebsite.com"
                value={inputs.websiteUrl || ''}
                onChange={e => handleChange('websiteUrl', e.target.value)}
                className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
              />
            </div>
          </>
        )}

        <div className="flex justify-end space-x-2 pt-2 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-surfaceText transition-micro font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold rounded-xl shadow transition-micro font-sans"
          >
            Save Inputs
          </button>
        </div>
      </form>
    </Modal>
  );
}
