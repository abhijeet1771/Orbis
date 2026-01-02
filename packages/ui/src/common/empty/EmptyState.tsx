import React from 'react';
import './empty.css';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
};

const sizeStyles: Record<NonNullable<EmptyStateProps['size']>, React.CSSProperties> = {
  sm: { padding: '16px', maxWidth: 420 },
  md: { padding: '20px', maxWidth: 520 },
  lg: { padding: '24px', maxWidth: 640 }
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  size = 'md'
}: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-container">
      <div className="empty-card" style={sizeStyles[size]}>
        <div className="empty-title">{title}</div>
        {description ? <div className="empty-description">{description}</div> : null}
        {actionLabel && onAction ? (
          <button className="empty-action" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

