import React, { useState, useEffect } from 'react';
import { Notepad, Plus, Trash, PencilSimple, FloppyDisk, X, ArrowClockwise } from '@phosphor-icons/react';
import client from '../../api/client';

export function ProjectNotes({ projectId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchNotes();
    }
  }, [projectId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/notes/${projectId}`);
      if (res.data.success) {
        setNotes(res.data.data);
      }
    } catch (err) {
      console.error('Fetch notes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    try {
      if (editingId) {
        const res = await client.put(`/notes/${editingId}`, { title, content });
        if (res.data.success) {
          setNotes(prev => prev.map(n => n.id === editingId ? res.data.data : n));
        }
      } else {
        const res = await client.post('/notes', { projectId, title, content });
        if (res.data.success) {
          setNotes(prev => [res.data.data, ...prev]);
        }
      }
      handleCancelEdit();
    } catch (err) {
      alert(`Failed to save note: ${err.message}`);
    }
  };

  const handleEditNote = (note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await client.delete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      alert(`Failed to delete note: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-fade-in text-brand-textMain">
      <div className="bg-brand-surface text-brand-surfaceText p-8 rounded-3xl shadow-xl border border-brand-border flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 bg-brand-primary/10 px-3 py-1 rounded-full text-xs text-brand-primary font-bold mb-2">
            <Notepad className="w-3.5 h-3.5" />
            <span className="font-sans">Author Notes Workspace</span>
          </div>
          <h1 className="text-3xl font-bold font-serif">Project Notes & Ideas</h1>
          <p className="text-xs text-brand-textMuted mt-1 font-sans">
            Persist plot points, character arcs, research links, and draft ideas for this manuscript.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Note Form */}
        <form onSubmit={handleSaveNote} className="bg-brand-surface text-brand-surfaceText p-6 rounded-2xl border border-brand-border shadow-md space-y-4">
          <h3 className="text-sm font-bold font-serif text-brand-primary uppercase tracking-wider flex items-center space-x-2">
            {editingId ? <PencilSimple className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{editingId ? 'Edit Note' : 'Create New Note'}</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Note Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 3 Case Study Data"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brand-textMuted mb-1 font-sans">Content / Ideas</label>
            <textarea
              rows={6}
              placeholder="Write detailed notes, quotes, or outline adjustments..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-brand-bg text-brand-textMain border border-brand-border rounded-xl p-3 text-xs outline-none focus:border-brand-primary transition-micro font-sans resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-surfaceText font-sans transition-micro"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-brand-surface text-xs font-bold rounded-xl shadow transition-micro flex items-center space-x-1.5 disabled:opacity-50 font-sans cursor-pointer"
            >
              <FloppyDisk className="w-3.5 h-3.5 text-brand-accent" />
              <span>{editingId ? 'Update Note' : 'Save Note'}</span>
            </button>
          </div>
        </form>

        {/* Note List */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold font-serif text-brand-textMain uppercase tracking-wider">
            Saved Notes ({notes.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-brand-textMuted">
              <ArrowClockwise className="w-6 h-6 animate-spin text-brand-primary mr-2" />
              <span className="text-xs font-sans">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-brand-surface/30 border border-brand-border p-8 rounded-2xl text-center text-brand-textMuted text-xs font-sans">
              No notes saved yet. Use the form on the left to create your first note for this project.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-brand-surface text-brand-surfaceText p-5 rounded-2xl border border-brand-border shadow-md flex flex-col justify-between space-y-3 group transition-micro hover:border-brand-primary/50 hover:shadow-lg">
                  <div>
                    <h4 className="font-bold text-sm font-serif text-brand-surfaceText">{note.title}</h4>
                    <p className="text-xs text-brand-textMuted mt-2 whitespace-pre-wrap leading-relaxed font-sans">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-border pt-3 text-[10px] text-brand-textMuted font-sans">
                    <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-micro">
                      <button onClick={() => handleEditNote(note)} className="p-1 hover:text-brand-primary transition-micro cursor-pointer" title="Edit">
                        <PencilSimple className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:text-brand-danger transition-micro cursor-pointer" title="Delete">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
