import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildProjectPath, buildGanttPath } from '../routes';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectCreateModal } from '../components/ProjectCreateModal';
import { YardSummaryDashboard } from '../components/YardSummaryDashboard';
import { useAllPlanData } from '../hooks/useAllPlanData';
import './ProjectsPage.css';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, isLoading, error, createProject, refresh } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: yardData } = useAllPlanData();

  const handleCreate = async (name: string) => {
    const project = await createProject(name);
    navigate(buildProjectPath(project.id));
  };

  const handleDelete = () => {
    refresh();
  };

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div>
          <h1>Projects</h1>
          <p>Pick an existing workspace or start a new one.</p>
        </div>
        <button
          type="button"
          className="project-create-btn"
          onClick={() => setIsModalOpen(true)}
        >
          + New project
        </button>
      </header>

      {isLoading && <div className="projects-status">Loading projects...</div>}
      {error && <div className="projects-error">{error}</div>}

      {!isLoading && projects.length === 0 && (
        <div className="projects-empty">
          <h2>No projects yet</h2>
          <p>Create a project to start uploading planning data.</p>
          <button type="button" onClick={() => setIsModalOpen(true)}>
            + Create your first project
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              createdAt={project.created_at}
              project_type={project.project_type}
              has_plan={(project as any).has_plan}
              onOpen={() => {
                if ((project as any).has_plan) {
                  navigate(buildGanttPath(project.id));
                } else {
                  navigate(buildProjectPath(project.id));
                }
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Yard Overview section */}
      {yardData.length > 0 && (
        <section className="home-yard-section">
          <h2>Yard Capacity Overview</h2>
          <p className="home-yard-subtitle">
            {new Set(yardData.map(r => (r.resource || '').split(' - ')[0]).filter(Boolean)).size} yard groups · {yardData.length} tasks across all projects
          </p>
          <div className="home-yard-card">
            <YardSummaryDashboard
              planData={yardData}
              onDrillDown={() => { navigate('/yard-overview'); }}
              onSelectYard={() => { navigate('/yard-overview'); }}
              selectedYard={null}
            />
          </div>
        </section>
      )}

      <ProjectCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};
