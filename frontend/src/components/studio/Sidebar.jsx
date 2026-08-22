import React, { useState } from "react";
import { FileText, MagicWand as Wand2, Sparkle as Sparkles, CheckCircle as CheckCircle2, SlidersHorizontal as Sliders, ArrowClockwise as RotateCw, CaretDown as ChevronDown, CaretRight as ChevronRight, GearSix as Settings, Check, Plus } from "@phosphor-icons/react";
import { Modal } from "../common/Modal";

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

export function Sidebar({
  outline,
  paragraphs,
  activeChapterIndex,
  activeMatterPageId,
  matterPages = [],
  onSelectChapter,
  onSelectMatterPage,
  onToggleMatterIncluded,
  onOpenInputsModal,
  onGenerateMatterPage,
  onApproveMatterPage,
  onWriteChapter,
  isGenerating,
}) {
  const [rewriteTargetIndex, setRewriteTargetIndex] = useState(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [minWordCount, setMinWordCount] = useState("1000");
  const [humanizeOverride, setHumanizeOverride] = useState(null);

  const [frontOpen, setFrontOpen] = useState(true);
  const [backOpen, setBackOpen] = useState(true);

  // Extract ToC list from outline tocData
  const tocObj = outline?.tocData || {};
  const tocList = tocObj.toc || (Array.isArray(tocObj) ? tocObj : []);

  // Determine which chapters have paragraphs written
  const writtenChapterIndices = new Set(paragraphs.map((p) => p.chapterIndex));

  // Find first unwritten chapter index
  const nextUnwrittenChapter = tocList.find(
    (ch) =>
      !writtenChapterIndices.has(ch.chapterNumber - 1) &&
      !writtenChapterIndices.has(ch.chapterIndex),
  );

  const getChapterIndex = (ch) => {
    return ch.chapterIndex !== undefined
      ? ch.chapterIndex
      : ch.chapterNumber - 1;
  };

  const activeChapterWritten = activeChapterIndex !== null && writtenChapterIndices.has(activeChapterIndex);

  const handleOpenRewriteModal = (idx, e) => {
    if (e) e.stopPropagation();
    setRewriteTargetIndex(idx);
    setCustomInstruction("");
    setMinWordCount("1000");
    setHumanizeOverride(null);
  };

  const handleExecuteRewrite = (overrideOptions = null) => {
    if (rewriteTargetIndex === null) return;
    const targetIdx = rewriteTargetIndex;
    setRewriteTargetIndex(null);

    const options = overrideOptions || {
      customInstruction: customInstruction.trim() || null,
      humanizeOverride,
      minWordCount: minWordCount ? Number(minWordCount) : null,
    };

    onWriteChapter(targetIdx, options);
  };

  const selectedChapterObj =
    rewriteTargetIndex !== null
      ? tocList.find((ch) => getChapterIndex(ch) === rewriteTargetIndex)
      : null;

  const frontPages = matterPages.filter(m => m.section === 'FRONT');
  const backPages = matterPages.filter(m => m.section === 'BACK');

  const renderStatusBadge = (page) => {
    if (!page.included) {
      return <span className="text-[9px] text-brand-textMuted bg-brand-bg px-1.5 py-0.5 rounded">Excluded</span>;
    }

    switch (page.status) {
      case 'APPROVED':
        return <span className="text-[9px] font-bold text-brand-info bg-brand-info/10 px-1.5 py-0.5 rounded border border-brand-info/30">Approved</span>;
      case 'GENERATED_PENDING_REVIEW':
        return <span className="text-[9px] font-bold text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded border border-brand-warning/30">Pending Review</span>;
      default:
        return <span className="text-[9px] text-brand-textMuted bg-brand-bg px-1.5 py-0.5 rounded border border-brand-border">Not Generated</span>;
    }
  };

  return (
    <aside className="w-80 border-r border-brand-border bg-brand-surface text-brand-surfaceText p-5 flex flex-col h-full select-none relative">
      <div className="flex-1 overflow-y-auto space-y-6">
        
        {/* Front Matter Group */}
        <div>
          <button
            onClick={() => setFrontOpen(!frontOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-brand-textMain hover:text-brand-primary uppercase tracking-wider mb-2 cursor-pointer transition-micro"
          >
            <div className="flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Front Matter</span>
            </div>
            {frontOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {frontOpen && (
            <nav className="space-y-1">
              {frontPages.map((page) => {
                const isActive = activeMatterPageId === page.id;
                const pageTitle = PAGE_TITLES[page.pageType] || page.pageType;

                return (
                  <div
                    key={page.id}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-micro border ${
                      isActive
                        ? "bg-brand-primary/10 border-brand-primary/40"
                        : "hover:bg-brand-bg/50 border-transparent"
                    } ${!page.included ? 'opacity-50' : ''}`}
                    onClick={() => onSelectMatterPage && onSelectMatterPage(page)}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={page.included}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleMatterIncluded && onToggleMatterIncluded(page.id, e.target.checked);
                        }}
                        className="rounded border-brand-border text-brand-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-semibold truncate text-brand-surfaceText">
                            {pageTitle}
                          </h4>
                          {renderStatusBadge(page)}
                        </div>
                      </div>
                    </div>

                    {page.included && (
                      <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInputsModal && onOpenInputsModal(page);
                          }}
                          className="p-1 text-brand-textMuted hover:text-brand-surfaceText rounded"
                          title="Author Inputs"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateMatterPage && onGenerateMatterPage(page);
                          }}
                          className="p-1 text-brand-textMain hover:text-brand-primary hover:bg-brand-primary/10 rounded transition-micro"
                          title="Generate / Re-generate Content"
                        >
                          <Wand2 className="w-3 h-3" />
                        </button>
                        {page.status === 'GENERATED_PENDING_REVIEW' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveMatterPage && onApproveMatterPage(page.id);
                            }}
                            className="p-1 text-brand-info hover:bg-brand-info/20 rounded"
                            title="Approve Content"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Chapters Section */}
        <div>
          <h2 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">
            Manuscript Outline
          </h2>

          <nav className="space-y-1">
            {tocList.length === 0 ? (
              <p className="text-xs text-brand-textMuted italic">
                No outline generated.
              </p>
            ) : (
              tocList.map((ch) => {
                const idx = getChapterIndex(ch);
                const isWritten = writtenChapterIndices.has(idx);
                const isActive = activeChapterIndex === idx && !activeMatterPageId;

                return (
                  <div
                    key={ch.chapterNumber || idx}
                    className={`group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-micro border ${
                      isActive
                        ? "bg-brand-primary/10 border-brand-primary/40"
                        : "hover:bg-brand-bg/50 border-transparent"
                    }`}
                    onClick={() => onSelectChapter(idx)}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`mt-0.5 p-1 rounded-lg ${
                          isWritten
                            ? "text-brand-accent bg-brand-primary/20"
                            : "text-brand-textMuted bg-brand-bg"
                        }`}
                      >
                        {isWritten ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-semibold leading-tight ${
                            isActive
                              ? "text-brand-primary font-bold"
                              : "text-brand-surfaceText"
                          }`}
                        >
                          Chapter {ch.chapterNumber || idx + 1}
                        </h4>
                        <p className="text-xs text-brand-textMuted line-clamp-1 mt-0.5">
                          {ch.title}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isGenerating}
                      onClick={(e) => handleOpenRewriteModal(idx, e)}
                      className="p-1.5 text-xs text-brand-textMain hover:text-brand-primary hover:bg-brand-primary/10 transition-micro rounded-lg flex items-center space-x-1 cursor-pointer"
                      title={
                        isWritten
                          ? "Regenerate / Customize chapter"
                          : "Draft chapter"
                      }
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">
                        {isWritten ? "Rewrite" : "Draft"}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </nav>
        </div>

        {/* Back Matter Group */}
        <div>
          <button
            onClick={() => setBackOpen(!backOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-brand-textMain hover:text-brand-primary uppercase tracking-wider mb-2 cursor-pointer transition-micro"
          >
            <div className="flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Back Matter</span>
            </div>
            {backOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {backOpen && (
            <nav className="space-y-1">
              {backPages.map((page) => {
                const isActive = activeMatterPageId === page.id;
                const pageTitle = PAGE_TITLES[page.pageType] || page.pageType;

                return (
                  <div
                    key={page.id}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-micro border ${
                      isActive
                        ? "bg-brand-primary/10 border-brand-primary/40"
                        : "hover:bg-brand-bg/50 border-transparent"
                    } ${!page.included ? 'opacity-50' : ''}`}
                    onClick={() => onSelectMatterPage && onSelectMatterPage(page)}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={page.included}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleMatterIncluded && onToggleMatterIncluded(page.id, e.target.checked);
                        }}
                        className="rounded border-brand-border text-brand-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-semibold truncate text-brand-surfaceText">
                            {pageTitle}
                          </h4>
                          {renderStatusBadge(page)}
                        </div>
                      </div>
                    </div>

                    {page.included && (
                      <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInputsModal && onOpenInputsModal(page);
                          }}
                          className="p-1 text-brand-textMuted hover:text-brand-surfaceText rounded"
                          title="Author Inputs"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateMatterPage && onGenerateMatterPage(page);
                          }}
                          className="p-1 text-brand-textMain hover:text-brand-primary hover:bg-brand-primary/10 rounded transition-micro"
                          title="Generate / Re-generate Content"
                        >
                          <Wand2 className="w-3 h-3" />
                        </button>
                        {page.status === 'GENERATED_PENDING_REVIEW' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveMatterPage && onApproveMatterPage(page.id);
                            }}
                            className="p-1 text-brand-info hover:bg-brand-info/20 rounded"
                            title="Approve Content"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

      </div>

      {/* Prominent Chapter Generation Controls */}
      <div className="pt-4 border-t border-brand-border mt-4 space-y-2">
        {activeChapterWritten && (
          <button
            disabled={isGenerating}
            onClick={(e) => handleOpenRewriteModal(activeChapterIndex, e)}
            className="w-full py-2.5 px-4 bg-brand-bg hover:bg-brand-border border border-brand-border text-brand-surfaceText rounded-xl font-bold text-xs transition-micro flex items-center justify-center space-x-2 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-brand-accent" />
            <span>Regenerate Chapter {activeChapterIndex + 1}</span>
          </button>
        )}

        {nextUnwrittenChapter && (
          <button
            disabled={isGenerating}
            onClick={(e) =>
              handleOpenRewriteModal(getChapterIndex(nextUnwrittenChapter), e)
            }
            className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 text-white rounded-xl shadow font-bold text-xs transition-micro flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-brand-accent" />
            <span>Draft Chapter {nextUnwrittenChapter.chapterNumber}</span>
          </button>
        )}
      </div>

      {/* Accessible Chapter Rewrite Modal */}
      <Modal
        isOpen={rewriteTargetIndex !== null}
        onClose={() => setRewriteTargetIndex(null)}
        title={`Chapter ${(rewriteTargetIndex || 0) + 1} Generation Directions`}
        subtitle={
          selectedChapterObj?.title
            ? `Target: "${selectedChapterObj.title}"`
            : "Configure word count, custom directions, and writing style settings"
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-accent">
              Minimum Required Word Count
            </label>
            <select
              value={minWordCount}
              onChange={(e) => setMinWordCount(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-brand-primary transition-micro font-sans cursor-pointer"
            >
              <option value="500">500 Words (Short Chapter)</option>
              <option value="800">800 Words (Standard Chapter)</option>
              <option value="1000">1,000 Words (Recommended)</option>
              <option value="1200">1,200 Words (Detailed Chapter)</option>
              <option value="1500">1,500 Words (Comprehensive Chapter)</option>
              <option value="2000">2,000 Words (Deep Dive Chapter)</option>
              <option value="2500">2,500 Words (Extended Chapter)</option>
              <option value="3000">3,000 Words (In-Depth Chapter)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-accent">
              Custom Directions (Optional)
            </label>
            <textarea
              rows={3}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Make this chapter more concise, add a real-world case study, or use a conversational tone..."
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-sans resize-none"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-brand-border">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-accent" />
                <span className="font-semibold text-brand-surfaceText">
                  Writing Style
                </span>
              </div>
              <div className="flex bg-brand-bg p-0.5 rounded-lg border border-brand-border">
                <button
                  type="button"
                  onClick={() => setHumanizeOverride(null)}
                  className={`px-2 py-1 text-[10px] rounded font-semibold transition-micro ${
                    humanizeOverride === null
                      ? "bg-brand-primary text-white"
                      : "text-brand-textMuted"
                  }`}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => setHumanizeOverride(true)}
                  className={`px-2 py-1 text-[10px] rounded font-semibold transition-micro ${
                    humanizeOverride === true
                      ? "bg-brand-accent text-brand-surface font-bold"
                      : "text-brand-textMuted"
                  }`}
                >
                  ON
                </button>
                <button
                  type="button"
                  onClick={() => setHumanizeOverride(false)}
                  className={`px-2 py-1 text-[10px] rounded font-semibold transition-micro ${
                    humanizeOverride === false
                      ? "bg-brand-danger text-white"
                      : "text-brand-textMuted"
                  }`}
                >
                  OFF
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-border">
            <button
              type="button"
              onClick={() =>
                handleExecuteRewrite({
                  customInstruction: null,
                  humanizeOverride: null,
                  minWordCount: minWordCount ? Number(minWordCount) : null,
                })
              }
              className="px-3 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-surfaceText transition-micro cursor-pointer"
            >
              1-Click Draft
            </button>
            <button
              type="button"
              onClick={() => handleExecuteRewrite()}
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold rounded-xl transition-micro shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
              <span>Generate Chapter</span>
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
