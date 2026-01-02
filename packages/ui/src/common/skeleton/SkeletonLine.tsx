import React, { useMemo } from 'react';
import './skeleton.css';

export function SkeletonLine({
  width = '100%',
  height = 12,
  seed
}: {
  width?: string;
  height?: number;
  seed?: number;
}): JSX.Element {
  const variedWidth = useMemo(() => {
    if (typeof width === 'string' && width.includes('%')) {
      const base = parseFloat(width);
      const variance = seededVariance(seed ?? base);
      const next = Math.min(98, Math.max(60, base - variance));
      return `${next}%`;
    }
    return width;
  }, [width, seed]);

  const delay = useMemo(() => `${(seededVariance(seed ?? 1) % 80) / 100}s`, [seed]);

  return <div className="skeleton skeleton-line" style={{ width: variedWidth, height, animationDelay: delay }} />;
}

function seededVariance(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.abs(x % 8); // up to ~8% variance
}

