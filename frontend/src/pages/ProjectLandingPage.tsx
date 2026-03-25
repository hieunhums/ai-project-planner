import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { savePlanState } from '../services/session';
import { savePlanStateToServer } from '../services/api';
import { buildGanttPath } from '../routes';
import type { CapacityPlanRow } from '../services/types';
import './ProjectLandingPage.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = ['project_id', 'project_name', 'duration_days', 'start_date', 'end_date', 'resource'];

const LOCATION_OPTIONS = ['Singapore', 'Batam', 'China'];
const YARD_BY_LOCATION: Record<string, string[]> = {
  Singapore: ['Tuas Boulevard', 'Admiralty', 'Benoi', 'Pioneer', 'Tuas'],
  Batam: ['Batam'],
  China: ['Nantong'],
};
const PROCESS_OPTIONS = ['Drydock', 'Berthing', 'Grand Assembly', 'Loadout'];

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseCSV(text: string): { rows: CapacityPlanRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], warnings: ['CSV has no data rows.'] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) warnings.push(`Missing columns: ${missing.join(', ')}`);

  const rows: CapacityPlanRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    if (vals.length < headers.length) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] ?? '').trim(); });
    rows.push({
      project_id: obj['project_id'] ?? '',
      project_name: obj['project_name'] ?? '',
      duration_days: Number(obj['duration_days']) || 0,
      start_date: obj['start_date'] ?? '',
      end_date: obj['end_date'] ?? '',
      resource: obj['resource'] ?? '',
      dependencies: obj['dependencies'] ?? '',
      cost: obj['cost'] ?? '',
      priority: obj['priority'] ?? '',
    });
  }
  return { rows, warnings };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProjectLandingPage: React.FC = () => {
  const { projectId } = useParams();
  const numericProjectId = projectId ? Number(projectId) : null;
  const navigate = useNavigate();
  const { project, isLoading: isProjectLoading } = useProjectDetail(numericProjectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──────────────────────────────────────────────────────
  const [projectType, setProjectType] = useState<'confirmed' | 'enquiry'>('confirmed');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hullLength, setHullLength] = useState('');
  const [hullWidth, setHullWidth] = useState('');
  const [hullHeight, setHullHeight] = useState('');
  const [topsideWeight, setTopsideWeight] = useState('');
  const [location, setLocation] = useState('');
  const [yard, setYard] = useState('');
  const [processes, setProcesses] = useState<string[]>([]);

  // ── CSV state ───────────────────────────────────────────────────────
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [parsedRows, setParsedRows] = useState<CapacityPlanRow[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    setCsvError(null);
    setCsvWarnings([]);
    if (!file.name.endsWith('.csv')) { setCsvError('Please upload a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target?.result as string);
      if (result.rows.length === 0 && result.warnings.length === 0) { setCsvError('CSV has no valid data rows.'); return; }
      setFileName(file.name);
      setRowCount(result.rows.length);
      setParsedRows(result.rows);
      setCsvWarnings(result.warnings);
    };
    reader.onerror = () => setCsvError('Failed to read file.');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleProcess = (p: string) => {
    setProcesses((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const yardOptions = location ? (YARD_BY_LOCATION[location] ?? []) : Object.values(YARD_BY_LOCATION).flat();

  const handleProceed = async () => {
    if (!numericProjectId) return;
    if (parsedRows.length > 0) {
      // Save uploaded CSV as the AI plan (orange bars) — this is what the planner will modify
      savePlanState(numericProjectId, parsedRows, 'Uploaded from CSV');
      // Do NOT save as human plan — human plan only appears after AI replan (for comparison)
      // Save to server
      await savePlanStateToServer(numericProjectId, parsedRows, null, 'Uploaded from CSV').catch(() => {});
    }
    navigate(buildGanttPath(numericProjectId));
  };

  // Can proceed if: has CSV data OR has enough form context (dates + at least one dimension)
  const hasCSV = parsedRows.length > 0;
  const hasFormContext = startDate && endDate && (hullLength || topsideWeight);
  const canProceed = hasCSV || hasFormContext;

  // Guard
  if (!numericProjectId || Number.isNaN(numericProjectId)) {
    return <div className="project-error">Invalid project selection.</div>;
  }

  const projectName = project?.name || 'New Project';

  return (
    <div className="project-landing">
      {/* Page header */}
      <header className="project-heading">
        <div className="project-heading-title">
          <p className="project-label">Project</p>
          <div className="project-title-row">
            <h1>{isProjectLoading ? 'Loading…' : projectName}</h1>
            {projectType === 'enquiry' && <span className="badge badge-enquiry">Enquiry</span>}
          </div>
        </div>
      </header>

      <div className="landing-grid">
        {/* ── Left: Project Context ──────────────────────────────────── */}
        <section className="context-section">
          <h2>Project Context</h2>
          <p className="section-hint">Tell the AI about your project so it can reason about scheduling decisions.</p>

          {/* Type toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${projectType === 'confirmed' ? 'type-btn--active' : ''}`}
              onClick={() => setProjectType('confirmed')}
            >
              Confirmed
            </button>
            <button
              type="button"
              className={`type-btn ${projectType === 'enquiry' ? 'type-btn--active' : ''}`}
              onClick={() => setProjectType('enquiry')}
            >
              Enquiry
            </button>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-field">
              <label>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label>End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Dimensions */}
          <div className="form-row form-row--3">
            <div className="form-field">
              <label>Hull length (m)</label>
              <input type="number" placeholder="e.g. 120" value={hullLength} onChange={(e) => setHullLength(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Hull width (m)</label>
              <input type="number" placeholder="e.g. 65" value={hullWidth} onChange={(e) => setHullWidth(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Hull height (m)</label>
              <input type="number" placeholder="e.g. 45" value={hullHeight} onChange={(e) => setHullHeight(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Topside weight (t)</label>
            <input type="number" placeholder="e.g. 15000" value={topsideWeight} onChange={(e) => setTopsideWeight(e.target.value)} />
          </div>

          {/* Location & Yard */}
          <div className="form-row">
            <div className="form-field">
              <label>Preferred location</label>
              <select value={location} onChange={(e) => { setLocation(e.target.value); setYard(''); }}>
                <option value="">Any location</option>
                {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Preferred yard</label>
              <select value={yard} onChange={(e) => setYard(e.target.value)}>
                <option value="">Any yard</option>
                {yardOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Processes */}
          <div className="form-field">
            <label>Processes</label>
            <div className="process-chips">
              {PROCESS_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`process-chip ${processes.includes(p) ? 'process-chip--active' : ''}`}
                  onClick={() => toggleProcess(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Right: CSV Upload ──────────────────────────────────────── */}
        <section className="upload-section">
          <h2>Scheduling Data</h2>
          <p className="section-hint">Upload your existing schedule (optional). Without CSV, AI will generate a plan from project context.</p>

          {/* Drop zone */}
          <div
            className={`upload-dropzone ${isDragging ? 'upload-dropzone--active' : ''} ${fileName ? 'upload-dropzone--done' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} style={{ display: 'none' }} />
            {!fileName ? (
              <div className="upload-prompt">
                <div className="upload-icon">📁</div>
                <p className="upload-cta">Drop CSV here or click to browse</p>
                <p className="upload-hint">Columns: {REQUIRED_COLUMNS.join(', ')}</p>
              </div>
            ) : (
              <div className="upload-success">
                <div className="upload-check">✓</div>
                <div className="upload-file-info">
                  <span className="upload-filename">{fileName}</span>
                  <span className="upload-rowcount">{rowCount.toLocaleString()} rows</span>
                </div>
                <button type="button" className="upload-change-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Change</button>
              </div>
            )}
          </div>

          {csvWarnings.length > 0 && (
            <div className="upload-warnings" role="alert">
              <strong>Warnings:</strong>
              <ul>{csvWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {csvError && <div className="upload-error" role="alert">{csvError}</div>}

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="upload-preview-section">
              <button type="button" className="preview-toggle" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? 'Hide' : 'Preview'} data ({rowCount} rows)
              </button>
              {showPreview && (
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Project ID</th><th>Name</th><th>Duration</th><th>Start</th><th>End</th><th>Resource</th><th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 15).map((row, i) => (
                        <tr key={i}>
                          <td>{row.project_id}</td><td>{row.project_name}</td><td>{row.duration_days}d</td>
                          <td>{row.start_date}</td><td>{row.end_date}</td><td>{row.resource}</td><td>{row.priority}</td>
                        </tr>
                      ))}
                      {rowCount > 15 && <tr><td colSpan={7} className="preview-more">… and {rowCount - 15} more rows</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!hasCSV && (
            <div className="no-csv-note">
              No CSV? No problem — the AI can generate a schedule from your project context.
            </div>
          )}
        </section>
      </div>

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="action-bar">
        <button
          type="button"
          className="btn btn-proceed btn-view-gantt"
          disabled={!canProceed}
          onClick={handleProceed}
        >
          {hasCSV ? 'View in Gantt →' : 'Generate Plan with AI →'}
        </button>
        {!canProceed && (
          <p className="action-hint">Upload a CSV or fill in project dates and dimensions to continue.</p>
        )}
      </div>
    </div>
  );
};
