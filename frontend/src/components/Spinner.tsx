import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  /** Optional label displayed below the circle */
  label?: string;
  /** Size variant — default is 'md' */
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ label, size = 'md' }) => {
  return (
    <div className={`spinner-wrapper spinner-${size}`} role="status" aria-live="polite">
      <div className="spinner-circle" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
      <span className="sr-only">{label ?? 'Loading…'}</span>
    </div>
  );
};
