import React from 'react';
import type { RegressionEntry } from './regression';
import './regression.css';

export function RegressionBadge({ regression }: { regression?: RegressionEntry }): JSX.Element | null {
  if (!regression) return null;
  const tone =
    regression.severity === 'critical'
      ? 'reg-critical'
      : regression.severity === 'moderate'
        ? 'reg-moderate'
        : regression.severity === 'minor'
          ? 'reg-minor'
          : 'reg-info';
  const label = renderLabel(regression);
  return (
    <span className={`reg-badge ${tone}`} title={label}>
      {label}
    </span>
  );
}

function renderLabel(reg: RegressionEntry): string {
  switch (reg.label) {
    case 'new-failure':
      return 'New Failure';
    case 'new-flaky':
      return 'New Flaky';
    case 'performance-regression':
      return 'Perf Regression';
    case 'recovered':
    default:
      return 'Recovered';
  }
}

