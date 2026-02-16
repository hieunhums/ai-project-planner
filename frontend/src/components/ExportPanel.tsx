import React, { useState } from 'react';
import { api } from '../services/api';
import './ExportPanel.css';

interface ExportPanelProps {
  planId: number;
  planName?: string;
}

const exportOptions = [
  { label: 'CSV Task List', format: 'csv', extension: 'csv' },
  { label: 'JSON Plan', format: 'json', extension: 'json' },
  { label: 'Gantt JSON', format: 'gantt', extension: 'json' },
] as const;

export const ExportPanel: React.FC<ExportPanelProps> = ({ planId, planName }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' | 'gantt', extension: string) => {
    setIsExporting(format);
    setError(null);

    try {
      const blob = await api.exportPlan(planId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = planName ? planName.replace(/\s+/g, '_') : `plan_${planId}`;
      link.href = url;
      link.download = `${safeName}_${format}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export plan';
      setError(message);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <section className="export-panel">
      <header>
        <h2>Export Plan</h2>
        <p className="subtitle">Download a finalized plan for execution teams.</p>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="export-actions">
        {exportOptions.map((option) => (
          <button
            key={option.format}
            type="button"
            onClick={() => handleExport(option.format, option.extension)}
            disabled={isExporting === option.format}
          >
            {isExporting === option.format ? 'Exporting...' : option.label}
          </button>
        ))}
      </div>
    </section>
  );
};
