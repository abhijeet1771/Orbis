/**
 * Phase 8.12 - Test Case View v2
 *
 * "Single test. Infinite clarity."
 *
 * Answers 5 questions about a single test:
 * 1. What is this test responsible for?
 * 2. What happened this run?
 * 3. Has this happened before?
 * 4. What evidence proves it?
 * 5. What should I do next?
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { TestRun, TestCaseResult } from '@orbisreport/core';
import { useRunData } from './data/useRunData';
import { useTrustIndex } from './data/useTrustIndex';
import { useRegression } from './data/useRegression';
import { formatDateTime, formatDuration } from './util/format';
import { EmptyState } from '../common/empty/EmptyState';
import { SkeletonBlock, SkeletonLine } from '../common/skeleton';
import { StatusBadge } from '../common/status/StatusBadge';
import { TrustBadge } from '../common/trust/TrustBadge';
import { RegressionBadge } from '../common/regression/RegressionBadge';
import type { TrustAssessment } from '../common/trust/trustScore';
import './test-case-view.css';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; run: TestRun; test: TestCaseResult };

export function TestCaseViewPage(): JSX.Element {
  const { runId, testId } = useParams<{ runId: string; testId: string }>();
  const navigate = useNavigate();
  const runState = useRunData(runId);
  const trustState = useTrustIndex(runId);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [showHistory, setShowHistory] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<'screenshot' | 'video' | 'trace' | 'logs'>('screenshot');

  useEffect(() => {
    if (runState.status === 'ready' && runState.run && testId) {
      const test = findTest(runState.run, testId);
      if (test) {
        setState({ status: 'ready', run: runState.run, test });
      } else {
        setState({ status: 'error', error: 'Test not found in this run' });
      }
    } else if (runState.status === 'loading' || runState.status === 'idle') {
      setState({ status: 'loading' });
    } else if (runState.status === 'error') {
      setState({ status: 'error', error: runState.error });
    }
  }, [runState, testId]);

  const trustByTestId = trustState.status === 'ready' ? trustState.trustByTestId : undefined;
  const regressionState = useRegression(runId, runState.run, trustByTestId);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'e':
          if (state.status === 'ready') {
            navigate(`/runs/${runId}/tests/${testId}/debugger`);
          }
          break;
        case 'h':
          setShowHistory(prev => !prev);
          break;
        case 'a':
          // Cycle through artifacts
          const artifacts = ['screenshot', 'video', 'trace', 'logs'] as const;
          const currentIndex = artifacts.indexOf(activeArtifact);
          const nextIndex = (currentIndex + 1) % artifacts.length;
          setActiveArtifact(artifacts[nextIndex]);
          break;
        case 'Escape':
          navigate(`/runs/${runId}/index`);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [state.status, runId, testId, navigate, activeArtifact]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="test-case-view">
        <div className="test-case-view__loading">
          <SkeletonLine width="60%" />
          <SkeletonLine width="40%" />
          <div style={{ marginTop: 24 }}>
            <SkeletonBlock height={200} />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="test-case-view">
        <EmptyState
          title="Test case not found"
          description={state.error}
          actionLabel="Back to execution index"
          onAction={() => navigate(`/runs/${runId}/index`)}
          size="md"
        />
      </div>
    );
  }

  const { run, test } = state;
  const trust = trustByTestId?.[test.testId];
  const regression = regressionState.status === 'ready' ? regressionState.regressions?.find(r => r.testId === test.testId) : undefined;

  return (
    <div className="test-case-view">
      {/* 1. Test Identity Header (STICKY) */}
      <div className="test-case-view__header">
        <div className="test-case-view__identity">
          <h1 className="test-case-view__title">{test.title}</h1>
          <div className="test-case-view__file-path">{test.location.file}</div>
          <div className="test-case-view__tags">
            {test.tags?.map(tag => (
              <span key={tag} className="test-case-view__tag">{tag}</span>
            ))}
          </div>
        </div>
        <div className="test-case-view__status">
          <StatusBadge status={test.status} />
        </div>
      </div>

      {/* 2. Run Summary Strip */}
      <div className="test-case-view__summary-strip">
        <div className="test-case-view__summary-item">
          <span className="test-case-view__summary-label">Status:</span>
          <StatusBadge status={test.status} />
        </div>
        <div className="test-case-view__summary-item">
          <span className="test-case-view__summary-label">Duration:</span>
          <span className="test-case-view__summary-value">
            {formatDuration(test.timing.durationMs ?? 0)}
          </span>
        </div>
        {test.retries?.attempts && test.retries.attempts.length > 0 && (
          <div className="test-case-view__summary-item">
            <span className="test-case-view__summary-label">Retries:</span>
            <span className="test-case-view__summary-value">
              {test.retries.attempts.length} → {test.status === 'passed' ? 'passed' : 'failed'}
            </span>
          </div>
        )}
        {trust && (
          <div className="test-case-view__summary-item">
            <span className="test-case-view__summary-label">Trust:</span>
            <TrustBadge trust={trust} />
          </div>
        )}
        {regression && (
          <div className="test-case-view__summary-item">
            <span className="test-case-view__summary-label">Regression:</span>
            <RegressionBadge regression={regression} />
          </div>
        )}
      </div>

      {/* 3. Evidence Panel */}
      <div className="test-case-view__evidence">
        <div className="test-case-view__narrative">
          <h3>What happened</h3>
          {test.failure ? (
            <div className="test-case-view__failure">
              <div className="test-case-view__failure-message">
                {test.failure.message}
              </div>
              {test.failure.userLandFrames && test.failure.userLandFrames.length > 0 && (
                <div className="test-case-view__failure-frame">
                  <div className="test-case-view__failure-location">
                    {test.failure.userLandFrames[0].file}:{test.failure.userLandFrames[0].line}
                  </div>
                  <button
                    className="test-case-view__failure-link"
                    onClick={() => navigate(`/runs/${runId}/tests/${testId}/debugger`)}
                  >
                    View in debugger →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="test-case-view__success">
              This test passed successfully.
            </div>
          )}
        </div>

        <div className="test-case-view__artifacts">
          <div className="test-case-view__artifact-tabs">
            {(['screenshot', 'video', 'trace', 'logs'] as const).map(artifact => (
              <button
                key={artifact}
                className={`test-case-view__artifact-tab ${
                  activeArtifact === artifact ? 'test-case-view__artifact-tab--active' : ''
                }`}
                onClick={() => setActiveArtifact(artifact)}
              >
                {artifact}
              </button>
            ))}
          </div>
          <div className="test-case-view__artifact-content">
            {renderArtifact(test, activeArtifact)}
          </div>
        </div>
      </div>

      {/* 4. Timeline View */}
      <div className="test-case-view__timeline">
        <h3>Test timeline</h3>
        <div className="test-case-view__timeline-events">
          <div className="test-case-view__timeline-event">
            <div className="test-case-view__timeline-time">
              {formatDateTime(test.timing.startTime)}
            </div>
            <div className="test-case-view__timeline-description">
              Test started
            </div>
          </div>

          {/* Add step events if available */}
          {test.steps?.map((step, index) => (
            <div key={step.stepId} className="test-case-view__timeline-event">
              <div className="test-case-view__timeline-time">
                {/* Approximate time based on step timing */}
                Step {index + 1}
              </div>
              <div className="test-case-view__timeline-description">
                {step.title} ({step.status})
              </div>
            </div>
          ))}

          <div className="test-case-view__timeline-event">
            <div className="test-case-view__timeline-time">
              {formatDateTime(test.timing.endTime ?? test.timing.startTime + (test.timing.durationMs ?? 0))}
            </div>
            <div className="test-case-view__timeline-description">
              Test {test.status === 'passed' ? 'completed successfully' : 'failed'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. History Section (COLLAPSED) */}
      <div className="test-case-view__history">
        <button
          className="test-case-view__history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide' : 'Show'} test history
        </button>

        {showHistory && (
          <div className="test-case-view__history-content">
            <Link to={`/tests/${testId}/history`} className="test-case-view__history-link">
              View full test history →
            </Link>
          </div>
        )}
      </div>

      {/* 6. Actions */}
      <div className="test-case-view__actions">
        <button
          className="test-case-view__action test-case-view__action--primary"
          onClick={() => navigate(`/runs/${runId}/tests/${testId}/debugger`)}
        >
          Open Debugger
        </button>
        <button
          className="test-case-view__action test-case-view__action--secondary"
          onClick={() => navigate(`/runs/${runId}/explorer?test=${testId}`)}
        >
          View in Explorer
        </button>
        <button
          className="test-case-view__action test-case-view__action--secondary"
          onClick={() => navigator.clipboard.writeText(testId)}
        >
          Copy Test ID
        </button>
      </div>
    </div>
  );
}

