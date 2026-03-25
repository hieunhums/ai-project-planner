import React, { useState } from 'react';
import './ProjectCreateModal.css';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onCreate(trimmed);
      setName('');
      setError(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Create a new project</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="modal-subtitle">
          Give your project a clear name so it is easy to find later.
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
          <label htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g., Shipyard Expansion Q2"
            maxLength={255}
            required
          />
          {error && <span className="modal-error">{error}</span>}
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
