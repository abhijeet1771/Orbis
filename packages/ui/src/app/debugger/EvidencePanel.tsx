import React, { useEffect, useState } from 'react';
import type { CausalNode, TestCaseResult } from '@orbisreport/core';

/**
 * Evidence Panel - Right Column Component
 *
 * Shows contextual evidence:
 * - Assertion diff
 * - Console logs
 * - Attachments
 * - Network payloads
 *
 * Updates AFTER code (slight delay)
 * Never empty → show "No evidence for this layer"
 */
export interface EvidencePanelProps {
  selectedNode: CausalNode | null;
  testResult: TestCaseResult | null;
}

export function EvidencePanel({ selectedNode, testResult }: EvidencePanelProps): JSX.Element {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Update evidence when selected node changes (with delay)
  useEffect(() => {
    if (!selectedNode || !testResult) {
      setEvidence([]);
      return;
    }

    setLoading(true);

    // Slight delay to show evidence AFTER code updates
    const timeoutId = setTimeout(() => {
      const contextualEvidence = gatherEvidenceForNode(selectedNode, testResult);
      setEvidence(contextualEvidence);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [selectedNode, testResult]);

  return (
    <div className="evidence-panel">
      <div className="evidence-panel__header">
        <h3>Evidence</h3>
        <span className="evidence-panel__count">
          {evidence.length} {evidence.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="evidence-panel__content">
        {loading ? (
          <div className="evidence-panel__loading">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
        ) : evidence.length > 0 ? (
          <div className="evidence-list">
            {evidence.map((item, index) => (
              <EvidenceItemComponent key={index} item={item} />
            ))}
          </div>
        ) : (
          <div className="evidence-panel__empty">
            <p>
              {selectedNode
                ? `No evidence available for ${selectedNode.type} layer`
                : 'Select a node to view evidence'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Gather contextual evidence for a specific node
 */
function gatherEvidenceForNode(node: CausalNode, testResult: TestCaseResult): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];

  switch (node.type) {
    case 'failure':
      // Show assertion diff and failure details
      if (testResult.failure) {
        evidence.push({
          type: 'assertion',
          title: 'Assertion Failure',
          content: formatAssertionDiff(testResult.failure),
          timestamp: testResult.timing.endTime
        });

        // Show user land frames if available
        if (testResult.failure.userLandFrames) {
          evidence.push({
            type: 'stacktrace',
            title: 'Call Stack',
            content: formatStackTrace(testResult.failure.userLandFrames),
            timestamp: testResult.timing.endTime
          });
        }
      }
      break;

    case 'method':
    case 'caller':
      // Show relevant console logs around this method
      const relevantLogs = filterLogsByNode(node, testResult);
      if (relevantLogs.length > 0) {
        evidence.push({
          type: 'console',
          title: 'Console Output',
          content: relevantLogs.join('\n'),
          timestamp: testResult.timing.endTime
        });
      }
      break;

    case 'stepdef':
      // Show step timing and any step-specific logs
      const stepIndex = testResult.steps.findIndex(step => step.stepId === node.metadata?.stepId);
      if (stepIndex >= 0) {
        const step = testResult.steps[stepIndex];
        evidence.push({
          type: 'timing',
          title: `Step ${stepIndex + 1} Timing`,
          content: `Duration: ${step.timing.durationMs}ms\nStatus: ${step.status}`,
          timestamp: step.timing.endTime
        });
      }
      break;

    case 'test':
      // Show test metadata and overall timing
      evidence.push({
        type: 'metadata',
        title: 'Test Metadata',
        content: formatTestMetadata(testResult),
        timestamp: testResult.timing.endTime
      });
      break;
  }

  // Add attachments if relevant to the node
  const relevantAttachments = filterAttachmentsByNode(node, testResult);
  relevantAttachments.forEach(attachment => {
    evidence.push({
      type: 'attachment',
      title: attachment.name || 'Attachment',
      content: `Type: ${attachment.contentType}\nSize: ${attachment.body?.length || 0} bytes`,
      timestamp: testResult.timing.endTime
    });
  });

  return evidence;
}

/**
 * Format assertion failure as diff
 */
function formatAssertionDiff(failure: TestCaseResult['failure']): string {
  if (!failure) return 'No failure details available';

  let diff = `Expected: ${failure.expected}\n`;
  diff += `Actual: ${failure.actual}\n`;
  if (failure.stacktrace) {
    diff += `\nStacktrace:\n${failure.stacktrace}`;
  }

  return diff;
}

/**
 * Format user land stack frames
 */
function formatStackTrace(frames: any[]): string {
  return frames
    .map(frame => `${frame.function || 'anonymous'} (${frame.file}:${frame.line})`)
    .join('\n');
}

/**
 * Filter console logs relevant to a node
 */
function filterLogsByNode(node: CausalNode, testResult: TestCaseResult): string[] {
  // In a real implementation, this would filter logs by timestamp proximity to the node
  // For now, return a subset of mock logs
  const mockLogs = [
    'INFO: Starting authentication process',
    'DEBUG: Validating user credentials',
    'WARN: Password validation failed',
    'ERROR: Authentication service returned 401'
  ];

  return mockLogs.slice(0, Math.floor(Math.random() * mockLogs.length) + 1);
}

/**
 * Format test metadata
 */
function formatTestMetadata(testResult: TestCaseResult): string {
  return `Status: ${testResult.status}\n` +
         `Duration: ${testResult.timing.durationMs}ms\n` +
         `Tags: ${testResult.tags.join(', ')}\n` +
         `Location: ${testResult.location.file}:${testResult.location.line}`;
}

/**
 * Filter attachments relevant to a node
 */
function filterAttachmentsByNode(node: CausalNode, testResult: TestCaseResult): any[] {
  // In a real implementation, this would filter by relevance to the node
  // For now, return a subset of attachments
  return testResult.attachments?.slice(0, Math.min(2, testResult.attachments.length)) || [];
}

/**
 * Individual evidence item component
 */
interface EvidenceItemComponentProps {
  item: EvidenceItem;
}

function EvidenceItemComponent({ item }: EvidenceItemComponentProps): JSX.Element {
  return (
    <div className={`evidence-item evidence-item--${item.type}`}>
      <div className="evidence-item__header">
        <div className="evidence-item__icon">
          <EvidenceTypeIcon type={item.type} />
        </div>
        <div className="evidence-item__title">{item.title}</div>
        {item.timestamp && (
          <div className="evidence-item__timestamp">
            {new Date(item.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="evidence-item__content">
        <pre>{item.content}</pre>
      </div>
    </div>
  );
}

/**
 * Icon for different evidence types
 */
function EvidenceTypeIcon({ type }: { type: EvidenceType }): JSX.Element {
  return (
    <div className={`evidence-icon evidence-icon--${type}`}>
      {/* Icons represented by CSS */}
    </div>
  );
}

/**
 * Evidence item interfaces
 */
interface EvidenceItem {
  type: EvidenceType;
  title: string;
  content: string;
  timestamp?: number;
}

type EvidenceType = 'assertion' | 'stacktrace' | 'console' | 'timing' | 'metadata' | 'attachment';
