import React from 'react';
import type { TrustAssessment } from './trustScore';
import './trust.css';

export function TrustExplain({ trust }: { trust: TrustAssessment | undefined }): JSX.Element | null {
  if (!trust) return null;
  const factors: string[] = [];
  factors.push(`Pass rate ${(trust.factors.passRate * 100).toFixed(0)}%`);
  factors.push(`Fail rate ${(trust.factors.failRate * 100).toFixed(0)}%`);
  factors.push(`Flaky rate ${(trust.factors.flakyRate * 100).toFixed(0)}%`);
  factors.push(`Pass streak ${trust.factors.passStreak}`);
  if (trust.factors.failStreak) factors.push(`Fail streak ${trust.factors.failStreak}`);
  if (trust.factors.lastFailureAgeMs !== undefined) {
    const days = Math.floor(trust.factors.lastFailureAgeMs / (24 * 3600 * 1000));
    factors.push(days > 0 ? `Last failure ${days}d ago` : 'Recent failure');
  }
  if (trust.factors.durationMedianMs !== undefined && trust.factors.durationP95Ms !== undefined) {
    factors.push(
      `Duration median ${Math.round(trust.factors.durationMedianMs)}ms, p95 ${Math.round(
        trust.factors.durationP95Ms
      )}ms`
    );
  }
  return (
    <div className="trust-explain">
      <div className="trust-explain__title">Why this score</div>
      <ul>
        {factors.map((f, idx) => (
          <li key={idx}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

