import React, { useState } from 'react';
import './FileUpload.css';

export interface FileUploadProps {
  projectId: number;
  onUploadSuccess: (planId: number, taskCount: number, resourceCount: number) => void;
  onUploadError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  projectId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      onUploadError(`Invalid file type. Please upload CSV or Excel files (.csv, .xlsx, .xls)`);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      onUploadError('File size exceeds 10MB limit');
      return;
    }

    setFile(selectedFile);
    if (!planName) {
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'));
      setPlanName(nameWithoutExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      onUploadError('Please select a file');
      return;
    }

    if (!planName.trim()) {
      onUploadError('Please enter a plan name');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', planName.trim());
      formData.append('project_id', String(projectId));
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await fetch('http://localhost:8000/api/plans/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const result = await response.json();
      onUploadSuccess(result.plan_id, result.tasks_count, result.resources_count);

      // Reset form
      setFile(null);
      setPlanName('');
      setDescription('');
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <div className="drop-zone-icon">📁</div>
              <p className="drop-zone-text">
                Drag and drop your planning file here, or{' '}
                <label htmlFor="file-input" className="file-input-label">
                  browse
                </label>
              </p>
              <p className="drop-zone-hint">Supported formats: CSV, Excel (.xlsx, .xls)</p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </>
          ) : (
            <div className="file-info">
              <div className="file-icon">📄</div>
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="remove-file-btn"
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="form-fields">
          <div className="form-group">
            <label htmlFor="plan-name">Plan Name *</label>
            <input
              id="plan-name"
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g., Shipyard Construction Q1 2026"
              required
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the plan..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!file || !planName.trim() || isUploading}
        >
          {isUploading ? (
            <>
              <span className="spinner"></span>
              Uploading...
            </>
          ) : (
            'Upload Plan'
          )}
        </button>
      </form>
    </div>
  );
};
