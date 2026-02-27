import React, { useState } from 'react';
import './CapacityAssessmentPanel.css';
import { Spinner } from './Spinner';
import type { CapacityPlanRow } from '../services/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CapacityAssessmentPanelProps {
  selectedYards: string[];
  onAssess: (prompt: string) => Promise<void>;
  isLoading: boolean;
  plan: CapacityPlanRow[];
  rationale: string;
  error: string | null;
  onProceedToGantt: () => void;
}

// ---------------------------------------------------------------------------
// Plan table columns
// ---------------------------------------------------------------------------

const COLUMNS: { key: keyof CapacityPlanRow; label: string }[] = [
  { key: 'project_id', label: 'Project ID' },
  { key: 'project_name', label: 'Project Name' },
  { key: 'duration_days', label: 'Duration (days)' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'resource', label: 'Resource' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'cost', label: 'Cost' },
  { key: 'priority', label: 'Priority' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CapacityAssessmentPanel: React.FC<CapacityAssessmentPanelProps> = ({
  selectedYards,
  onAssess,
  isLoading,
  plan,
  rationale,
  error,
  onProceedToGantt,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAssess) return;
    await onAssess(prompt.trim());
  };

  const canAssess = selectedYards.length > 0 && !isLoading;
  const hasPlan = plan.length > 0;

  return (
    <div className="capacity-panel">
      {/* ── Prompt form ─── */}
      <form className="capacity-form" onSubmit={handleSubmit}>
        <div className="capacity-form-field">
          <label htmlFor="capacity-prompt" className="capacity-label">
            Planning instructions
          </label>
          <p className="capacity-help">
            Describe any constraints or preferences for the capacity plan (e.g. "prioritise
            hull assembly" or "avoid Q3 for resource JY-QA").
          </p>
          <textarea
            id="capacity-prompt"
            className="capacity-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter planning instructions (optional)…"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {selectedYards.length === 0 && (
          <p className="capacity-hint" role="status">
            Select at least one yard above to enable capacity assessment.
          </p>
        )}

        <div className="capacity-actions">
          {isLoading ? (
            <div className="capacity-loading">
              <Spinner size="md" label="Assessing capacity…" />
            </div>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canAssess}
              aria-disabled={!canAssess}
            >
              Assess Capacity
            </button>
          )}
        </div>
      </form>

      {/* ── Error ─── */}
      {error && (
        <p className="capacity-error" role="alert">
          {error}
        </p>
      )}

      {/* ── Rationale ─── */}
      {rationale && (
        <div className="capacity-rationale">
          <h3 className="capacity-rationale-title">AI Rationale</h3>
          <p className="capacity-rationale-text">{rationale}</p>
        </div>
      )}

      {/* ── Plan table ─── */}
      {hasPlan && (
        <div className="capacity-table-wrapper">
          <h3 className="capacity-table-title">Augmented Capacity Plan ({plan.length} tasks)</h3>
          <div className="capacity-table-scroll">
            <table className="capacity-table" aria-label="Capacity plan">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="capacity-th" scope="col">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.map((row, idx) => (
                  <tr key={`${row.project_id}-${idx}`} className="capacity-tr">
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="capacity-td">
                        {row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Proceed button ─── */}
          <div className="capacity-proceed">
            <button
              type="button"
              className="btn btn-primary btn-proceed"
              onClick={onProceedToGantt}
            >
              Proceed to Gantt →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
