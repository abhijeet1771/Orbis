import React, { useState, useMemo } from 'react';
import type { CausalChain, CausalNode, TestCaseResult } from '@orbisreport/core';
import { CausalChainTree } from './CausalChainTree';
import { CodeContextPanel } from './CodeContextPanel';
import { EvidencePanel } from './EvidencePanel';

/**
 * Causal Debugger v2 - Layout Shell
 *
 * 3-column layout for causal chain debugging:
 * Left: CausalChainTree | Center: CodeContext | Right: EvidencePanel
 *
 * Rules: No routing, no tabs, no scrolling between columns
 * State managed via React state, not URL
 */
export function CausalDebugger(): JSX.Element {
  // Mock causal chain data (in real implementation, this would come from props/API)
  const mockCausalChain: CausalChain = useMemo(() => ({
    rootFailureId: 'failure-1',
    nodes: [
      {
        id: 'failure-1',
        type: 'failure',
        title: 'Assertion failed: expected 200, received 500',
        subtitle: 'API login endpoint returned server error',
        location: { file: 'tests/auth.spec.ts', line: 25, column: 1 },
        codeSnippet: {
          language: 'typescript',
          content: 'expect(response.status).toBe(200);',
          highlightLines: [25]
        }
      },
      {
        id: 'method-1',
        type: 'method',
        title: 'login()',
        subtitle: 'tests/auth.spec.ts:20',
        location: { file: 'tests/auth.spec.ts', line: 20, column: 1 }
      },
      {
        id: 'caller-1',
        type: 'caller',
        title: 'authenticate()',
        subtitle: 'src/auth/service.ts:45',
        location: { file: 'src/auth/service.ts', line: 45, column: 1 }
      },
      {
        id: 'stepdef-1',
        type: 'stepdef',
        title: 'When user attempts to login',
        subtitle: 'Step 2 of 3',
        location: { file: 'tests/auth.spec.ts', line: 15, column: 1 },
        metadata: { stepId: 'step-2' }
      },
      {
        id: 'test-1',
        type: 'test',
        title: 'User Authentication Flow',
        subtitle: 'Test ID: test-123',
        location: { file: 'tests/auth.spec.ts', line: 10, column: 1 },
        metadata: {
          status: 'failed',
          tags: ['auth', 'login'],
          duration: 1250,
          retries: 1
        }
      },
      {
        id: 'feature-1',
        type: 'feature',
        title: 'Authentication',
        subtitle: 'tests/auth/',
        location: { file: 'tests/auth/', line: 1, column: 1 },
        metadata: {
          allTags: ['auth', 'login', 'security'],
          filePath: 'tests/auth/'
        }
      }
    ]
  }), []);

  // Mock test result data
  const mockTestResult: TestCaseResult = useMemo(() => ({
    testId: 'test-123',
    title: 'User Authentication Flow',
    location: { file: 'tests/auth.spec.ts', line: 10, column: 1 },
    tags: ['auth', 'login', 'security'],
    status: 'failed',
    timing: {
      startTime: Date.now() - 1250,
      endTime: Date.now(),
      durationMs: 1250
    },
    retries: { attempts: [{ status: 'failed' }, { status: 'passed' }] },
    steps: [
      {
        stepId: 'step-1',
        title: 'Given user is on login page',
        status: 'passed',
        timing: { startTime: Date.now() - 1250, endTime: Date.now() - 1000, durationMs: 250 }
      },
      {
        stepId: 'step-2',
        title: 'When user attempts to login',
        status: 'failed',
        timing: { startTime: Date.now() - 1000, endTime: Date.now() - 250, durationMs: 750 }
      },
      {
        stepId: 'step-3',
        title: 'Then user should be logged in',
        status: 'skipped',
        timing: { startTime: Date.now() - 250, endTime: Date.now(), durationMs: 0 }
      }
    ],
    failure: {
      message: 'Assertion failed: expected 200, received 500',
      expected: 200,
      actual: 500,
      stacktrace: 'at login (tests/auth.spec.ts:25:1)',
      failedAt: { file: 'tests/auth.spec.ts', line: 25, column: 1 },
      userLandFrames: [
        { function: 'login', file: 'tests/auth.spec.ts', line: 25 },
        { function: 'authenticate', file: 'src/auth/service.ts', line: 45 }
      ]
    },
    attachments: [
      { name: 'screenshot.png', contentType: 'image/png', body: new Uint8Array(1024) },
      { name: 'trace.json', contentType: 'application/json', body: new Uint8Array(512) }
    ]
  }), []);

  // State management via React state (not URL)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('failure-1'); // Start with failure node
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Get selected node from causal chain
  const selectedNode = selectedNodeId
    ? mockCausalChain.nodes.find(node => node.id === selectedNodeId) || null
    : null;

  return (
    <div className="causal-debugger">
      {/* Header */}
      <div className="causal-debugger__header">
        <div className="causal-debugger__title">
          {selectedNode && selectedNode.type === 'failure' && selectedNode.id ? (
            <span>
              Failure in {selectedNode.id}
            </span>
          ) : (
            <span>Causal Debugger</span>
          )}
        </div>
        <div className="causal-debugger__meta">
          {mockTestResult.identities && mockTestResult.identities.length > 0 && (
            <span className="causal-debugger__identity">
              {mockTestResult.identities[0].id}
            </span>
          )}
        </div>
      </div>

      {/* Left Column: Causal Chain Tree */}
      <div className="causal-debugger-left">
        <CausalChainTree
          causalChain={mockCausalChain}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          onNodeHover={setHoveredNodeId}
        />
      </div>

      {/* Center Column: Code Context */}
      <div className="causal-debugger-center">
        <CodeContextPanel
          selectedNode={selectedNode}
          causalChain={mockCausalChain}
        />
      </div>

      {/* Right Column: Evidence Panel */}
      <div className="causal-debugger-right">
        <EvidencePanel
          selectedNode={selectedNode}
          testResult={mockTestResult}
        />
      </div>
    </div>
  );
}
