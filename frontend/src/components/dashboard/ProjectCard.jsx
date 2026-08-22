import React from 'react';
import { Book, Trash, Calendar, ArrowRight } from '@phosphor-icons/react';

export function ProjectCard({ project, onClick, onDelete, delay = 0 }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'outline_pending': 
        return { 
          label: 'Outline Pending', 
          cls: 'bg-brand-warning/10 text-brand-warning border-brand-warning/30' 
        };
      case 'in_progress': 
        return { 
          label: 'Writing In Progress', 
          cls: 'bg-brand-info/10 text-brand-info border-brand-info/30' 
        };
      case 'completed': 
        return { 
          label: 'Completed', 
          cls: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' 
        };
      default: 
        return { 
          label: status, 
          cls: 'bg-brand-bg text-brand-textMuted border-brand-border' 
        };
    }
  };

  const badge = getStatusBadge(project.status);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(project);
  };

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group bg-brand-surface text-brand-surfaceText border border-brand-border hover:border-brand-accent rounded-3xl p-6 cursor-pointer shadow-md hover:shadow-xl transition-micro hover:-translate-y-0.5 flex flex-col justify-between select-none relative overflow-hidden animate-fade-in"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl border border-brand-border shadow-xs">
            <Book className="w-6 h-6" />
          </div>
          <button
            onClick={handleDelete}
            className="text-brand-textMuted hover:text-brand-danger p-2 rounded-xl hover:bg-brand-danger/10 transition-micro opacity-0 group-hover:opacity-100"
            title="Delete Project"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold font-serif text-brand-textMain group-hover:text-brand-accent transition-micro line-clamp-2 leading-snug">
            {project.title}
          </h3>
          <p className="text-xs text-brand-textMuted mt-1 font-sans font-medium">
            Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 font-sans">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-bg text-brand-textMain border border-brand-border capitalize">
            {project.genre}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-bg text-brand-textMain border border-brand-border">
            {project.trimSize}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-bg text-brand-textMain border border-brand-border">
            {project.languageLocale}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-brand-border mt-6 text-xs font-sans">
        <span className={`px-3 py-1 border rounded-full text-xs font-bold ${badge.cls}`}>
          {badge.label}
        </span>

        <div className="flex items-center space-x-1 text-brand-primary font-bold group-hover:translate-x-1 transition-micro">
          <span>Open Book</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
