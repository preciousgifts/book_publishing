import React from 'react';
import { MagnifyingGlass, BookOpenText, Notepad, SlidersHorizontal, Question, SignOut, GearSix } from '@phosphor-icons/react';

export function LeftModuleNav({ activeModule, onSelectModule, projectTitle, onLogout, onOpenThemeSettings }) {
  const modules = [
    { id: 'research', label: 'Research\ntopics', icon: MagnifyingGlass },
    { id: 'project', label: 'Book project', icon: BookOpenText },
    { id: 'notes', label: 'Notes', icon: Notepad },
    { id: 'styleguide', label: 'Style guide', icon: SlidersHorizontal },
    { id: 'guide', label: 'App guide', icon: Question }
  ];

  return (
    <aside className="w-64 bg-brand-sidebarBg text-brand-sidebarText flex flex-col justify-between h-screen select-none sticky top-0 z-40 p-4 border-r border-brand-sidebarBorder font-sans">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-1 pt-1">
          <div className="w-10 h-10 rounded-xl bg-brand-sidebarAccent text-brand-sidebarBg font-extrabold text-base flex items-center justify-center shadow-sm flex-shrink-0">
            Sc
          </div>
          <div className="leading-tight">
            <h2 className="font-bold text-base font-serif text-brand-sidebarText tracking-tight">Scriboral</h2>
            <p className="text-xs text-brand-sidebarText/80 font-normal">Publishing suite</p>
          </div>
        </div>

        {/* Active Book Card */}
        <div className="bg-brand-sidebarActive/30 p-4 rounded-2xl border border-brand-sidebarBorder space-y-1">
          <span className="text-[10px] text-brand-sidebarAccent uppercase font-bold tracking-wide block">Active book</span>
          <p className="text-lg font-bold text-white line-clamp-1 font-serif leading-snug">
            {projectTitle || 'Up and beyond'}
          </p>
        </div>

        {/* Modules Navigation */}
        <nav className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-brand-sidebarText/70 px-2 block mb-2">
            Modules
          </span>

          {modules.map((m) => {
            const Icon = m.icon;
            const isActive = activeModule === m.id;

            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-micro group relative overflow-hidden ${
                  isActive
                    ? 'bg-brand-sidebarActive text-white shadow-sm'
                    : 'text-brand-sidebarText/85 hover:bg-brand-sidebarActive/20 hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-sidebarAccent rounded-r-md"></div>
                )}
                <div className="flex items-center space-x-3 text-left">
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-micro ${isActive ? 'text-brand-sidebarAccent' : 'text-brand-sidebarText/60 group-hover:text-brand-sidebarText/80'}`} />
                  <span className="whitespace-pre-line leading-tight">{m.label}</span>
                </div>
                {m.badge && (
                  <span className="bg-brand-sidebarAccent text-brand-sidebarBg text-[10px] font-extrabold px-2 py-0.5 rounded-full lowercase">
                    {m.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout & Settings */}
      <div className="pt-4 border-t border-brand-sidebarBorder space-y-1">
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-brand-sidebarText/80 hover:text-brand-danger hover:bg-brand-sidebarHover/50 rounded-xl transition-micro"
          >
            <SignOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
        {onOpenThemeSettings && (
          <button
            onClick={onOpenThemeSettings}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-brand-sidebarText/80 hover:text-brand-sidebarText hover:bg-brand-sidebarHover/50 rounded-xl transition-micro"
          >
            <GearSix className="w-4 h-4" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </aside>
  );
}
