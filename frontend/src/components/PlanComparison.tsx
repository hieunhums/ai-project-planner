import React, { useMemo, useState } from 'react';
import type { PlanComparison as PlanComparisonData, TaskDifference } from '../services/types';
import './PlanComparison.css';

interface PlanComparisonProps {
  comparison: PlanComparisonData;
}

const statusLabels: Record<TaskDifference['status'], string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
  unchanged: 'Unchanged',
};

export const PlanComparison: React.FC<PlanComparisonProps> = ({ comparison }) => {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const taskRows = useMemo(() => {
    if (showUnchanged) return comparison.task_differences;
    return comparison.task_differences.filter((task) => task.status !== 'unchanged');
  }, [comparison.task_differences, showUnchanged]);

  return (
    <div className="comparison-card">
      <div className="comparison-header">
        <div>
          <h2>Plan Comparison</h2>
          <p className="comparison-subtitle">Differences, trade-offs, and metric deltas</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={() => setShowUnchanged((prev) => !prev)}
          />
          <span>Show unchanged tasks</span>
        </label>
      </div>

      <div className="comparison-metrics">
        <div className="metric">
          <span className="metric-label">Duration Delta</span>
          <span className="metric-value">
            {comparison.summary.duration_delta_days.toFixed(1)} days
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Cost Delta</span>
          <span className="metric-value">
            ${comparison.summary.cost_delta.toLocaleString()}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Capacity Delta</span>
          <span className="metric-value">
            {comparison.summary.capacity_delta.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="tradeoff-list">
        <h3>Key Trade-offs</h3>
        <ul>
          {comparison.tradeoffs.map((tradeoff, index) => (
            <li key={`${tradeoff}-${index}`}>{tradeoff}</li>
          ))}
        </ul>
      </div>

      <div className="diff-table">
        <div className="diff-table-header">
          <span>Task</span>
          <span>Status</span>
          <span>Changes</span>
        </div>
        {taskRows.map((task) => (
          <TaskRow key={task.task_id} task={task} />
        ))}
      </div>
    </div>
  );
};

const TaskRow = React.memo(({ task }: { task: TaskDifference }) => {
  return (
    <div className={`diff-row status-${task.status}`}>
      <div>
        <div className="task-name">{task.name}</div>
        <div className="task-id">{task.task_id}</div>
      </div>
      <div className="status-pill">{statusLabels[task.status]}</div>
      <div className="changes">
        {task.changes.length === 0 ? (
          <span className="muted">No field changes</span>
        ) : (
          task.changes.map((change) => (
            <div key={`${task.task_id}-${change.field}`} className="change-item">
              <strong>{change.field}</strong>
              <span className="change-values">
                {String(change.plan_1 ?? '—')} → {String(change.plan_2 ?? '—')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
TaskRow.displayName = 'TaskRow';