function findTest(run: TestRun, testId: string): TestCaseResult | undefined {
  for (const project of run.projects) {
    const found = project.tests.find(t => t.testId === testId);
    if (found) return found;
  }
  return undefined;
}

function renderArtifact(test: TestCaseResult, artifactType: 'screenshot' | 'video' | 'trace' | 'logs'): JSX.Element {
  // Find the relevant artifact
  const artifact = test.attachments?.find(att => att.type === artifactType);

  if (!artifact) {
    return (
      <div className="test-case-view__artifact-empty">
        No {artifactType} available for this test.
      </div>
    );
  }

  switch (artifactType) {
    case 'screenshot':
      return (
        <div className="test-case-view__artifact-image">
          <img src={`/${artifact.path}`} alt="Test screenshot" />
        </div>
      );
    case 'video':
      return (
        <div className="test-case-view__artifact-video">
          <video controls src={`/${artifact.path}`} />
        </div>
      );
    case 'trace':
      return (
        <div className="test-case-view__artifact-trace">
          <a href={`/${artifact.path}`} target="_blank" rel="noopener noreferrer">
            Download trace file
          </a>
        </div>
      );
    case 'logs':
      return (
        <div className="test-case-view__artifact-logs">
          <a href={`/${artifact.path}`} target="_blank" rel="noopener noreferrer">
            View logs
          </a>
        </div>
      );
    default:
      return <div>Unknown artifact type</div>;
  }
}
