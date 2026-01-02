import React from 'react';
import type { TrustAssessment } from './trustScore';
import './trust.css';

export function TrustBadge({ trust }: { trust: TrustAssessment | undefined }): JSX.Element | null {
  if (!trust) return null;
  const tone =
    trust.score >= 85 ? 'trust-high' : trust.score >= 70 ? 'trust-mid' : trust.score >= 50 ? 'trust-low' : 'trust-bad';
  return (
    <span className={`trust-badge ${tone}`} title={`${trust.label} (${trust.score})`}>
      {trust.label}
    </span>
  );
}

