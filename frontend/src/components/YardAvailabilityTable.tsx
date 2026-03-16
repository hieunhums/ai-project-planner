import React from 'react';
import './YardAvailabilityTable.css';
import type { YardAvailabilityRow } from '../services/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface YardAvailabilityTableProps {
  yards: YardAvailabilityRow[];
  selectedYards: string[];
  onSelectionChange: (selected: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const YardAvailabilityTable: React.FC<YardAvailabilityTableProps> = ({
  yards,
  selectedYards,
  onSelectionChange,
}) => {
  const availableYards = yards.filter((y) => y.availability === 'Available').map((y) => y.yard_name);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleToggle = (yardName: string) => {
    if (selectedYards.includes(yardName)) {
      onSelectionChange(selectedYards.filter((n) => n !== yardName));
    } else {
      onSelectionChange([...selectedYards, yardName]);
    }
  };

  const handleSelectAllAvailable = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onSelectionChange(availableYards);
  };

  const handleMasterToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange(e.target.checked ? availableYards : []);
  };

  const allAvailableSelected =
    availableYards.length > 0 &&
    availableYards.every((n) => selectedYards.includes(n));

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="yard-table-wrapper">
      <div className="yard-table-toolbar">
        <span className="yard-table-count">
          {selectedYards.length} of {yards.length} selected
        </span>
        {availableYards.length > 0 && (
          <a
            href="#select-all"
            className="yard-table-select-link"
            onClick={handleSelectAllAvailable}
          >
            Select all available
          </a>
        )}
      </div>

      <table className="yard-table" role="grid" aria-label="Yard availability">
        <thead>
          <tr>
            <th className="yard-table-th yard-table-th--check" scope="col">
              <input
                type="checkbox"
                aria-label="Select all available yards"
                checked={allAvailableSelected}
                onChange={handleMasterToggle}
                disabled={availableYards.length === 0}
              />
            </th>
            <th className="yard-table-th" scope="col">Yard Name</th>
            <th className="yard-table-th" scope="col">Location</th>
            <th className="yard-table-th yard-table-th--avail" scope="col">Availability</th>
          </tr>
        </thead>
        <tbody>
          {yards.map((yard) => {
            const isAvailable = yard.availability === 'Available';
            const isChecked = selectedYards.includes(yard.yard_name);

            return (
              <tr
                key={yard.yard_name}
                className={`yard-table-row ${isChecked ? 'yard-table-row--selected' : ''}`}
                onClick={() => isAvailable && handleToggle(yard.yard_name)}
                aria-selected={isChecked}
              >
                <td className="yard-table-td yard-table-td--check">
                  <input
                    type="checkbox"
                    aria-label={`Select ${yard.yard_name}`}
                    checked={isChecked}
                    disabled={!isAvailable}
                    onChange={() => handleToggle(yard.yard_name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="yard-table-td yard-table-td--name">{yard.yard_name}</td>
                <td className="yard-table-td">{yard.location}</td>
                <td className="yard-table-td yard-table-td--avail">
                  <span
                    className={`availability-dot ${
                      isAvailable
                        ? 'availability-dot--available'
                        : 'availability-dot--occupied'
                    }`}
                    aria-label={yard.availability}
                  />
                  <span className="availability-label">{yard.availability}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
