import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';
import './ChangePanel.css';

const LOCATION_OPTIONS = ['Singapore', 'Batam', 'China'];
const YARD_BY_LOCATION: Record<string, string[]> = {
  Singapore: ['Tuas Boulevard', 'Admiralty', 'Benoi', 'Pioneer', 'Tuas'],
  Batam: ['Batam'],
  China: ['Nantong'],
};

export interface ReplanChanges {
  hull_length?: string;
  hull_width?: string;
  hull_height?: string;
  topside_weight?: string;
  preferred_location?: string;
  preferred_yard?: string;
  constraints: string[];
  optimization_goal: string;
  free_text: string;
}

export interface ProjectConfig {
  hull_length?: string;
  hull_width?: string;
  hull_height?: string;
  topside_weight?: string;
  preferred_location?: string;
  preferred_yard?: string;
  optimization_goal?: string;
}

interface ChangePanelProps {
  onReplan: (changes: ReplanChanges) => Promise<void>;
  isLoading: boolean;
  planRowCount: number;
  initialConfig?: ProjectConfig;
  onNLSubmit?: (command: string) => Promise<void>;
  nlLoading?: boolean;
  nlError?: string | null;
}

export const ChangePanel: React.FC<ChangePanelProps> = ({
  onReplan, isLoading, planRowCount, initialConfig, onNLSubmit, nlLoading, nlError,
}) => {
  const [hullLength, setHullLength] = useState('');
  const [hullWidth, setHullWidth] = useState('');
  const [hullHeight, setHullHeight] = useState('');
  const [topsideWeight, setTopsideWeight] = useState('');
  const [location, setLocation] = useState('');
  const [yard, setYard] = useState('');
  const [freeText, setFreeText] = useState('');
  const [goal, setGoal] = useState('minimize_duration');

  // NL Edit state
  const [nlCommand, setNlCommand] = useState('');
  const [nlLastApplied, setNlLastApplied] = useState<string | null>(null);

  // Pre-fill from project config — re-sync whenever config values change
  const configKey = initialConfig
    ? `${initialConfig.hull_length}|${initialConfig.hull_width}|${initialConfig.hull_height}|${initialConfig.topside_weight}|${initialConfig.preferred_location}|${initialConfig.preferred_yard}|${initialConfig.optimization_goal}`
    : '';

  useEffect(() => {
    if (!initialConfig) return;
    setHullLength(initialConfig.hull_length || '');
    setHullWidth(initialConfig.hull_width || '');
    setHullHeight(initialConfig.hull_height || '');
    setTopsideWeight(initialConfig.topside_weight || '');
    setLocation(initialConfig.preferred_location || '');
    setYard(initialConfig.preferred_yard || '');
    setGoal(initialConfig.optimization_goal || 'minimize_duration');
    setFreeText('');
  }, [configKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const yardOptions = location ? (YARD_BY_LOCATION[location] ?? []) : [];

  // Detect changes — any field that differs from initial (or is newly filled)
  const changedFields: string[] = [];
  const init = initialConfig || {};
  if (hullLength && hullLength !== (init.hull_length || '')) changedFields.push(`Hull length: ${init.hull_length || '—'} → ${hullLength}m`);
  if (hullWidth && hullWidth !== (init.hull_width || '')) changedFields.push(`Hull width: ${init.hull_width || '—'} → ${hullWidth}m`);
  if (hullHeight && hullHeight !== (init.hull_height || '')) changedFields.push(`Hull height: ${init.hull_height || '—'} → ${hullHeight}m`);
  if (topsideWeight && topsideWeight !== (init.topside_weight || '')) changedFields.push(`Topside: ${init.topside_weight || '—'} → ${topsideWeight}t`);
  if (init.preferred_location && location !== init.preferred_location) changedFields.push(`Location: ${init.preferred_location} → ${location || 'Any'}`);
  if (init.preferred_yard && yard !== init.preferred_yard) changedFields.push(`Yard: ${init.preferred_yard} → ${yard || 'Any'}`);
  if (init.optimization_goal && goal !== init.optimization_goal) changedFields.push(`Optimize: ${goal}`);
  if (freeText.trim()) changedFields.push(`Constraints added`);

  const hasChanges = changedFields.length > 0;

  const handleReplan = () => {
    onReplan({
      hull_length: hullLength || undefined,
      hull_width: hullWidth || undefined,
      hull_height: hullHeight || undefined,
      topside_weight: topsideWeight || undefined,
      preferred_location: location || undefined,
      preferred_yard: yard || undefined,
      constraints: freeText ? freeText.split('\n').filter(Boolean) : [],
      optimization_goal: goal,
      free_text: freeText,
    });
  };

  const handleNLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nlCommand.trim();
    if (!trimmed || nlLoading || !onNLSubmit) return;
    try {
      await onNLSubmit(trimmed);
      setNlLastApplied(trimmed);
      setNlCommand('');
    } catch {
      // error shown via nlError prop
    }
  };

  return (
    <div className="change-panel">
      <div className="cp-header">
        <h3>What Changed?</h3>
        <span className="cp-count">{planRowCount} tasks loaded</span>
      </div>

      <p className="cp-hint">
        {initialConfig
          ? 'Current project config is pre-filled. Modify any field to trigger a replan.'
          : 'Change parameters below and click Replan.'}
      </p>

      {/* Dimensions — stacked vertically */}
      <div className="cp-section">
        <label className="cp-label">Hull Length (m)</label>
        <input type="number" placeholder="e.g. 120" value={hullLength} onChange={(e) => setHullLength(e.target.value)}
          className={hullLength && hullLength !== (initialConfig?.hull_length || '') ? 'cp-changed' : ''} />
      </div>

      <div className="cp-section">
        <label className="cp-label">Hull Width (m)</label>
        <input type="number" placeholder="e.g. 65" value={hullWidth} onChange={(e) => setHullWidth(e.target.value)}
          className={hullWidth && hullWidth !== (initialConfig?.hull_width || '') ? 'cp-changed' : ''} />
      </div>

      <div className="cp-section">
        <label className="cp-label">Hull Height (m)</label>
        <input type="number" placeholder="e.g. 45" value={hullHeight} onChange={(e) => setHullHeight(e.target.value)}
          className={hullHeight && hullHeight !== (initialConfig?.hull_height || '') ? 'cp-changed' : ''} />
      </div>

      <div className="cp-section">
        <label className="cp-label">Topside Weight (t)</label>
        <input type="number" placeholder="e.g. 15000" value={topsideWeight} onChange={(e) => setTopsideWeight(e.target.value)}
          className={topsideWeight && topsideWeight !== (initialConfig?.topside_weight || '') ? 'cp-changed' : ''} />
      </div>

      {/* Yard preference */}
      <div className="cp-section">
        <label className="cp-label">Preferred Location</label>
        <select value={location} onChange={(e) => { setLocation(e.target.value); setYard(''); }}
          className={initialConfig?.preferred_location && location !== initialConfig.preferred_location ? 'cp-changed' : ''}>
          <option value="">Any</option>
          {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {location && (
        <div className="cp-section">
          <label className="cp-label">Preferred Yard</label>
          <select value={yard} onChange={(e) => setYard(e.target.value)}
            className={initialConfig?.preferred_yard && yard !== initialConfig.preferred_yard ? 'cp-changed' : ''}>
            <option value="">Any</option>
            {yardOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Optimization goal */}
      <div className="cp-section">
        <label className="cp-label">Optimize For</label>
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="minimize_duration">Minimize Duration</option>
          <option value="minimize_cost">Minimize Cost</option>
          <option value="minimize_transport">Minimize Transport Distance</option>
          <option value="balance">Balanced</option>
        </select>
      </div>

      {/* Free text constraints */}
      <div className="cp-section">
        <label className="cp-label">Constraints & Notes</label>
        <textarea
          placeholder={"e.g. avoid Q1 2027 monsoon\nbudget max $500K\nPioneer unavailable Mar-Jun"}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Changes summary */}
      {changedFields.length > 0 && (
        <div className="cp-changes-summary">
          <label className="cp-label">Changes Detected</label>
          <ul className="cp-changes-list">
            {changedFields.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* NL Edit */}
      {onNLSubmit && (
        <div className="cp-section cp-nl-section">
          <label className="cp-label">Quick Edit (Natural Language)</label>
          <form className="cp-nl-form" onSubmit={handleNLSubmit}>
            <textarea
              className="cp-nl-input"
              value={nlCommand}
              onChange={(e) => setNlCommand(e.target.value)}
              placeholder={"e.g. move PRJ-FPU-1 drydock to Pioneer\nshift Build project 60 start +30 days\nswap PRJ-FPU-1 and PRJ-FPU-2 berths"}
              disabled={nlLoading}
              rows={3}
            />
            <div className="cp-nl-actions">
              {nlLoading ? (
                <span className="cp-nl-spinner"><Spinner size="sm" /></span>
              ) : (
                <button type="submit" className="cp-nl-btn" disabled={!nlCommand.trim()}>
                  Apply
                </button>
              )}
            </div>
          </form>
          {nlError && <p className="cp-nl-error">{nlError}</p>}
          {!nlError && nlLastApplied && <p className="cp-nl-success">✓ {nlLastApplied}</p>}
        </div>
      )}

      {/* Replan button */}
      <button
        type="button"
        className="cp-replan-btn"
        disabled={!hasChanges || isLoading}
        onClick={handleReplan}
      >
        {isLoading ? 'Replanning…' : changedFields.length > 0 ? `Replan with AI (${changedFields.length} change${changedFields.length !== 1 ? 's' : ''})` : 'Replan with AI'}
      </button>

      {!hasChanges && (
        <p className="cp-footer">
          {initialConfig ? 'Modify a field above to enable replanning.' : 'Specify at least one change to enable replanning.'}
        </p>
      )}
    </div>
  );
};
