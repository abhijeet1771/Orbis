/**
 * History Entry Point System
 *
 * History is never a standalone page. You enter history from:
 * - Execution Index → Execution History
 * - Test Case View → Test History
 * - Executive Overview → Risk History
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExecutionHistory } from './components/ExecutionHistory.js';
import { TestHistory } from './components/TestHistory.js';
import { RiskHistory } from './components/RiskHistory.js';
import { historyStateManager, HistoryEntryPoint, DisclosureLevel } from './historyPhilosophy.js';
import type { RunSummaryItem } from '../api/client.js';
import type { TestExecution, RiskDataPoint } from './components/TestHistory.js';

export interface HistoryEntryPointProps {
  entryPoint: HistoryEntryPoint;
  context?: {
    testId?: string;
    testTitle?: string;
    executionId?: string;
  };
  data: {
    runs?: RunSummaryItem[];
    testExecutions?: TestExecution[];
    riskData?: RiskDataPoint[];
  };
  onClose?: () => void;
  className?: string;
}

export function HistoryEntryPoint({
  entryPoint,
  context = {},
  data,
  onClose,
  className = ''
}: HistoryEntryPointProps): JSX.Element {
  const navigate = useNavigate();
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>('summary');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize history state when entering
    const initialState = historyStateManager.enterHistory(entryPoint, context);
    setDisclosureLevel(initialState.disclosureLevel);
  }, [entryPoint, context]);

  const handleProgressDisclosure = () => {
    const nextLevel = historyStateManager.progressDisclosure();
    if (nextLevel) {
      setDisclosureLevel(nextLevel);
    }
  };

  const handleRunClick = (runId: string) => {
    // Navigate to Execution Index with this run focused
    navigate(`/runs/${runId}`);
    onClose?.();
  };

  const handleExecutionClick = (runId: string, testId: string) => {
    // Navigate to Debugger with historical context
    navigate(`/runs/${runId}/tests/${testId}/debugger`);
    onClose?.();
  };

  const handleRiskPointClick = (point: RiskDataPoint) => {
    // Navigate to filtered Execution Index showing risk period
    const date = new Date(point.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    navigate(`/runs?date=${dateStr}&filter=risky`);
    onClose?.();
  };

  const renderHistoryComponent = () => {
    switch (entryPoint) {
      case 'execution-index':
        return data.runs ? (
          <ExecutionHistory
            runs={data.runs}
            onRunClick={handleRunClick}
            maxVisible={30}
          />
        ) : (
          <div className="history__empty">No execution data available</div>
        );

      case 'test-case-view':
        return data.testExecutions && context.testId && context.testTitle ? (
          <TestHistory
            testId={context.testId}
            testTitle={context.testTitle}
            executions={data.testExecutions}
            onExecutionClick={handleExecutionClick}
            maxVisible={30}
          />
        ) : (
          <div className="history__empty">No test execution data available</div>
        );

      case 'executive-overview':
        return data.riskData ? (
          <RiskHistory
            riskData={data.riskData}
            onPointClick={handleRiskPointClick}
            maxVisible={30}
          />
        ) : (
          <div className="history__empty">No risk data available</div>
        );

      default:
        return <div className="history__empty">Unknown history entry point</div>;
    }
  };

  const getEntryTitle = () => {
    switch (entryPoint) {
      case 'execution-index':
        return 'Execution History';
      case 'test-case-view':
        return 'Test History';
      case 'executive-overview':
        return 'Risk History';
      default:
        return 'History';
    }
  };

  const getEntrySubtitle = () => {
    switch (entryPoint) {
      case 'execution-index':
        return 'How did the system behave over time?';
      case 'test-case-view':
        return 'Can I trust this test?';
      case 'executive-overview':
        return 'Is risk increasing or stabilizing?';
      default:
        return '';
    }
  };

  return (
    <div className={`history-entry-point ${className}`}>
      <div className="history-entry-point__header">
        <div className="history-entry-point__title-section">
          <h2 className="history-entry-point__title">{getEntryTitle()}</h2>
          <p className="history-entry-point__subtitle">{getEntrySubtitle()}</p>
        </div>

        {onClose && (
          <button
            className="history-entry-point__close"
            onClick={onClose}
            aria-label="Close history view"
          >
            ×
          </button>
        )}
      </div>

      <div className="history-entry-point__disclosure">
        <div className="history-entry-point__disclosure-level">
          <span className="history-entry-point__disclosure-label">View Level:</span>
          <span className="history-entry-point__disclosure-current">{disclosureLevel}</span>
        </div>

        <button
          className="history-entry-point__disclosure-progress"
          onClick={handleProgressDisclosure}
          disabled={disclosureLevel === 'evidence'}
        >
          {disclosureLevel === 'evidence' ? 'Full Detail' : 'Show More Detail'}
        </button>
      </div>

      <div className="history-entry-point__content">
        {isLoading ? (
          <div className="history-entry-point__loading">Loading history...</div>
        ) : (
          renderHistoryComponent()
        )}
      </div>

      <div className="history-entry-point__actions">
        <div className="history-entry-point__action-info">
          Click any point to explore in detail
        </div>
      </div>
    </div>
  );
}
