/**
 * Horizontal Bars Component
 *
 * Allowed primitive for: comparisons, ranking, "top offenders"
 * Used for: longest running tests, most failing tests, risk concentration
 */

import React from 'react';

export interface HorizontalBarData {
  id: string;
  label: string;
  value: number;
  maxValue: number;
  color: 'neutral' | 'failure' | 'risk' | 'stability';
  metadata?: Record<string, any>;
}

export interface HorizontalBarsProps {
  data: HorizontalBarData[];
  width?: number;
  height?: number;
  showValues?: boolean;
  onBarClick?: (data: HorizontalBarData) => void;
  onBarHover?: (data: HorizontalBarData) => void;
  className?: string;
}

export function HorizontalBars({
  data,
  width = 400,
  height = 300,
  showValues = true,
  onBarClick,
  onBarHover,
  className = ''
}: HorizontalBarsProps): JSX.Element {
  const barHeight = 32;
  const barSpacing = 8;
  const labelWidth = 120;
  const valueWidth = showValues ? 60 : 0;

  const chartWidth = width - labelWidth - valueWidth - 40; // Margins

  return (
    <div
      className={`horizontal-bars ${className}`}
      style={{
        width,
        height,
        fontFamily: 'var(--font-family-primary)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)'
      }}
    >
      <div className="horizontal-bars__container">
        {data.map((item, index) => {
          const barWidth = (item.value / item.maxValue) * chartWidth;
          const y = index * (barHeight + barSpacing);

          return (
            <div
              key={item.id}
              className="horizontal-bars__item"
              style={{
                position: 'absolute',
                left: 0,
                top: y,
                width: width - 20,
                height: barHeight
              }}
              onClick={() => onBarClick?.(item)}
              onMouseEnter={() => onBarHover?.(item)}
            >
              {/* Label */}
              <div
                className="horizontal-bars__label"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: labelWidth,
                  height: barHeight,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--font-weight-medium)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.label}
              </div>

              {/* Bar */}
              <div
                className="horizontal-bars__bar"
                style={{
                  position: 'absolute',
                  left: labelWidth + 10,
                  top: (barHeight - 12) / 2, // Center vertically
                  width: chartWidth,
                  height: 12,
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--depth-border-radius)',
                  border: 'var(--depth-border-width-light) solid var(--color-border)'
                }}
              >
                <div
                  className="horizontal-bars__fill"
                  style={{
                    width: barWidth,
                    height: '100%',
                    background: getBarColor(item.color),
                    borderRadius: 'var(--depth-border-radius)',
                    transition: 'width var(--motion-timing-scale-system-response) ease-out'
                  }}
                />
              </div>

              {/* Value */}
              {showValues && (
                <div
                  className="horizontal-bars__value"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: valueWidth,
                    height: barHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-number-secondary)',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontVariantNumeric: 'var(--font-variant-numeric-tabular)'
                  }}
                >
                  {formatValue(item.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getBarColor(color: HorizontalBarData['color']): string {
  const colors = {
    neutral: 'var(--color-neutral-500)',
    failure: 'var(--color-fail)',
    risk: 'var(--color-risk)',
    stability: 'var(--color-pass)'
  };
  return colors[color];
}

function formatValue(value: number): string {
  // Format based on magnitude
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (value % 1 !== 0) {
    return value.toFixed(1);
  }
  return value.toString();
}
