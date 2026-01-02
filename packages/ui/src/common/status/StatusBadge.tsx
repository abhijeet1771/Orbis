import React from 'react';
import { getStatusVisual, OrbisStatus } from './statusConfig';
import './status.css';

export function StatusBadge({ status }: { status: OrbisStatus }): JSX.Element {
  const cfg = getStatusVisual(status);
  return (
    <span
      className="status-badge"
      style={{
        color: cfg.color,
        background: cfg.tint,
        borderColor: cfg.border
      }}
      aria-label={cfg.label}
    >
      <span className="status-badge__icon">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

