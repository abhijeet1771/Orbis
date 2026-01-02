/**
 * Test History Component (Micro Story)
 *
 * Question: "Can I trust this test?"
 * Visual: Single-row timeline per test (dots, not bars)
 * States: Green (passed), Amber (flaky), Red (failed), Hollow (skipped)
 * Only one test at a time - trust is built from patterns, not counts
 */

import React, { useState } from 'react';

export interface TestExecution {
  runId: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'flaky' | 'skipped' | 'timed-out';
  duration?: number;
  failureMessage?: string;
  retryAttempts?: number;
}

export interface TestHistoryProps {
  testId: string;
  testTitle: string;
  executions: TestExecution[];
  onExecutionClick?: (runId: string, testId: string) => void;
  onExecutionHover?: (execution: TestExecution) => void;
  maxVisible?: number;
  className?: string;
}

export function TestHistory({
  testId,
  testTitle,
  executions,
  onExecutionClick,
  onExecutionHover,
  maxVisible = 30,
  className = ''
}: TestHistoryProps): JSX.Element {
  const [hoveredExecution, setHoveredExecution] = useState<TestExecution | null>(null);

  // Sort executions by timestamp (oldest first for timeline)
  const sortedExecutions = [...executions].sort((a, b) => a.timestamp - b.timestamp);
  const visibleExecutions = sortedExecutions.slice(-maxVisible); // Show most recent
  const hasMore = executions.length > maxVisible;

  const getStatusConfig = (status: TestExecution['status']) => {
    const configs = {
      passed: {
        color: 'var(--color-status-passed)',
        symbol: '●',
        label: 'Passed'
      },
      failed: {
        color: 'var(--color-status-failed)',
        symbol: '●',
        label: 'Failed'
      },
      flaky: {
        color: 'var(--color-status-flaky)',
        symbol: '●',
        label: 'Flaky'
      },
      skipped: {
        color: 'var(--color-neutral-500)',
        symbol: '○',
        label: 'Skipped'
      },
      'timed-out': {
        color: 'var(--color-status-failed)',
        symbol: '●',
        label: 'Timed Out'
      }
    };
    return configs[status] || configs.passed;
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`test-history ${className}`}>
      <div className="test-history__header">
        <h3 className="test-history__title">Test History</h3>
        <p className="test-history__subtitle">Can I trust this test?</p>
        <div className="test-history__test-info">
          <strong>{testTitle}</strong>
          <span className="test-history__test-id">{testId}</span>
        </div>
      </div>

      <div className="test-history__timeline">
        <div className="test-history__axis" />

        <div className="test-history__executions">
          {visibleExecutions.map((execution, index) => {
            const config = getStatusConfig(execution.status);
            const isHovered = hoveredExecution?.runId === execution.runId;

            return (
              <div
                key={`${execution.runId}-${testId}`}
                className={`test-history__execution ${isHovered ? 'test-history__execution--hovered' : ''}`}
                style={{
                  left: `${(index / Math.max(visibleExecutions.length - 1, 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
                onClick={() => onExecutionClick?.(execution.runId, testId)}
                onMouseEnter={() => {
                  setHoveredExecution(execution);
                  onExecutionHover?.(execution);
                }}
                onMouseLeave={() => setHoveredExecution(null)}
              >
                {/* Status dot */}
                <div
                  className="test-history__dot"
                  style={{
                    color: config.color,
                    fontSize: '16px',
                    lineHeight: 1,
                    cursor: 'pointer',
                    transition: 'transform var(--motion-timing-scale-system-response) ease-out'
                  }}
                >
                  {config.symbol}
                </div>

                {/* Time label (shows on hover) */}
                <div
                  className={`test-history__time ${isHovered ? 'test-history__time--visible' : ''}`}
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-ambient)',
                    whiteSpace: 'nowrap',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity var(--motion-timing-scale-system-response) ease-out'
                  }}
                >
                  {formatTimestamp(execution.timestamp)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="test-history__legend">
          <div className="test-history__legend-item">
            <span style={{ color: 'var(--color-status-passed)' }}>●</span>
            <span>Passed</span>
          </div>
          <div className="test-history__legend-item">
            <span style={{ color: 'var(--color-status-flaky)' }}>●</span>
            <span>Flaky</span>
          </div>
          <div className="test-history__legend-item">
            <span style={{ color: 'var(--color-status-failed)' }}>●</span>
            <span>Failed</span>
          </div>
          <div className="test-history__legend-item">
            <span style={{ color: 'var(--color-neutral-500)' }}>○</span>
            <span>Skipped</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredExecution && (
        <div className="test-history__tooltip">
          <div className="test-history__tooltip-header">
            <strong>Execution {hoveredExecution.runId.slice(-8)}</strong>
            <span>{formatTimestamp(hoveredExecution.timestamp)}</span>
          </div>
          <div className="test-history__tooltip-details">
            <div className="test-history__tooltip-detail">
              <span className="test-history__tooltip-label">Status:</span>
              <span className="test-history__tooltip-value" style={{ color: getStatusConfig(hoveredExecution.status).color }}>
                {getStatusConfig(hoveredExecution.status).label}
              </span>
            </div>
            <div className="test-history__tooltip-detail">
              <span className="test-history__tooltip-label">Duration:</span>
              <span className="test-history__tooltip-value">{formatDuration(hoveredExecution.duration)}</span>
            </div>
            {hoveredExecution.retryAttempts && hoveredExecution.retryAttempts > 0 && (
              <div className="test-history__tooltip-detail">
                <span className="test-history__tooltip-label">Retries:</span>
                <span className="test-history__tooltip-value">{hoveredExecution.retryAttempts}</span>
              </div>
            )}
            {hoveredExecution.failureMessage && (
              <div className="test-history__tooltip-detail">
                <span className="test-history__tooltip-label">Failure:</span>
                <span className="test-history__tooltip-value test-history__tooltip-failure">
                  {hoveredExecution.failureMessage.length > 50
                    ? `${hoveredExecution.failureMessage.slice(0, 50)}...`
                    : hoveredExecution.failureMessage}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasMore && (
        <div className="test-history__footer">
          <p className="test-history__more">
            Showing {maxVisible} of {executions.length} executions
          </p>
        </div>
      )}
    </div>
  );
}
