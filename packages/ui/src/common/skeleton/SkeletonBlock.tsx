import React, { useMemo } from 'react';
import './skeleton.css';

export function SkeletonBlock({
  width = '100%',
  height = 120,
  radius = 12,
  seed
}: {
  width?: string;
  height?: number;
  radius?: number;
  seed?: number;
}): JSX.Element {
  const delay = useMemo(() => `${(seededVariance(seed ?? 2) % 90) / 100}s`, [seed]);
  return (
    <div
      className="skeleton skeleton-block"
      style={{ width, height, borderRadius: radius, animationDelay: delay }}
    />
  );
}

function seededVariance(seed: number): number {
  const x = Math.sin(seed * 1.1) * 10000;
  return Math.abs(x % 10);
}

