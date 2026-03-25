import React from 'react';
import './AIReasoningPanel.css';

export interface ReplanReasoning {
  summary: string;
  per_task: Record<string, string>;
  tradeoffs: string[];
}

interface AIReasoningPanelProps {
  reasoning: ReplanReasoning | null;
  selectedBarId?: string | null;
  changedRows?: any[];
  model?: string | null;
}

export const AIReasoningPanel: React.FC<AIReasoningPanelProps> = ({ reasoning, selectedBarId, changedRows, model }) => {
  if (!reasoning) return null;

  const taskCount = Object.keys(reasoning.per_task).length;

  return (
    <div className="air-panel">
      {/* Header */}
      <div className="air-header">
        <h3 className="air-title">AI Proposal</h3>
        {model && <span className="air-model">{model}</span>}
      </div>

      {/* Summary */}
      <div className="air-summary">
        {reasoning.summary}
      </div>

      {/* Changed rows table */}
      {changedRows && changedRows.length > 0 && (
        <div className="air-section">
          <h4>Changed Rows ({changedRows.length})</h4>
          <table className="air-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Phase</th>
                <th>Resource</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {changedRows.map((row: any, i: number) => (
                <tr key={i}>
                  <td className="air-cell-project">{row.project_id}</td>
                  <td>{row.project_name}</td>
                  <td className="air-cell-resource">{row.resource}</td>
                  <td>{row.start_date}</td>
                  <td>{row.end_date}</td>
                  <td>{row.duration_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-task reasoning */}
      {taskCount > 0 && (
        <div className="air-section">
          <h4>Reasoning ({taskCount})</h4>
          {Object.entries(reasoning.per_task).map(([taskId, reason]) => (
            <div key={taskId} className={`air-task ${selectedBarId === taskId ? 'air-task--selected' : ''}`}>
              <span className="air-task-id">{taskId}</span>
              <span className="air-task-reason">{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tradeoffs */}
      {reasoning.tradeoffs.length > 0 && (
        <div className="air-section">
          <h4>Tradeoffs ({reasoning.tradeoffs.length})</h4>
          {reasoning.tradeoffs.map((t, i) => (
            <div key={i} className="air-tradeoff">
              <span className="air-tradeoff-num">{i + 1}</span>
              <p>{t}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
