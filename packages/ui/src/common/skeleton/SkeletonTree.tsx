import React from 'react';
import './skeleton.css';

export function SkeletonTree({ rows = 8 }: { rows?: number }): JSX.Element {
  return (
    <div className="skeleton-tree">
      {[...Array(rows)].map((_, idx) => (
        <div
          key={idx}
          className="skeleton skeleton-line"
          style={{
            width: `${62 + ((idx * 7) % 24)}%`,
            height: 12,
            animationDelay: `${(idx * 8) % 90}ms`
          }}
        />
      ))}
    </div>
  );
}

