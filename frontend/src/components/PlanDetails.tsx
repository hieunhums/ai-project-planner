import React, { useMemo, useState } from 'react';
import type { Plan, Task } from '../services/types';
import './PlanDetails.css';

interface PlanDetailsProps {
  plan: Plan;
}

export const PlanDetails: React.FC<PlanDetailsProps> = ({ plan }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return plan.tasks.find((task) => task.task_id === selectedTaskId) || null;
  }, [plan.tasks, selectedTaskId]);

  return (
    <div className="plan-details">
      <header>
        <div>
          <h2>{plan.name}</h2>
          <p className="subtitle">Plan details and AI explanations</p>
        </div>
        <div className="plan-meta">
          <span>Status: {plan.status}</span>
          <span>Lineage: {plan.lineage}</span>
        </div>
      </header>

      <div className="details-grid">
        <div className="task-list">
          <h3>Tasks</h3>
          <div className="task-items">
            {plan.tasks.map((task) => (
              <button
                key={task.task_id}
                className={`task-item ${selectedTaskId === task.task_id ? 'active' : ''}`}
                onClick={() => setSelectedTaskId(task.task_id)}
              >
                <div>
                  <div className="task-title">{task.name}</div>
                  <div className="task-meta">{task.task_id}</div>
                </div>
                <span className="duration">{task.duration_days}d</span>
              </button>
            ))}
          </div>
        </div>

        <div className="task-details">
          {selectedTask ? (
            <TaskDetailCard task={selectedTask} />
          ) : (
            <div className="empty-state">
              <p>Select a task to view explanation and assumptions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskDetailCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="task-detail-card">
      <h3>{task.name}</h3>
      <div className="detail-row">
        <span>Duration</span>
        <strong>{task.duration_days} days</strong>
      </div>
      <div className="detail-row">
        <span>Priority</span>
        <strong>{task.priority || '—'}</strong>
      </div>
      <div className="detail-row">
        <span>Cost</span>
        <strong>{task.cost ? `$${task.cost.toLocaleString()}` : '—'}</strong>
      </div>

      <div className="detail-section">
        <h4>Explanation</h4>
        <p>{task.explanation || 'No explanation provided yet.'}</p>
      </div>

      <div className="detail-section">
        <h4>Assumptions</h4>
        {task.assumptions && task.assumptions.length ? (
          <ul>
            {task.assumptions.map((assumption, index) => (
              <li key={`${assumption}-${index}`}>{assumption}</li>
            ))}
          </ul>
        ) : (
          <p>No assumptions listed.</p>
        )}
      </div>

      <div className="detail-section">
        <h4>Trade-offs</h4>
        {task.trade_offs && task.trade_offs.length ? (
          <ul>
            {task.trade_offs.map((tradeoff, index) => (
              <li key={`${tradeoff}-${index}`}>{tradeoff}</li>
            ))}
          </ul>
        ) : (
          <p>No trade-offs captured.</p>
        )}
      </div>
    </div>
  );
};
