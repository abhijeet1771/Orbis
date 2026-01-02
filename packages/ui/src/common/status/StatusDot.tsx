import React from 'react';
import { getStatusVisual, OrbisStatus } from './statusConfig';
import './status.css';

export function StatusDot({ status }: { status: OrbisStatus }): JSX.Element {
  const cfg = getStatusVisual(status);
  return (
    <span
      className="status-dot"
      style={{ background: cfg.color }}
      aria-label={cfg.label}
      title={cfg.label}
    />
  );
}

