import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, BookOpen } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { ProjectCard } from '../components/dashboard/ProjectCard';
import { NewBookWizard } from '../components/dashboard/NewBookWizard';
import client from '../api/client';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await client.get('/projects');
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (id) => {
    try {
      const response = await client.delete(`/projects/${id}`);
      if (response.data.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      alert(`Failed to delete book project: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <Navbar />

      <main className="max-w-7xl mx-auto py-12 px-6">
        {/* Title Action Section */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
              My Manuscripts
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select or configure AI generated books and layouts
            </p>
          </div>

          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create with AI Swarm</span>
          </button>
        </div>

        {/* Projects Explorer */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="animate-spin h-8 w-8 text-indigo-500 mb-4" />
            <p className="text-sm font-medium">Checking available manuscripts...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center max-w-2xl mx-auto shadow-sm select-none">
            <div className="inline-flex bg-slate-50 dark:bg-slate-900 p-4 rounded-full text-slate-400 mb-4">
              <BookOpen className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-250 mb-1 font-serif">
              No Manuscripts Found
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              You haven't initialized any book workspace yet. Use the wizard to generate a manuscript outline.
            </p>
            <button
              onClick={() => setWizardOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow font-semibold text-sm"
            >
              Start New Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onClick={() => navigate(`/studio/${proj.id}`)}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </main>

      {/* New Book wizard Modal overlay */}
      {wizardOpen && (
        <NewBookWizard
          onClose={() => setWizardOpen(false)}
          onComplete={(projectId) => {
            setWizardOpen(false);
            navigate(`/studio/${projectId}`);
          }}
        />
      )}
    </div>
  );
}
