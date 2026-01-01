export function formatDateTime(epoch?: number): string {
  if (!epoch) return 'unknown';
  const d = new Date(epoch);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function formatDuration(ms: number): string {
  if (!ms || Number.isNaN(ms)) return '0 ms';
  if (ms < 1000) return `${ms} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const minutes = Math.floor(sec / 60);
  const seconds = Math.round(sec % 60);
  return `${minutes}m ${seconds}s`;
}

export function formatSummary(summary: {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  timedOut: number;
}): string {
  return `✓ ${summary.passed} · ✕ ${summary.failed} · ~ ${summary.flaky} · ☐ ${summary.skipped} · ⏱ ${summary.timedOut}`;
}

