import React, { useState } from 'react';
import './ProjectCard.css';
import { apiClient } from '../services/api';
import { ConfirmDialog } from './ConfirmDialog';

interface ProjectCardProps {
  id: number;
  name: string;
  createdAt?: string;
  project_type?: string;
  has_plan?: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Created recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Created recently';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  createdAt,
  project_type,
  has_plan,
  onOpen,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.deleteProject(id);
      setShowConfirm(false);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setError(null);
  };

  return (
    <div className="project-card-container">
      <button type="button" className="project-card" onClick={onOpen}>
        <div className="project-card-header">
          <div className="project-card-name-row">
            <h3>{name}</h3>
            {project_type === 'enquiry' && (
              <span className="badge badge-enquiry">Enquiry</span>
            )}
          </div>
          <span className="project-card-open">{has_plan ? 'View Plan' : 'Setup'}</span>
        </div>
        <p className="project-card-meta">{formatDate(createdAt)}</p>
      </button>
      <button
        type="button"
        className="project-card-delete"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        title="Delete project"
        aria-label={`Delete ${name}`}
      >
        {isDeleting ? '⏳' : '🗑️'}
      </button>
      {error && <div className="project-card-error">{error}</div>}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete project?"
        message={`Are you sure you want to delete "${name}" and all associated plans? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};
