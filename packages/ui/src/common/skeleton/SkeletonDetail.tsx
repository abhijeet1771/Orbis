import React from 'react';
import './skeleton.css';

export function SkeletonDetail(): JSX.Element {
  return (
    <div className="skeleton-detail">
      <div className="skeleton skeleton-line" style={{ width: '62%', height: 16, animationDelay: '0ms' }} />
      <div className="skeleton skeleton-line" style={{ width: '78%', height: 12, animationDelay: '40ms' }} />
      <div
        className="skeleton skeleton-block"
        style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 12, animationDelay: '80ms' }}
      />
      <div className="skeleton skeleton-line" style={{ width: '68%', height: 12, marginTop: 8, animationDelay: '120ms' }} />
      <div className="skeleton skeleton-line" style={{ width: '52%', height: 12, marginTop: 6, animationDelay: '140ms' }} />
    </div>
  );
}

