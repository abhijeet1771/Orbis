import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TestRun } from '@orbisreport/core';
import { computeRegressions } from '../common/regression/regression.js';
import { useTrustIndex } from '../app/data/useTrustIndex.js';
import './ExecutiveFTX.css';

interface ExecutiveFTXProps {
  run: TestRun;
  workspaceId: string;
  onComplete: () => void;
}

const STORAGE_KEY_PREFIX = 'orbis.ftx.seen.';

export function ExecutiveFTX({ run, workspaceId, onComplete }: ExecutiveFTXProps): JSX.Element {
  const [visibleStates, setVisibleStates] = useState({
    line1: false,
    line2: false,
    authority: false,
    explanation: false,
    actions: false
  });

  const trustState = useTrustIndex(run.runId);
  const trustByTestId = trustState.status === 'ready' ? trustState.trustByTestId : undefined;
  const regressions = trustByTestId ? computeRegressions(run, undefined, trustByTestId) : undefined;

  const totalTests = run.summary.total;
  const failures = run.summary.failed;
  const criticalRegressions = regressions ? regressions.byTestId.length : 0;

  // Determine readiness status
  const readinessScore = Math.min(100, Math.max(0,
    100 - (run.summary.failed * 8) - (run.summary.flaky * 10) - (criticalRegressions * 5)
  ));

  let readinessText = 'GO';
  let readinessColor = '#10b981'; // soft green

  if (readinessScore < 80) {
    readinessText = 'GO WITH RISK';
    readinessColor = '#f59e0b'; // amber
  }
  if (readinessScore < 60) {
    readinessText = 'NO-GO';
    readinessColor = '#ef4444'; // muted red
  }

  useEffect(() => {
    // Start the sequence
    const timeouts = [
      setTimeout(() => setVisibleStates(s => ({ ...s, line1: true })), 1200),
      setTimeout(() => setVisibleStates(s => ({ ...s, line2: true })), 1800),
      setTimeout(() => setVisibleStates(s => ({ ...s, authority: true })), 2600),
      setTimeout(() => setVisibleStates(s => ({ ...s, explanation: true })), 3200),
      setTimeout(() => setVisibleStates(s => ({ ...s, actions: true })), 4200)
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleActionClick = () => {
    // Save FTX as seen for this workspace
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${workspaceId}`, 'true');
    onComplete();
  };

  return (
    <div className="orbis-ftx-root">
      <header className="orbis-ftx-header">
        <span className="logo">Orbis</span>
        <span className="mode">Executive Intelligence</span>
      </header>

      <main className="orbis-ftx-center">
        <div className="ftx-content">
          <div
            className={`ftx-line1 ${visibleStates.line1 ? 'visible' : ''}`}
          >
            This run has been analyzed.
          </div>

          <div className="awareness-line">
            <div className="center-pulse" />
          </div>

          <div
            className={`ftx-line2 ${visibleStates.line2 ? 'visible' : ''}`}
          >
            {totalTests} tests · {failures} failures · {criticalRegressions === 0 ? 'No' : criticalRegressions} critical regressions
          </div>

          <div
            className={`ftx-authority ${visibleStates.authority ? 'visible' : ''}`}
          >
            Release Readiness: <span style={{ color: readinessColor }}>{readinessText}</span>
          </div>

          <div
            className={`ftx-explanation ${visibleStates.explanation ? 'visible' : ''}`}
          >
            Based on trusted failures, historical stability, and regression signals.
          </div>
        </div>

        <nav className={`ftx-actions ${visibleStates.actions ? 'visible' : ''}`}>
          <Link to={`/runs/${run.runId}/index`} onClick={handleActionClick}>
            View Execution Index
          </Link>
          <span className="separator">·</span>
          <Link to={`/runs/${run.runId}/index`} onClick={handleActionClick}>
            Inspect Failures
          </Link>
          <span className="separator">·</span>
          <Link to={`/tests/${run.projects[0]?.tests[0]?.testId}/history`} onClick={handleActionClick}>
            Explore History
          </Link>
        </nav>
      </main>
    </div>
  );
}
