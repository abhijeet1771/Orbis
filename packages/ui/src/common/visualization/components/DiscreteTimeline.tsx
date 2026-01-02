/**
 * Discrete Timeline Component
 *
 * Allowed primitive for: events over executions (pass/fail/flaky states)
 * Used for: test history, regression detection, trust evolution
 */

import React from 'react';

export interface TimelineEvent {
  id: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'flaky' | 'skipped' | 'timed-out';
  runId: string;
  metadata?: Record<string, any>;
}

export interface DiscreteTimelineProps {
  events: TimelineEvent[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  onEventClick?: (event: TimelineEvent) => void;
  onEventHover?: (event: TimelineEvent) => void;
  className?: string;
}

export function DiscreteTimeline({
  events,
  width = 400,
  height = 100,
  showLabels = true,
  onEventClick,
  onEventHover,
  className = ''
}: DiscreteTimelineProps): JSX.Element {
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const startTime = sortedEvents[0]?.timestamp || Date.now();
  const endTime = sortedEvents[sortedEvents.length - 1]?.timestamp || Date.now() + 86400000; // +1 day

  const timeRange = endTime - startTime;
  const eventSpacing = Math.max(20, (width - 80) / Math.max(1, sortedEvents.length - 1));

  return (
    <div
      className={`discrete-timeline ${className}`}
      style={{
        width,
        height,
        fontFamily: 'var(--font-family-primary)',
        position: 'relative',
        background: 'var(--color-background)',
        borderRadius: 'var(--depth-border-radius)',
        border: 'var(--depth-border-width-light) solid var(--color-border)',
        padding: '16px 20px'
      }}
    >
      {/* Timeline axis */}
      <div
        className="discrete-timeline__axis"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '40px',
          right: '20px',
          height: '2px',
          background: 'var(--color-border)',
          opacity: 0.5
        }}
      />

      {/* Events */}
      <div className="discrete-timeline__events">
        {sortedEvents.map((event, index) => {
          const position = timeRange > 0
            ? ((event.timestamp - startTime) / timeRange) * (width - 60) + 40
            : 40 + (index * eventSpacing);

          return (
            <div
              key={event.id}
              className="discrete-timeline__event"
              style={{
                position: 'absolute',
                left: position - 8, // Center the dot
                bottom: '20px',
                width: '16px',
                height: '16px',
                cursor: onEventClick ? 'pointer' : 'default'
              }}
              onClick={() => onEventClick?.(event)}
              onMouseEnter={() => onEventHover?.(event)}
            >
              {/* Status dot */}
              <div
                className="discrete-timeline__dot"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: getStatusColor(event.status),
                  border: '2px solid var(--color-background)',
                  boxShadow: 'var(--depth-shadow-floating)',
                  transition: 'transform var(--motion-timing-scale-system-response) ease-out'
                }}
              />

              {/* Status indicator line */}
              <div
                className="discrete-timeline__line"
                style={{
                  position: 'absolute',
                  bottom: '-16px',
                  left: '6px',
                  width: '2px',
                  height: '12px',
                  background: getStatusColor(event.status),
                  opacity: 0.6
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && sortedEvents.length >= 2 && (
        <>
          {/* Start label */}
          <div
            className="discrete-timeline__label discrete-timeline__label--start"
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '20px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-ambient)',
              whiteSpace: 'nowrap'
            }}
          >
            {formatTimestamp(sortedEvents[0].timestamp)}
          </div>

          {/* End label */}
          <div
            className="discrete-timeline__label discrete-timeline__label--end"
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '20px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-ambient)',
              whiteSpace: 'nowrap'
            }}
          >
            {formatTimestamp(sortedEvents[sortedEvents.length - 1].timestamp)}
          </div>
        </>
      )}

      {/* Status legend */}
      <div
        className="discrete-timeline__legend"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '12px',
          fontSize: 'var(--font-size-xs)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-status-passed)'
            }}
          />
          <span style={{ color: 'var(--color-text-ambient)' }}>Pass</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-status-failed)'
            }}
          />
          <span style={{ color: 'var(--color-text-ambient)' }}>Fail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-status-flaky)'
            }}
          />
          <span style={{ color: 'var(--color-text-ambient)' }}>Flaky</span>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: TimelineEvent['status']): string {
  const colors = {
    passed: 'var(--color-status-passed)',
    failed: 'var(--color-status-failed)',
    flaky: 'var(--color-status-flaky)',
    skipped: 'var(--color-status-skipped)',
    'timed-out': 'var(--color-status-timed-out)'
  };
  return colors[status];
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
