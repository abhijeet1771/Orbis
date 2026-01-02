import React from 'react';
import './skeleton.css';

export function SkeletonTable({
  rows = 5,
  columns = [160, 260, 120, 140, 140]
}: {
  rows?: number;
  columns?: number[];
}): JSX.Element {
  return (
    <div className="skeleton-table">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="skeleton-table__row" style={{ animationDelay: `${(r * 9) % 70}ms` }}>
          {columns.map((w, c) => (
            <div key={c} className="skeleton skeleton-line" style={{ width: w, height: 14, animationDelay: `${(r * 9 + c * 5) % 90}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

