import type { TestStatus } from '@orbisreport/core';

const statusClass: Record<TestStatus, string> = {
  passed: 'pill pill--passed',
  failed: 'pill pill--failed',
  skipped: 'pill pill--skipped',
  flaky: 'pill pill--flaky',
  timedOut: 'pill pill--timedOut'
};

const statusLabel: Record<TestStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  flaky: 'Flaky',
  timedOut: 'Timed Out'
};

export function StatusPill({ status }: { status: TestStatus }): JSX.Element {
  return <span className={statusClass[status]}>{statusLabel[status]}</span>;
}

