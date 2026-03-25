import React, { useState } from 'react';
import './ConstraintEditor.css';

interface ConstraintEditorProps {
  onSubmit: (constraints: Record<string, any>) => void;
  isSubmitting?: boolean;
}

export const ConstraintEditor: React.FC<ConstraintEditorProps> = ({
  onSubmit,
  isSubmitting = false,
}) => {
  const [maxTasks, setMaxTasks] = useState<number | ''>('');
  const [maxDuration, setMaxDuration] = useState<number | ''>('');
  const [targetUtilization, setTargetUtilization] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const constraints: Record<string, any> = {};
    if (maxTasks !== '') constraints.max_tasks = maxTasks;
    if (maxDuration !== '') constraints.max_duration_days = maxDuration;
    if (targetUtilization !== '') constraints.target_capacity_utilization = targetUtilization;
    if (notes.trim()) constraints.notes = notes.trim();

    onSubmit(constraints);
  };

  return (
    <form className="constraint-editor" onSubmit={handleSubmit}>
      <h2>Adjust Constraints</h2>
      <p className="subtitle">Tune the assumptions and regenerate the AI plan.</p>

      <div className="field-grid">
        <label>
          Max Tasks
          <input
            type="number"
            min={1}
            max={200}
            value={maxTasks}
            onChange={(event) =>
              setMaxTasks(event.target.value ? Number(event.target.value) : '')
            }
          />
        </label>
        <label>
          Max Duration (days)
          <input
            type="number"
            min={1}
            value={maxDuration}
            onChange={(event) =>
              setMaxDuration(event.target.value ? Number(event.target.value) : '')
            }
          />
        </label>
        <label>
          Target Utilization (%)
          <input
            type="number"
            min={0}
            max={100}
            value={targetUtilization}
            onChange={(event) =>
              setTargetUtilization(event.target.value ? Number(event.target.value) : '')
            }
          />
        </label>
      </div>

      <label className="notes">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes or scenario description"
          rows={3}
        />
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Regenerating...' : 'Regenerate Plan'}
      </button>
    </form>
  );
};
