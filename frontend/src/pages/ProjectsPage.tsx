import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildProjectPath } from '../routes';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectCreateModal } from '../components/ProjectCreateModal';
import './ProjectsPage.css';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, isLoading, error, createProject, refresh } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              onOpen={() => navigate(buildProjectPath(project.id))}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};
