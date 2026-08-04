import React from 'react';
import { Book, Trash2, Calendar } from 'lucide-react';

export function ProjectCard({ project, onClick, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'outline_pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
      case 'in_progress': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'outline_pending': return 'Outline Pending';
      case 'in_progress': return 'Writing In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.01] flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Book className="w-6 h-6" />
          </div>
          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-all opacity-0 group-hover:opacity-100"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all font-serif mb-2 line-clamp-2">
          {project.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 capitalize">
            {project.genre}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
            {project.trimSize}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
            {project.languageLocale}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-900 mt-4 text-xs text-slate-400">
        <span className={`px-2 py-0.5 border rounded-full font-medium ${getStatusColor(project.status)}`}>
          {getStatusLabel(project.status)}
        </span>
        <div className="flex items-center space-x-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
}
