const fs = require('fs');

function replaceAll(file, replacements) {
    let content = fs.readFileSync(file, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.from, r.to);
    }
    fs.writeFileSync(file, content, 'utf8');
}

// BookEditor.jsx
replaceAll('c:\\Users\\PSO\\Desktop\\Book_publishing\\kdp_app_final\\frontend\\src\\components\\editor\\BookEditor.jsx', [
    { from: /import \{ Play, Pause, Square, ChevronRight, Wand2, RefreshCw, AlertTriangle, Check, Settings, Sparkles \} from 'lucide-react';/g, to: "import { Play, Pause, Stop, CaretRight, MagicWand, ArrowClockwise, Warning, Check, GearSix, Sparkle } from '@phosphor-icons/react';" },
    { from: /<RefreshCw /g, to: "<ArrowClockwise " },
    { from: /<AlertTriangle /g, to: "<Warning " },
    { from: /<Settings /g, to: "<GearSix " },
    { from: /<Wand2 /g, to: "<MagicWand " },
    { from: /<Check /g, to: "<Check " },
    { from: /<Sparkles /g, to: "<Sparkle " },
    { from: /<Play /g, to: "<Play " },
    { from: /<Pause /g, to: "<Pause " },
    { from: /<Square /g, to: "<Stop " },
    
    // AI labels
    { from: /AI Diagram/g, to: "Diagram" },
    { from: /AI Concept Diagram/g, to: "Concept Diagram" },
    { from: /AI Humanizer/g, to: "Natural Tone" },
    { from: /AI Architect/g, to: "Outline" },
    { from: /Regenerating outline with AI Architect.../g, to: "Regenerating outline..." },
    { from: /AI writing Chapter/g, to: "Writing Chapter" },
    { from: /\(Writer -> Editor -> Auditor pipeline\)/g, to: "(Drafting -> Editing -> Reviewing)" },

    // Tailwind
    { from: /bg-amber-500\/10/g, to: "bg-brand-warning/10" },
    { from: /border-amber-500\/30/g, to: "border-brand-warning/30" },
    { from: /text-amber-400/g, to: "text-brand-warning" },
    { from: /text-amber-300/g, to: "text-brand-warning" },

    { from: /bg-white dark:bg-slate-950/g, to: "bg-brand-surface" },
    { from: /border-slate-200\/60 dark:border-slate-800/g, to: "border-brand-border" },
    { from: /border-slate-100 dark:border-slate-900/g, to: "border-brand-border" },
    { from: /border-slate-200 dark:border-slate-800/g, to: "border-brand-border" },
    { from: /text-indigo-500/g, to: "text-brand-primary" },
    { from: /text-slate-900 dark:text-slate-100/g, to: "text-brand-surfaceText" },
    { from: /bg-slate-100 dark:bg-slate-900/g, to: "bg-brand-bg" },
    { from: /bg-indigo-600 hover:bg-indigo-700/g, to: "bg-brand-primary hover:bg-brand-primaryHover transition-micro" },
    { from: /bg-indigo-600/g, to: "bg-brand-primary transition-micro" },
    { from: /bg-emerald-600 hover:bg-emerald-700/g, to: "bg-brand-info hover:bg-brand-info/80 transition-micro" },
    { from: /text-emerald-600 bg-emerald-50 dark:bg-emerald-950\/40/g, to: "text-brand-info bg-brand-info/10" },
    { from: /border-emerald-200 dark:border-emerald-900/g, to: "border-brand-info/30" },
    { from: /bg-slate-50 dark:bg-slate-900\/50/g, to: "bg-brand-bg/50" },
    { from: /border-slate-300 dark:border-slate-700/g, to: "border-brand-border" },
    { from: /text-slate-400/g, to: "text-brand-textMuted" },
    { from: /text-slate-300 dark:text-slate-700/g, to: "text-brand-borderStrong" },
    { from: /text-\[17px\] leading-relaxed font-serif outline-none p-4 rounded-xl hover:bg-slate-50\/50 focus:bg-slate-50\/80 dark:hover:bg-slate-900\/50/g, to: "text-[17px] leading-relaxed font-serif outline-none p-4 rounded-xl hover:bg-brand-bg focus:bg-brand-bg/80 transition-micro" },
    { from: /text-slate-350 dark:text-slate-600/g, to: "text-brand-textMuted" },
    { from: /text-slate-600 dark:text-slate-400/g, to: "text-brand-textMuted" },
    { from: /hover:bg-slate-200 dark:hover:bg-slate-800/g, to: "hover:bg-brand-border" },
    { from: /text-slate-700 dark:text-slate-300/g, to: "text-brand-textMain" },
    { from: /bg-slate-200 dark:bg-slate-800/g, to: "bg-brand-border" },
    { from: /accent-indigo-600/g, to: "accent-brand-primary" },
    { from: /focus:border-indigo-500/g, to: "focus:border-brand-primary transition-micro" },
    { from: /transition-all/g, to: "transition-micro" }
]);

