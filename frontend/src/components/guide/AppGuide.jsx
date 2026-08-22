import React, { useState } from 'react';
import { 
  BookOpenText, Sparkle, MagnifyingGlass, Stack, PencilSimple, ShieldCheck, DownloadSimple, 
  ArrowRight, CheckCircle, SlidersHorizontal, Notepad, FileText, CaretDown, CaretUp, Star, Medal, Target, WarningCircle
} from '@phosphor-icons/react';

export function AppGuide({ onNavigateModule }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'pipeline' | 'typesetting'

  const fifteenCategories = [
    {
      num: '01',
      title: 'Target Reader Demographic Profiling',
      desc: 'Identifies exact reader age groups, gender distribution, educational background, buying triggers, and target reading literacy level.'
    },
    {
      num: '02',
      title: 'Core Transformation & Value Proposition',
      desc: 'Defines the primary goal of the manuscript and the tangible real-world outcome the reader will achieve after finishing the book.'
    },
    {
      num: '03',
      title: 'Reader Pain Points & Frustrations',
      desc: 'Pinpoints specific problems, unanswered questions, and complaints readers express about current books on the market.'
    },
    {
      num: '04',
      title: 'Target KDP Category Identification',
      desc: 'Maps out primary Amazon book categories and discovers less-competitive niche sub-categories to optimize Best Seller badge potential.'
    },
    {
      num: '05',
      title: 'Amazon BSR Rank & Demand Estimation',
      desc: 'Evaluates Best Seller Rank (BSR) velocity across the top 10 competitor titles to verify real reader purchasing demand.'
    },
    {
      num: '06',
      title: 'Competitor Gap & Content Analysis',
      desc: 'Analyzes weaknesses, outdated information, and missing chapters in existing bestseller offerings to establish content superiority.'
    },
    {
      num: '07',
      title: 'Monetization & Pricing Strategy',
      desc: 'Recommends ideal eBook and Paperback price points, royalty tier positioning (35% vs 70%), and companion workbook opportunities.'
    },
    {
      num: '08',
      title: '7 KDP Backend Search Keywords',
      desc: 'Generates 7 optimized 50-character search keyword strings for maximum Amazon search engine visibility.'
    },
    {
      num: '09',
      title: 'Title & Subtitle Formula Engineering',
      desc: 'Provides catchy, benefit-driven title ideas paired with descriptive subtitles structured for high click-through rates.'
    },
    {
      num: '10',
      title: 'Hook & Cover Visual Direction',
      desc: 'Outlines visual cover trends, color palettes, typography moods, and visual hooks tailored to the genre.'
    },
    {
      num: '11',
      title: 'Table of Contents Structural Blueprint',
      desc: 'Recommends multi-part chapter arrangements, logical progression flows, and topics ignored by competitors.'
    },
    {
      num: '12',
      title: 'Tone, Style & Reading Level Guidance',
      desc: 'Sets recommended writing style (e.g. conversational, formal, authoritative) and grade level for maximum engagement.'
    },
    {
      num: '13',
      title: 'Amazon Content Policy & Legal Check',
      desc: 'Scans for trademark/copyright risks, required disclaimers (financial, medical, educational), and content compliance.'
    },
    {
      num: '14',
      title: 'Evergreen vs. Trend Longevity Analysis',
      desc: 'Assesses whether the topic possesses multi-year evergreen sales potential or represents short-term trend hype.'
    },
    {
      num: '15',
      title: 'Lead Magnet & Reader Incentives',
      desc: 'Recommends downloadable bonus materials, worksheets, and email incentives to convert readers into long-term fans.'
    }
  ];

  const pipelineStages = [
    {
      stage: 'Stage 1',
      title: 'Drafting Stage (Prose Generation)',
      desc: 'Generates structured prose chapter-by-chapter. Enforces minimum word counts, integrates style guide rules, and applies the Writing Style parameters to ensure varied sentence lengths, natural rhythm, and professional phrasing.'
    },
    {
      stage: 'Stage 2',
      title: 'Editorial Stage (Stylistic Polishing)',
      desc: 'Reviews generated prose for grammatical flow, paragraph transitions, formatting consistency, subheadings, and formatting controls.'
    },
    {
      stage: 'Stage 3',
      title: 'Fact & Logic Auditor Stage',
      desc: 'Scans technical claims, historical dates, internal continuity, and citations to eliminate inaccuracies before final manuscript lock.'
    }
  ];

  const typesettingDetails = [
    {
      title: 'Print Trim Size Compliance',
      desc: 'Supports standard KDP paperback trim sizes including 6" x 9", 5.5" x 8.5", and 5" x 8" with precise gutter margins for physical print binding.'
    },
    {
      title: 'Micro-Typographic Layout',
      desc: 'Implements justified text alignment (text-align: justify), 0.25in first-line paragraph indents, Heading 1 & Heading 2 styling, and indented blockquotes.'
    },
    {
      title: 'Vector Diagrams & Figure Embeds',
      desc: 'Generates vector SVGs (flowcharts, bar charts, concept maps) and embeds high-resolution figure images with numbered captions into DOCX and PDF exports.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8 animate-fade-in text-brand-textMain">
      {/* Header Banner */}
      <div className="bg-brand-surface p-8 md:p-10 rounded-[28px] border border-brand-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 bg-brand-primary/10 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-primary font-sans">
            <Sparkle className="w-4 h-4 text-brand-primary" />
            <span>Scriboral Comprehensive Guide</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-normal text-brand-textMain tracking-tight">
            How Scriboral Works
          </h1>
          <p className="text-sm md:text-base text-brand-textMuted max-w-2xl leading-relaxed font-sans">
            Scriboral combines 15-category market intelligence, a 3-stage writing process, and print-ready typesetting to turn book concepts into published KDP titles.
          </p>
        </div>

        <button
          onClick={() => onNavigateModule('research')}
          className="px-6 py-3.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface font-bold rounded-2xl shadow-sm transition-micro flex items-center space-x-2 flex-shrink-0 cursor-pointer font-sans"
        >
          <MagnifyingGlass className="w-4 h-4 text-brand-accent" />
          <span>Start Topic Research</span>
          <ArrowRight className="w-4 h-4 text-brand-accent" />
        </button>
      </div>

      {/* Navigation Tabs for In-Depth Explanations */}
      <div className="bg-brand-surface p-8 rounded-[28px] border border-brand-border shadow-sm space-y-6">
        <div className="flex flex-wrap gap-3 border-b border-brand-border pb-4 font-sans">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-micro cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-brand-primary text-brand-surface shadow-sm'
                : 'bg-brand-bg text-brand-textMain hover:bg-brand-border'
            }`}
          >
            The 15-Category Market Intelligence
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-micro cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-brand-primary text-brand-surface shadow-sm'
                : 'bg-brand-bg text-brand-textMain hover:bg-brand-border'
            }`}
          >
            3-Stage Writing Process
          </button>
          <button
            onClick={() => setActiveTab('typesetting')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-micro cursor-pointer ${
              activeTab === 'typesetting'
                ? 'bg-brand-primary text-brand-surface shadow-sm'
                : 'bg-brand-bg text-brand-textMain hover:bg-brand-border'
            }`}
          >
            Print-Ready Typesetting
          </button>
        </div>

        {/* Tab 1: Detailed 15 Categories Breakdown */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-textMain">
                The 15 Categories of KDP Market Intelligence
              </h2>
              <p className="text-xs text-brand-textMuted mt-1 leading-relaxed font-sans">
                Before generating an outline or writing a single word, Scriboral runs web search signals across 15 KDP publishing parameters to ensure market profitability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fifteenCategories.map((cat) => (
                <div key={cat.num} className="bg-brand-bg p-5 rounded-2xl border border-brand-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold bg-brand-primary text-brand-bg px-2.5 py-0.5 rounded-full font-sans">
                      Category {cat.num}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-sm text-brand-textMain leading-tight">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-brand-textMuted leading-relaxed font-sans">
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: 3-Stage Writing Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-textMain">
                The 3-Stage Writing Process
              </h2>
              <p className="text-xs text-brand-textMuted mt-1 leading-relaxed font-sans">
                Every chapter is generated through a rigorous multi-stage workflow to ensure high-quality prose, logical continuity, and factual accuracy.
              </p>
            </div>

            <div className="space-y-4">
              {pipelineStages.map((stg, idx) => (
                <div key={idx} className="bg-brand-bg p-6 rounded-2xl border border-brand-border flex flex-col md:flex-row items-start md:items-center gap-4">
                  <span className="font-serif font-extrabold text-sm bg-brand-primary text-brand-bg px-3.5 py-1.5 rounded-xl flex-shrink-0">
                    {stg.stage}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base text-brand-textMain">
                      {stg.title}
                    </h3>
                    <p className="text-xs text-brand-textMuted leading-relaxed font-sans">
                      {stg.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Print-Ready Typesetting */}
        {activeTab === 'typesetting' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-textMain">
                Automated Print-Ready Typesetting
              </h2>
              <p className="text-xs text-brand-textMuted mt-1 leading-relaxed font-sans">
                Scriboral formats your manuscript directly according to official Amazon KDP interior formatting guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {typesettingDetails.map((item, idx) => (
                <div key={idx} className="bg-brand-bg p-5 rounded-2xl border border-brand-border space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary text-brand-bg flex items-center justify-center font-bold text-xs font-sans">
                    {idx + 1}
                  </div>
                  <h3 className="font-serif font-bold text-sm text-brand-textMain">
                    {item.title}
                  </h3>
                  <p className="text-xs text-brand-textMuted leading-relaxed font-sans">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
