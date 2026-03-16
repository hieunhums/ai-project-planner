import React, { useRef } from 'react';
import './ProjectDetailsForm.css';
import { Spinner } from './Spinner';
import type { UseProjectDetailsReturn } from '../hooks/useProjectDetails';
import type { SaveProjectDetailsResponse } from '../services/api';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

const LOCATION_OPTIONS = [
  'China',
  'Singapore',
  'Batam',
  'USA',
];

const YARD_OPTIONS = [
  'Tuas Boulevard',
  'Admiralty',
  'Benoi',
  'Pioneer',
  'Tuas',
];

const PROCESS_OPTIONS = [
  { id: 'dry_dock', label: 'Drydock' },
  { id: 'berthing', label: 'Berthing' },
  { id: 'grand_assembly', label: 'Grand Assembly' },
  { id: 'loadout', label: 'Loadout' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectDetailsFormProps {
  hook: UseProjectDetailsReturn;
  /** Page-level submit handler invoked after the hook's handleSubmit resolves */
  onGenerateOptions: (result: SaveProjectDetailsResponse) => Promise<void>;
  /** Disables the submit button while an external async operation is in-flight */
  isExternallyDisabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({
  hook,
  onGenerateOptions,
  isExternallyDisabled = false,
}) => {
  const {
    formValues,
    setField,
    isValid,
    isSaving,
    fileErrors,
    fileInfo,
    handleRefFileUpload,
    handleHumanPlanUpload,
    handleSubmit,
  } = hook;

  const refFileInputRef = useRef<HTMLInputElement>(null);
  const humanPlanFileInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleProcessToggle = (processId: string) => {
    const current = formValues.processes;
    const updated = current.includes(processId)
      ? current.filter((p) => p !== processId)
      : [...current, processId];
    setField('processes', updated);
  };

  const handleRefChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleRefFileUpload(file);
    // reset input so same file can be re-selected after an error
    e.target.value = '';
  };

  const handleHumanPlanChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleHumanPlanUpload(file);
    e.target.value = '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSaving || isExternallyDisabled) return;
    const result = await handleSubmit();
    if (result !== null) {
      await onGenerateOptions(result);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <form
      className="project-details-form"
      onSubmit={handleFormSubmit}
      noValidate
      aria-label="Project details form"
    >
      {/* ---- Section 1: Project Data ---- */}
      <fieldset className="form-section">
        <legend className="form-section-legend">Project Data</legend>

        {/* Project type */}
        <div className="form-field">
          <label className="form-label">Project type</label>
          <div className="radio-group">
            {(['enquiry', 'confirmed'] as const).map((type) => (
              <label key={type} className="radio-label">
                <input
                  type="radio"
                  name="project_type"
                  value={type}
                  checked={formValues.project_type === type}
                  onChange={() => setField('project_type', type)}
                />
                <span className="radio-text">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Project name */}
        <div className="form-field">
          <label htmlFor="project_name" className="form-label">
            Project name <span className="required">*</span>
          </label>
          <input
            id="project_name"
            type="text"
            className="form-input"
            value={formValues.project_name}
            onChange={(e) => setField('project_name', e.target.value)}
            placeholder="Enter project name"
            required
          />
        </div>

        {/* Dates */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="start_date" className="form-label">
              Start date <span className="required">*</span>
            </label>
            <input
              id="start_date"
              type="date"
              className="form-input"
              value={formValues.start_date}
              onChange={(e) => setField('start_date', e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="end_date" className="form-label">
              End date <span className="required">*</span>
            </label>
            <input
              id="end_date"
              type="date"
              className="form-input"
              value={formValues.end_date}
              onChange={(e) => setField('end_date', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Hull dimensions */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="hull_length" className="form-label">
              Hull length (m) <span className="required">*</span>
            </label>
            <input
              id="hull_length"
              type="number"
              min="0"
              step="0.1"
              className="form-input"
              value={formValues.hull_length}
              onChange={(e) => setField('hull_length', e.target.value)}
              placeholder="e.g. 200"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="hull_width" className="form-label">
              Hull width (m) <span className="required">*</span>
            </label>
            <input
              id="hull_width"
              type="number"
              min="0"
              step="0.1"
              className="form-input"
              value={formValues.hull_width}
              onChange={(e) => setField('hull_width', e.target.value)}
              placeholder="e.g. 40"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="hull_height" className="form-label">
              Hull height (m) <span className="required">*</span>
            </label>
            <input
              id="hull_height"
              type="number"
              min="0"
              step="0.1"
              className="form-input"
              value={formValues.hull_height}
              onChange={(e) => setField('hull_height', e.target.value)}
              placeholder="e.g. 30"
              required
            />
          </div>
        </div>

        {/* Topside weight */}
        <div className="form-field form-field--half">
          <label htmlFor="topside_weight" className="form-label">
            Topside weight (t) <span className="required">*</span>
          </label>
          <input
            id="topside_weight"
            type="number"
            min="0"
            step="0.1"
            className="form-input"
            value={formValues.topside_weight}
            onChange={(e) => setField('topside_weight', e.target.value)}
            placeholder="e.g. 5000"
            required
          />
        </div>
      </fieldset>

      {/* ---- Section 2: Planning Preferences ---- */}
      <fieldset className="form-section">
        <legend className="form-section-legend">Planning Preferences</legend>

        {/* Block breakdown */}
        <div className="form-field">
          <label htmlFor="block_breakdown" className="form-label">
            Block breakdown <span className="required">*</span>
          </label>
          <textarea
            id="block_breakdown"
            className="form-textarea"
            value={formValues.block_breakdown}
            onChange={(e) => setField('block_breakdown', e.target.value)}
            placeholder="Describe the block breakdown strategy…"
            rows={3}
            required
          />
        </div>

        {/* Location + Yard */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="preferred_location" className="form-label">
              Preferred location <span className="required">*</span>
            </label>
            <select
              id="preferred_location"
              className="form-select"
              value={formValues.preferred_location}
              onChange={(e) => setField('preferred_location', e.target.value)}
              required
            >
              <option value="">Select location…</option>
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="preferred_yard" className="form-label">
              Preferred yard <span className="required">*</span>
            </label>
            <select
              id="preferred_yard"
              className="form-select"
              value={formValues.preferred_yard}
              onChange={(e) => setField('preferred_yard', e.target.value)}
              required
            >
              <option value="">Select yard…</option>
              {YARD_OPTIONS.map((yard) => (
                <option key={yard} value={yard}>
                  {yard}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Processes checkboxes */}
        <div className="form-field">
          <span className="form-label">
            Processes <span className="required">*</span>
          </span>
          <div className="checkbox-grid">
            {PROCESS_OPTIONS.map((proc) => (
              <label key={proc.id} className="checkbox-label">
                <input
                  type="checkbox"
                  value={proc.id}
                  checked={formValues.processes.includes(proc.id)}
                  onChange={() => handleProcessToggle(proc.id)}
                />
                <span className="checkbox-text">{proc.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* ---- Section 3: File Uploads ---- */}
      <fieldset className="form-section">
        <legend className="form-section-legend">Reference Files</legend>

        {/* Project reference CSV */}
        <div className="form-field">
          <label className="form-label">
            Project reference CSV <span className="required">*</span>
          </label>
          <p className="form-help">
            Required columns: project_id, project_name, duration_days, start_date, end_date,
            resource, dependencies, cost, priority
          </p>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Upload project reference CSV"
            onClick={() => refFileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && refFileInputRef.current?.click()}
          >
            <input
              ref={refFileInputRef}
              type="file"
              accept=".csv"
              className="file-input-hidden"
              onChange={handleRefChange}
              aria-hidden="true"
            />
            {fileInfo.project_ref?.valid ? (
              <div className="file-upload-success">
                <span className="file-icon">✓</span>
                <span className="file-name">{fileInfo.project_ref.filename}</span>
                <span className="file-meta">{fileInfo.project_ref.rowCount} row(s)</span>
              </div>
            ) : (
              <span className="file-placeholder">
                {fileErrors.project_ref ? '⚠ Re-upload file' : 'Click to upload .csv'}
              </span>
            )}
          </div>
          {fileErrors.project_ref && (
            <p className="file-error" role="alert">
              {fileErrors.project_ref}
            </p>
          )}
        </div>

        {/* Human plan CSV */}
        <div className="form-field">
          <label className="form-label">
            Human-generated plan CSV <span className="required">*</span>
          </label>
          <p className="form-help">
            Required columns: project_id, project_name, duration_days, start_date, end_date,
            resource, dependencies, cost, priority
          </p>
          <div
            className="file-upload-zone"
            role="button"
            tabIndex={0}
            aria-label="Upload human-generated plan CSV"
            onClick={() => humanPlanFileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && humanPlanFileInputRef.current?.click()}
          >
            <input
              ref={humanPlanFileInputRef}
              type="file"
              accept=".csv"
              className="file-input-hidden"
              onChange={handleHumanPlanChange}
              aria-hidden="true"
            />
            {fileInfo.human_plan?.valid ? (
              <div className="file-upload-success">
                <span className="file-icon">✓</span>
                <span className="file-name">{fileInfo.human_plan.filename}</span>
                <span className="file-meta">{fileInfo.human_plan.rowCount} row(s)</span>
              </div>
            ) : (
              <span className="file-placeholder">
                {fileErrors.human_plan ? '⚠ Re-upload file' : 'Click to upload .csv'}
              </span>
            )}
          </div>
          {fileErrors.human_plan && (
            <p className="file-error" role="alert">
              {fileErrors.human_plan}
            </p>
          )}
        </div>
      </fieldset>

      {/* ---- Submit ---- */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary btn-generate"
          disabled={!isValid || isSaving || isExternallyDisabled}
          aria-disabled={!isValid || isSaving || isExternallyDisabled}
        >
          {isSaving ? (
            <>
              <Spinner size="sm" />
              <span>Saving…</span>
            </>
          ) : (
            'Generate Available Options'
          )}
        </button>
        {!isValid && (
          <p className="form-hint">Complete all required fields and upload both CSV files to continue.</p>
        )}
      </div>
    </form>
  );
};
