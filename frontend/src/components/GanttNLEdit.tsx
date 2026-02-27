import React, { useState } from 'react';
import './GanttNLEdit.css';
import { Spinner } from './Spinner';

export interface GanttNLEditProps {
  onSubmit: (command: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  placeholder?: string;
}

const EXAMPLE = 'change PRJ-F01 from JY-QA to JY-QB';

export const GanttNLEdit: React.FC<GanttNLEditProps> = ({
  onSubmit,
  isLoading = false,
  error,
  placeholder = EXAMPLE,
}) => {
  const [command, setCommand] = useState('');
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isLoading) return;
    try {
      await onSubmit(trimmed);
      setLastApplied(trimmed);
      setCommand('');
    } catch {
      // error shown via `error` prop from parent hook
    }
  };

  return (
    <div className="nl-edit">
      <form className="nl-edit-form" onSubmit={handleSubmit}>
        <label className="nl-edit-label" htmlFor="nl-command">
          Edit plan with natural language
        </label>

        <div className="nl-edit-row">
          <input
            id="nl-command"
            className="nl-edit-input"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            aria-describedby={error ? 'nl-error' : undefined}
          />

          {isLoading ? (
            <span className="nl-edit-spinner">
              <Spinner size="sm" />
            </span>
          ) : (
            <button
              type="submit"
              className="btn btn-primary nl-edit-btn"
              disabled={!command.trim() || isLoading}
            >
              Apply
            </button>
          )}
        </div>

        <p className="nl-edit-hint">
          e.g. <em>{EXAMPLE}</em>
        </p>
      </form>

      {error && (
        <p id="nl-error" className="nl-edit-error" role="alert">
          {error}
        </p>
      )}

      {!error && lastApplied && (
        <p className="nl-edit-success" role="status">
          ✓ Applied: <em>{lastApplied}</em>
        </p>
      )}
    </div>
  );
};
