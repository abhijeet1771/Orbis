/**
 * Execution History Component (Macro Story)
 *
 * Question: "How did the system behave over time?"
 * Visual: Horizontal execution timeline with discrete nodes
 * Each execution = one discrete node (Passed, Failed, Risky, Skipped)
 */

import React, { useState, useMemo } from 'react';
import { RunSummaryItem } from '../../api/client.js';

export interface ExecutionHistoryProps {
  runs: RunSummaryItem[];
  onRunClick?: (runId: string) => void;
  onRunHover?: (run: RunSummaryItem) => void;
  maxVisible?: number;
  className?: string;
}

export function ExecutionHistory({
  runs,
  onRunClick,
  onRunHover,
  maxVisible = 30,
  className = ''
}: ExecutionHistoryProps): JSX.Element {
  const [hoveredRun, setHoveredRun] = useState<RunSummaryItem | null>(null);

  // Sort runs by start time (newest first for timeline view)
  const sortedRuns = useMemo(() =>
    [...runs].sort((a, b) => (b.startTime ?? b.createdAt ?? 0) - (a.startTime ?? a.createdAt ?? 0)),
    [runs]
  );

  // Limit visible runs
  const visibleRuns = sortedRuns.slice(0, maxVisible);
  const hasMore = sortedRuns.length > maxVisible;

  const getRunStatus = (run: RunSummaryItem): 'passed' | 'failed' | 'risky' | 'skipped' => {
    if (run.summary.skipped > 0 && run.summary.passed === 0 && run.summary.failed === 0) {
      return 'skipped';
    }
    if (run.summary.failed > 0) {
      return 'failed';
    }
    if (run.summary.flaky > 0 || run.summary.timedOut > 0) {
      return 'risky';
    }
    return 'passed';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      passed: 'var(--color-status-passed)',
      failed: 'var(--color-status-failed)',
      risky: 'var(--color-status-flaky)',
      skipped: 'var(--color-neutral-500)'
    };
    return colors[status as keyof typeof colors] || colors.passed;
  };

  const formatRunTime = (run: RunSummaryItem): string => {
    const timestamp = run.startTime ?? run.createdAt;
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffHours < 24 * 7) {
      return `${Math.floor(diffHours / 24)}d ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`execution-history ${className}`}>
      <div className="execution-history__header">
        <h3 className="execution-history__title">Execution History</h3>
        <p className="execution-history__subtitle">How did the system behave over time?</p>
      </div>

      <div className="execution-history__timeline">
        <div className="execution-history__axis" />

        <div className="execution-history__runs">
          {visibleRuns.map((run, index) => {
            const status = getRunStatus(run);
            const isHovered = hoveredRun?.runId === run.runId;

            return (
              <div
                key={run.runId}
                className={`execution-history__run ${isHovered ? 'execution-history__run--hovered' : ''}`}
                style={{
                  left: `${(index / Math.max(visibleRuns.length - 1, 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
                onClick={() => onRunClick?.(run.runId)}
                onMouseEnter={() => {
                  setHoveredRun(run);
                  onRunHover?.(run);
                }}
                onMouseLeave={() => setHoveredRun(null)}
              >
                {/* Execution node */}
                <div
                  className="execution-history__node"
                  style={{
                    background: getStatusColor(status),
                    border: '2px solid var(--color-background)',
                    boxShadow: 'var(--depth-shadow-floating)'
                  }}
                />

                {/* Time label */}
                <div className="execution-history__time">
                  {formatRunTime(run)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover tooltip */}
        {hoveredRun && (
          <div className="execution-history__tooltip">
            <div className="execution-history__tooltip-header">
              <strong>{hoveredRun.runId.slice(-8)}</strong>
              <span>{formatRunTime(hoveredRun)}</span>
            </div>
            <div className="execution-history__tooltip-stats">
              <div className="execution-history__tooltip-stat">
                <span className="execution-history__tooltip-label">Pass Rate:</span>
                <span className="execution-history__tooltip-value">
                  {Math.round((hoveredRun.summary.passed / hoveredRun.summary.total) * 100)}%
                </span>
              </div>
              <div className="execution-history__tooltip-stat">
                <span className="execution-history__tooltip-label">Failures:</span>
                <span className="execution-history__tooltip-value">{hoveredRun.summary.failed}</span>
              </div>
              <div className="execution-history__tooltip-stat">
                <span className="execution-history__tooltip-label">Duration:</span>
                <span className="execution-history__tooltip-value">
                  {Math.round(hoveredRun.summary.durationMs / 1000)}s
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="execution-history__footer">
          <p className="execution-history__more">
            Showing {maxVisible} of {sortedRuns.length} executions
          </p>
        </div>
      )}
    </div>
  );
}
