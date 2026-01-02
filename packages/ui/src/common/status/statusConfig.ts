export type OrbisStatus = 'passed' | 'failed' | 'flaky' | 'skipped' | 'running' | 'timedOut';

export type StatusSeverity = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface StatusVisual {
  label: string;
  severity: StatusSeverity;
  color: string;
  tint: string;
  border: string;
  icon: string;
}

const statusConfig: Record<OrbisStatus, StatusVisual> = {
  passed: {
    label: 'Passed',
    severity: 'success',
    color: '#8fbf9b',
    tint: 'rgba(143, 191, 155, 0.10)',
    border: 'rgba(143, 191, 155, 0.35)',
    icon: '✓'
  },
  failed: {
    label: 'Failed',
    severity: 'danger',
    color: '#f1695e',
    tint: 'rgba(241, 105, 94, 0.16)',
    border: 'rgba(241, 105, 94, 0.55)',
    icon: '✕'
  },
  flaky: {
    label: 'Flaky',
    severity: 'warning',
    color: '#f6c659',
    tint: 'rgba(246, 198, 89, 0.14)',
    border: 'rgba(246, 198, 89, 0.45)',
    icon: '≈'
  },
  skipped: {
    label: 'Skipped',
    severity: 'neutral',
    color: '#8d93a3',
    tint: 'rgba(141, 147, 163, 0.10)',
    border: 'rgba(141, 147, 163, 0.3)',
    icon: '–'
  },
  running: {
    label: 'Running',
    severity: 'info',
    color: '#71b7f2',
    tint: 'rgba(113, 183, 242, 0.14)',
    border: 'rgba(113, 183, 242, 0.45)',
    icon: '•'
  },
  timedOut: {
    label: 'Timed out',
    severity: 'danger',
    color: '#f28b65',
    tint: 'rgba(242, 139, 101, 0.16)',
    border: 'rgba(242, 139, 101, 0.55)',
    icon: '⏱'
  }
};

export function getStatusVisual(status: OrbisStatus): StatusVisual {
  return statusConfig[status] ?? statusConfig.failed;
}

