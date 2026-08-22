import React from 'react';

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-brand-surface border border-brand-border p-6 shadow-sm animate-pulse flex flex-col space-y-4 w-full h-full">
      <div className="h-4 bg-brand-bg rounded w-3/4"></div>
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-brand-bg rounded w-full"></div>
        <div className="h-3 bg-brand-bg rounded w-5/6"></div>
      </div>
      <div className="h-8 bg-brand-bg rounded-lg w-1/3 mt-auto"></div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-3 bg-brand-surface rounded ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="w-64 h-full bg-brand-sidebarBg border-r border-brand-sidebarBorder p-4 flex flex-col space-y-6 animate-pulse">
      <div className="h-8 bg-brand-sidebarAccent/20 rounded-xl w-3/4 mb-6"></div>
      
      <div className="space-y-3">
        <div className="h-10 bg-brand-sidebarAccent/10 rounded-lg w-full"></div>
        <div className="h-10 bg-brand-sidebarAccent/10 rounded-lg w-full"></div>
        <div className="h-10 bg-brand-sidebarAccent/10 rounded-lg w-full"></div>
      </div>

      <div className="mt-auto pt-6 space-y-3">
        <div className="h-10 bg-brand-sidebarAccent/10 rounded-lg w-full"></div>
      </div>
    </div>
  );
}
