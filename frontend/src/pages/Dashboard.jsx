import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowClockwise, BookOpenText } from "@phosphor-icons/react";
import { LeftModuleNav } from "../components/layout/LeftModuleNav";
import { ProjectCard } from "../components/dashboard/ProjectCard";
import { NewBookWizard } from "../components/dashboard/NewBookWizard";
import { TopicResearch } from "../components/research/TopicResearch";
import { ProjectNotes } from "../components/notes/ProjectNotes";
import { ProjectStyleGuide } from "../components/styleguide/ProjectStyleGuide";
import { AppGuide } from "../components/guide/AppGuide";
import { ThemeSettingsModal } from "../components/common/ThemeSettingsModal";
import { SkeletonCard } from "../components/common/SkeletonLoader";
import { Modal } from "../components/common/Modal";
import client from "../api/client";

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState("project"); // 'research' | 'project' | 'notes' | 'styleguide'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [deleteProjectTitle, setDeleteProjectTitle] = useState("");
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await client.get("/projects");
      if (response.data.success) {
        setProjects(response.data.data);
        if (response.data.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects list:", error);
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
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (selectedProjectId === id) {
          setSelectedProjectId(null);
        }
      }
    } catch (error) {
      alert(`Failed to delete book project: ${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-textMain transition-micro select-none font-sans">
      {/* 1. Top-Level Left Module Navigation */}
      <LeftModuleNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        projectTitle={activeProject?.title}
        onLogout={handleLogout}
        onOpenThemeSettings={() => setThemeSettingsOpen(true)}
      />

      {/* 2. Main Workspace Body */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {activeModule === "research" && (
          <TopicResearch
            activeProject={activeProject}
            onUseInOutline={(data) => {
              navigate(`/studio/${data.projectId}`);
            }}
          />
        )}

        {activeModule === "notes" && (
          <ProjectNotes projectId={activeProject?.id} />
        )}

        {activeModule === "styleguide" && (
          <ProjectStyleGuide projectId={activeProject?.id} />
        )}

        {activeModule === "guide" && (
          <AppGuide onNavigateModule={setActiveModule} />
        )}

        {activeModule === "project" && (
          <div className="max-w-7xl mx-auto py-12 px-8 space-y-8 animate-fade-in">
            {/* Title & Action Section */}
            <div className="flex items-center justify-between border-b border-brand-border pb-6">
              <div>
                <h1 className="text-3xl font-extrabold font-serif text-brand-surfaceText">
                  My Book Projects
                </h1>
                <p className="text-xs text-brand-textMuted mt-1 font-sans">
                  Manage manuscripts and publish KDP editions.
                </p>
              </div>

              <button
                onClick={() => setWizardOpen(true)}
                className="flex items-center space-x-2 px-5 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl shadow-md font-bold text-xs transition-micro cursor-pointer"
              >
                <Plus className="w-4 h-4 text-brand-accent" />
                <span>Start New Book</span>
              </button>
            </div>

            {/* Projects Explorer */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-brand-surface text-brand-surfaceText border border-brand-border rounded-3xl p-16 text-center max-w-2xl mx-auto shadow-md">
                <div className="inline-flex bg-brand-bg p-4 rounded-full text-brand-accent mb-4 border border-brand-border">
                  <BookOpenText className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-brand-surfaceText mb-1 font-serif">
                  No Manuscripts Found
                </h3>
                <p className="text-xs text-brand-textMuted mb-6 max-w-sm mx-auto leading-relaxed font-sans">
                  You haven't initialized any book workspace yet. Use the wizard
                  to generate a manuscript outline.
                </p>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primaryHover text-white rounded-xl shadow font-semibold text-xs transition-micro"
                >
                  Start New Book
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj, idx) => (
                  <ProjectCard
                    key={proj.id}
                    project={proj}
                    delay={idx * 100}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      navigate(`/studio/${proj.id}`);
                    }}
                    onDelete={(projectObj) => {
                      setDeleteProjectId(projectObj.id);
                      setDeleteProjectTitle(projectObj.title);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Book Wizard Modal */}
      {wizardOpen && (
        <NewBookWizard
          onClose={() => setWizardOpen(false)}
          onComplete={(projectId) => {
            setWizardOpen(false);
            navigate(`/studio/${projectId}`);
          }}
        />
      )}

      {themeSettingsOpen && (
        <ThemeSettingsModal 
          isOpen={themeSettingsOpen}
          onClose={() => setThemeSettingsOpen(false)} 
        />
      )}

      {/* Delete Project Confirmation Modal */}
      {deleteProjectId && (
        <Modal
          isOpen={!!deleteProjectId}
          onClose={() => { setDeleteProjectId(null); setDeleteProjectTitle(""); }}
          title="Delete Book Project"
          subtitle="This action cannot be undone. All drafts, research notes, and settings will be permanently lost."
          maxWidth="max-w-md"
        >
          <div className="space-y-6 pt-2 font-sans">
            <p className="text-sm text-brand-textMain leading-relaxed">
              Are you sure you want to delete the manuscript <strong className="font-semibold text-brand-primary">"{deleteProjectTitle}"</strong>?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteProjectId(null); setDeleteProjectTitle(""); }}
                className="px-4 py-2 text-xs font-semibold text-brand-textMuted hover:text-brand-textMain transition-micro cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteProject(deleteProjectId);
                  setDeleteProjectId(null);
                  setDeleteProjectTitle("");
                }}
                className="px-5 py-2.5 bg-brand-danger hover:bg-brand-dangerHover text-white text-xs font-bold rounded-xl shadow transition-micro cursor-pointer"
              >
                Delete Manuscript
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
