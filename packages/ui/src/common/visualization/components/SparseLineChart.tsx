/**
 * Sparse Line Chart Component
 *
 * Allowed primitive for: history (max 2 lines, inflection points only)
 * Used for: pass rate over time, flakiness trend, stability trend
 */

import React from 'react';

export interface LineDataPoint {
  x: number; // Timestamp or index
  y: number; // Value
  label?: string;
  isInflection?: boolean; // Only show markers on meaningful changes
}

export interface LineSeries {
  id: string;
  name: string;
  data: LineDataPoint[];
  color: 'neutral' | 'failure' | 'risk' | 'stability';
}

export interface SparseLineChartProps {
  series: LineSeries[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  onPointClick?: (seriesId: string, point: LineDataPoint) => void;
  onPointHover?: (seriesId: string, point: LineDataPoint) => void;
  className?: string;
}

export function SparseLineChart({
  series,
  width = 400,
  height = 200,
  showGrid = true,
  showLabels = true,
  onPointClick,
  onPointHover,
  className = ''
}: SparseLineChartProps): JSX.Element {
  // Calculate scales
  const allPoints = series.flatMap(s => s.data);
  const xMin = Math.min(...allPoints.map(p => p.x));
  const xMax = Math.max(...allPoints.map(p => p.x));
  const yMin = Math.min(...allPoints.map(p => p.y));
  const yMax = Math.max(...allPoints.map(p => p.y));

  const xScale = (x: number) => ((x - xMin) / (xMax - xMin)) * (width - 80) + 40;
  const yScale = (y: number) => height - 40 - ((y - yMin) / (yMax - yMin)) * (height - 80);

  const gridLines = showGrid ? generateGridLines(xMin, xMax, yMin, yMax, width, height) : [];

  return (
    <div
      className={`sparse-line-chart ${className}`}
      style={{
        width,
        height,
        fontFamily: 'var(--font-family-primary)',
        position: 'relative',
        background: 'var(--color-background)',
        borderRadius: 'var(--depth-border-radius)',
        border: 'var(--depth-border-width-light) solid var(--color-border)'
      }}
    >
      {/* Grid */}
      {showGrid && (
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {gridLines.map((line, index) => (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--color-border)"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}
        </svg>
      )}

      {/* Series */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {series.map(seriesData => (
          <g key={seriesData.id}>
            {/* Line */}
            <path
              d={generatePath(seriesData.data, xScale, yScale)}
              fill="none"
              stroke={getLineColor(seriesData.color)}
              strokeWidth="2"
              opacity="0.8"
            />

            {/* Inflection points only */}
            {seriesData.data
              .filter(point => point.isInflection)
              .map((point, index) => (
                <circle
                  key={`${seriesData.id}-point-${index}`}
                  cx={xScale(point.x)}
                  cy={yScale(point.y)}
                  r="4"
                  fill={getLineColor(seriesData.color)}
                  stroke="var(--color-background)"
                  strokeWidth="2"
                  style={{ cursor: onPointClick ? 'pointer' : 'default' }}
                  onClick={() => onPointClick?.(seriesData.id, point)}
                  onMouseEnter={() => onPointHover?.(seriesData.id, point)}
                />
              ))}
          </g>
        ))}
      </svg>

      {/* Labels */}
      {showLabels && (
        <div
          className="sparse-line-chart__labels"
          style={{
            position: 'absolute',
            bottom: 8,
            left: 40,
            right: 20,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-ambient)'
          }}
        >
          <span>{formatValue(xMin)}</span>
          <span>{formatValue(xMax)}</span>
        </div>
      )}

      {/* Legend */}
      <div
        className="sparse-line-chart__legend"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {series.map(seriesData => (
          <div
            key={seriesData.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '2px',
                background: getLineColor(seriesData.color),
                opacity: 0.8
              }}
            />
            <span>{seriesData.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function generatePath(data: LineDataPoint[], xScale: (x: number) => number, yScale: (y: number) => number): string {
  if (data.length === 0) return '';

  const commands = data.map((point, index) => {
    const x = xScale(point.x);
    const y = yScale(point.y);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  });

  return commands.join(' ');
}

function generateGridLines(xMin: number, xMax: number, yMin: number, yMax: number, width: number, height: number) {
  const lines = [];

  // Horizontal grid lines (Y axis)
  for (let i = 0; i <= 4; i++) {
    const y = 40 + (i * (height - 80) / 4);
    lines.push({ x1: 40, y1: y, x2: width - 20, y2: y });
  }

  // Vertical grid lines (X axis)
  for (let i = 0; i <= 4; i++) {
    const x = 40 + (i * (width - 60) / 4);
    lines.push({ x1: x, y1: 20, x2: x, y2: height - 40 });
  }

  return lines;
}

function getLineColor(color: LineSeries['color']): string {
  const colors = {
    neutral: 'var(--color-neutral-500)',
    failure: 'var(--color-fail)',
    risk: 'var(--color-risk)',
    stability: 'var(--color-pass)'
  };
  return colors[color];
}

function formatValue(value: number): string {
  if (value % 1 !== 0) {
    return value.toFixed(1);
  }
  return value.toString();
}
