import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  contextLabel?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Preserve console logging for diagnostics
    // eslint-disable-next-line no-console
    console.error('[Orbis ErrorBoundary]', this.props.contextLabel ?? 'app', error, info);
    this.setState({ info });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleHome = (): void => {
    const homeHref = '/ui/';
    window.location.assign(homeHref);
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    const details = [error?.message, error?.stack, info?.componentStack]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.subtitle}>
            {this.props.contextLabel
              ? `Something went wrong while loading ${this.props.contextLabel}.`
              : 'The application encountered an issue.'}
          </div>
          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={this.handleReload}>
              Reload page
            </button>
            <button style={styles.secondaryBtn} onClick={this.handleHome}>
              Go to Home
            </button>
          </div>
          {details ? (
            <details style={styles.details}>
              <summary style={styles.summary}>Technical details</summary>
              <pre style={styles.pre}>{details}</pre>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1116',
    color: '#e6e9f0',
    padding: '24px'
  },
  card: {
    maxWidth: 520,
    width: '100%',
    border: '1px solid #1f2533',
    borderRadius: 12,
    background: '#0b0d12',
    padding: '20px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8
  },
  subtitle: {
    color: '#9aa3b5',
    marginBottom: 16,
    lineHeight: 1.5
  },
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12
  },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #3a82f7',
    background: '#1b2436',
    color: '#e6e9f0',
    cursor: 'pointer'
  },
  secondaryBtn: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #1f2533',
    background: '#0b0d12',
    color: '#e6e9f0',
    cursor: 'pointer'
  },
  details: {
    marginTop: 8,
    color: '#9aa3b5'
  },
  summary: {
    cursor: 'pointer',
    marginBottom: 6
  },
  pre: {
    background: '#0f1320',
    padding: 12,
    borderRadius: 8,
    whiteSpace: 'pre-wrap',
    fontSize: 12,
    lineHeight: 1.4,
    border: '1px solid #1f2533'
  }
};

