import React from 'react';
import type { UploadSummary } from '../services/types';
import './ProjectUploadsList.css';

interface ProjectUploadsListProps {
  uploads: UploadSummary[];
}

const formatDateTime = (value?: string) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ProjectUploadsList: React.FC<ProjectUploadsListProps> = ({ uploads }) => {
  return (
    <section className="artifact-section">
      <div className="artifact-header">
        <h3>Uploaded files</h3>
        <span className="artifact-count">{uploads.length}</span>
      </div>
      <div className="artifact-list">
        {uploads.map((upload) => (
          <div key={upload.plan_id} className="artifact-row">
            <div>
              <div className="artifact-title">{upload.file_name}</div>
              <div className="artifact-meta">{formatDateTime(upload.uploaded_at)}</div>
            </div>
            <span className="artifact-status">{upload.status_label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
