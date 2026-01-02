import React from 'react';
import { getStatusVisual, OrbisStatus } from './statusConfig';
import './status.css';

export function StatusLabel({ status }: { status: OrbisStatus }): JSX.Element {
  const cfg = getStatusVisual(status);
  return (
    <span className="status-label" aria-label={cfg.label} title={cfg.label}>
      <span className="status-dot" style={{ background: cfg.color }} />
      <span>{cfg.label}</span>
    </span>
  );
}

