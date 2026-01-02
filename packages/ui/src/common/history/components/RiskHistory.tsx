/**
 * Risk History Component (Executive Story)
 *
 * Question: "Is risk increasing or stabilizing?"
 * Visual: Minimal stacked signal timeline
 * Each point: Blocking risk, High risk, Informational
 * No numbers on chart - direction only
 */

import React, { useState, useMemo } from 'react';

export interface RiskDataPoint {
  timestamp: number;
  blocking: number;      // High-severity, high-trust failures
  risk: number;          // Flaky in critical areas, regressions on trusted tests
  informational: number; // New/low-trust tests, long-running cases
}

export interface RiskHistoryProps {
  riskData: RiskDataPoint[];
  onPointClick?: (point: RiskDataPoint) => void;
  onPointHover?: (point: RiskDataPoint) => void;
  maxVisible?: number;
  className?: string;
}

export function RiskHistory({
  riskData,
  onPointClick,
  onPointHover,
  maxVisible = 30,
  className = ''
}: RiskHistoryProps): JSX.Element {
  const [hoveredPoint, setHoveredPoint] = useState<RiskDataPoint | null>(null);

  // Sort by timestamp and limit visible points
  const sortedData = useMemo(() =>
    [...riskData].sort((a, b) => a.timestamp - b.timestamp),
    [riskData]
  );
  const visibleData = sortedData.slice(-maxVisible);
  const hasMore = riskData.length > maxVisible;

  // Calculate risk direction and trend
  const riskTrend = useMemo(() => {
    if (visibleData.length < 2) return 'insufficient-data';

    const recent = visibleData.slice(-5); // Last 5 points
    const older = visibleData.slice(-10, -5); // Previous 5 points

    const recentAvg = recent.reduce((sum, p) => sum + p.blocking + p.risk, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, p) => sum + p.blocking + p.risk, 0) / older.length
      : recentAvg;

    const change = recentAvg - olderAvg;
    const threshold = Math.max(olderAvg * 0.1, 0.5); // 10% change or 0.5 absolute

    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }, [visibleData]);

  const getTrendDescription = (trend: string): { label: string; color: string } => {
    const trends = {
      'increasing': { label: 'Risk Increasing', color: 'var(--color-risk)' },
      'decreasing': { label: 'Risk Decreasing', color: 'var(--color-pass)' },
      'stable': { label: 'Risk Stable', color: 'var(--color-neutral-600)' },
      'insufficient-data': { label: 'Insufficient Data', color: 'var(--color-neutral-500)' }
    };
    return trends[trend as keyof typeof trends] || trends.stable;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`risk-history ${className}`}>
      <div className="risk-history__header">
        <h3 className="risk-history__title">Risk History</h3>
        <p className="risk-history__subtitle">Is risk increasing or stabilizing?</p>

        {/* Risk trend indicator */}
        <div className="risk-history__trend">
          <div
            className="risk-history__trend-indicator"
            style={{
              color: getTrendDescription(riskTrend).color,
              fontWeight: 'var(--font-weight-semibold)'
            }}
          >
            {getTrendDescription(riskTrend).label}
          </div>
        </div>
      </div>

      <div className="risk-history__timeline">
        <div className="risk-history__axis" />

        <div className="risk-history__points">
          {visibleData.map((point, index) => {
            const isHovered = hoveredPoint?.timestamp === point.timestamp;
            const totalRisk = point.blocking + point.risk + point.informational;
            const hasRisk = totalRisk > 0;

            return (
              <div
                key={point.timestamp}
                className={`risk-history__point ${isHovered ? 'risk-history__point--hovered' : ''}`}
                style={{
                  left: `${(index / Math.max(visibleData.length - 1, 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
                onClick={() => onPointClick?.(point)}
                onMouseEnter={() => {
                  setHoveredPoint(point);
                  onPointHover?.(point);
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Stacked risk indicators */}
                <div className="risk-history__stack">
                  {point.blocking > 0 && (
                    <div
                      className="risk-history__stack-segment risk-history__stack-segment--blocking"
                      style={{
                        height: `${(point.blocking / Math.max(totalRisk, 1)) * 24}px`,
                        background: 'var(--color-fail)'
                      }}
                    />
                  )}
                  {point.risk > 0 && (
                    <div
                      className="risk-history__stack-segment risk-history__stack-segment--risk"
                      style={{
                        height: `${(point.risk / Math.max(totalRisk, 1)) * 24}px`,
                        background: 'var(--color-risk)'
                      }}
                    />
                  )}
                  {point.informational > 0 && (
                    <div
                      className="risk-history__stack-segment risk-history__stack-segment--info"
                      style={{
                        height: `${(point.informational / Math.max(totalRisk, 1)) * 24}px`,
                        background: 'var(--color-neutral-500)'
                      }}
                    />
                  )}
                  {!hasRisk && (
                    <div
                      className="risk-history__stack-segment risk-history__stack-segment--none"
                      style={{
                        height: '4px',
                        background: 'var(--color-pass)',
                        borderRadius: '2px'
                      }}
                    />
                  )}
                </div>

                {/* Risk level indicator */}
                <div
                  className="risk-history__level"
                  style={{
                    color: hasRisk ? 'var(--color-text-primary)' : 'var(--color-pass)',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-bold)',
                    textAlign: 'center',
                    marginTop: '4px'
                  }}
                >
                  {hasRisk ? totalRisk : '✓'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="risk-history__legend">
          <div className="risk-history__legend-item">
            <div className="risk-history__legend-dot" style={{ background: 'var(--color-fail)' }} />
            <span>Blocking</span>
          </div>
          <div className="risk-history__legend-item">
            <div className="risk-history__legend-dot" style={{ background: 'var(--color-risk)' }} />
            <span>Risk</span>
          </div>
          <div className="risk-history__legend-item">
            <div className="risk-history__legend-dot" style={{ background: 'var(--color-neutral-500)' }} />
            <span>Info</span>
          </div>
          <div className="risk-history__legend-item">
            <div className="risk-history__legend-dot" style={{ background: 'var(--color-pass)' }} />
            <span>Clear</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip with numbers outside chart */}
      {hoveredPoint && (
        <div className="risk-history__tooltip">
          <div className="risk-history__tooltip-header">
            <strong>{formatTimestamp(hoveredPoint.timestamp)}</strong>
          </div>
          <div className="risk-history__tooltip-stats">
            <div className="risk-history__tooltip-stat">
              <span className="risk-history__tooltip-label">Blocking signals:</span>
              <span className="risk-history__tooltip-value" style={{ color: 'var(--color-fail)' }}>
                {hoveredPoint.blocking}
              </span>
            </div>
            <div className="risk-history__tooltip-stat">
              <span className="risk-history__tooltip-label">Risk signals:</span>
              <span className="risk-history__tooltip-value" style={{ color: 'var(--color-risk)' }}>
                {hoveredPoint.risk}
              </span>
            </div>
            <div className="risk-history__tooltip-stat">
              <span className="risk-history__tooltip-label">Informational:</span>
              <span className="risk-history__tooltip-value" style={{ color: 'var(--color-neutral-600)' }}>
                {hoveredPoint.informational}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats outside timeline */}
      <div className="risk-history__summary">
        <div className="risk-history__summary-stats">
          <div className="risk-history__summary-stat">
            <div className="risk-history__summary-value" style={{ color: 'var(--color-fail)' }}>
              {visibleData.reduce((sum, p) => sum + p.blocking, 0)}
            </div>
            <div className="risk-history__summary-label">Total Blocking</div>
          </div>
          <div className="risk-history__summary-stat">
            <div className="risk-history__summary-value" style={{ color: 'var(--color-risk)' }}>
              {visibleData.reduce((sum, p) => sum + p.risk, 0)}
            </div>
            <div className="risk-history__summary-label">Total Risk</div>
          </div>
          <div className="risk-history__summary-stat">
            <div className="risk-history__summary-value" style={{ color: 'var(--color-neutral-600)' }}>
              {visibleData.reduce((sum, p) => sum + p.informational, 0)}
            </div>
            <div className="risk-history__summary-label">Total Info</div>
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="risk-history__footer">
          <p className="risk-history__more">
            Showing {maxVisible} of {riskData.length} data points
          </p>
        </div>
      )}
    </div>
  );
}