// Toolbar.jsx
replaceAll('c:\\Users\\PSO\\Desktop\\Book_publishing\\kdp_app_final\\frontend\\src\\components\\editor\\Toolbar.jsx', [
    { from: /import \{\s*Moon, Sun, ArrowLeft, Download, RotateCw, AlignJustify, AlignLeft, \s*AlignCenter, Heading2, Heading3, Quote, Indent, ImagePlus, PieChart, X, ChevronDown\s*\} from 'lucide-react';/g, to: "import { Moon, Sun, ArrowLeft, DownloadSimple as Download, ArrowClockwise as RotateCw, TextAlignJustify as AlignJustify, TextAlignLeft as AlignLeft, TextAlignCenter as AlignCenter, TextHTwo as Heading2, TextHThree as Heading3, Quotes as Quote, TextIndent as Indent, Image as ImagePlus, ChartPie as PieChart, X, CaretDown as ChevronDown } from '@phosphor-icons/react';" },
    { from: /AI Generate Diagram/g, to: "Generate Diagram" },
    { from: /Insert AI Diagram/g, to: "Insert Diagram" },
    { from: /bg-amber-400/g, to: "bg-brand-warning" },
    { from: /bg-rose-500/g, to: "bg-brand-danger" },
    { from: /bg-emerald-400/g, to: "bg-brand-info" }
]);

// Sidebar.jsx
replaceAll('c:\\Users\\PSO\\Desktop\\Book_publishing\\kdp_app_final\\frontend\\src\\components\\studio\\Sidebar.jsx', [
    { from: /import \{\s*FileText,\s*Wand2,\s*Sparkles,\s*CheckCircle2,\s*Sliders,\s*RotateCw,\s*ChevronDown,\s*ChevronRight,\s*Settings,\s*Check,\s*Plus\s*\} from "lucide-react";/g, to: "import { FileText, MagicWand as Wand2, Sparkle as Sparkles, CheckCircle as CheckCircle2, SlidersHorizontal as Sliders, ArrowClockwise as RotateCw, CaretDown as ChevronDown, CaretRight as ChevronRight, GearSix as Settings, Check, Plus } from \"@phosphor-icons/react\";" },
    { from: /AI Humanizer Mode/g, to: "Writing Style" },
    { from: /AI humanizer settings/g, to: "writing style settings" },
    { from: /AI Humanizer/g, to: "Writing Style" },
    
    { from: /text-emerald-400 bg-emerald-500\/10 px-1\.5 py-0\.5 rounded border border-emerald-500\/30/g, to: "text-brand-info bg-brand-info/10 px-1.5 py-0.5 rounded border border-brand-info/30" },
    { from: /text-amber-400 bg-amber-500\/10 px-1\.5 py-0\.5 rounded border border-amber-500\/30/g, to: "text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded border border-brand-warning/30" },
    { from: /bg-rose-600/g, to: "bg-brand-danger" },
    { from: /text-slate-950/g, to: "text-brand-surface" },
    
    { from: /text-emerald-400/g, to: "text-brand-info" },
    { from: /hover:bg-emerald-500\/20/g, to: "hover:bg-brand-info/20" }
]);
