import { buildCausalChain } from './buildCausalChain.js';
import type { TestCaseResult } from '@orbisreport/core';

/**
 * Validation tests for buildCausalChain - Regression Guards
 * These functions validate edge cases and invariants
 */

// Test 1: Malformed stack should not crash
export function testMalformedStack(): boolean {
  const malformedTest: TestCaseResult = {
    testId: 'test-1',
    title: 'Malformed Stack Test',
    location: { file: 'test.ts', line: 1, column: 1 },
    tags: [],
    status: 'failed',
    timing: { startTime: 0, endTime: 100, durationMs: 100 },
    retries: { attempts: [], maxRetries: 0 },
    steps: [],
    failure: {
      message: 'Test failed',
      stacktrace: 'invalid stack trace format',
      failedAt: { file: 'test.ts', line: 1, column: 1 }
      // Missing userLandFrames - should not crash
    },
    attachments: []
  };

  try {
    const chain = buildCausalChain(malformedTest);

    // Validate invariants
    if (!chain || !chain.nodes || chain.nodes.length === 0) {
      console.error('❌ Malformed stack test failed: No chain returned');
      return false;
    }

    if (chain.nodes[0]?.type !== 'failure') {
      console.error('❌ Malformed stack test failed: Failure not first');
      return false;
    }

    if (chain.nodes.length < 3) {
      console.error('❌ Malformed stack test failed: Chain too short');
      return false;
    }

    console.log('✅ Malformed stack handled gracefully');
    return true;
  } catch (error) {
    console.error('❌ Malformed stack test failed with exception:', error);
    return false;
  }
}

// Test 2: Missing stepdef should still render chain
export function testMissingStepdef(): boolean {
  const noStepsTest: TestCaseResult = {
    testId: 'test-2',
    title: 'No Steps Test',
    location: { file: 'test.ts', line: 1, column: 1 },
    tags: [],
    status: 'failed',
    timing: { startTime: 0, endTime: 100, durationMs: 100 },
    retries: { attempts: [], maxRetries: 0 },
    steps: [], // No steps - should not crash
    failure: {
      message: 'Test failed',
      stacktrace: 'at test (test.ts:1:1)',
      failedAt: { file: 'test.ts', line: 1, column: 1 },
      userLandFrames: [
        { function: 'test', file: 'test.ts', line: 1, isUserLand: true }
      ]
    },
    attachments: []
  };

  try {
    const chain = buildCausalChain(noStepsTest);

    // Should have failure, method, test, feature (no stepdef)
    if (!chain || chain.nodes.length !== 4) {
      console.error('❌ Missing stepdef test failed: Wrong chain length');
      return false;
    }

    if (chain.nodes[0]?.type !== 'failure') {
      console.error('❌ Missing stepdef test failed: Failure not first');
      return false;
    }

    const hasStepdef = chain.nodes.some(node => node.type === 'stepdef');
    if (hasStepdef) {
      console.error('❌ Missing stepdef test failed: Should not have stepdef');
      return false;
    }

    console.log('✅ Missing stepdef handled gracefully');
    return true;
  } catch (error) {
    console.error('❌ Missing stepdef test failed with exception:', error);
    return false;
  }
}

// Test 3: Multiple retries should have single failure root
export function testMultipleRetries(): boolean {
  const retryTest: TestCaseResult = {
    testId: 'test-3',
    title: 'Retry Test',
    location: { file: 'test.ts', line: 1, column: 1 },
    tags: [],
    status: 'failed',
    timing: { startTime: 0, endTime: 300, durationMs: 300 },
    retries: {
      attempts: [
        { attempt: 1, status: 'failed', timing: { startTime: 0, endTime: 100, durationMs: 100 } },
        { attempt: 2, status: 'failed', timing: { startTime: 100, endTime: 200, durationMs: 100 } },
        { attempt: 3, status: 'failed', timing: { startTime: 200, endTime: 300, durationMs: 100 } }
      ],
      maxRetries: 3
    },
    steps: [
      {
        stepId: 'step-1',
        title: 'Step with failure',
        status: 'failed',
        timing: { startTime: 0, endTime: 100, durationMs: 100 }
      }
    ],
    failure: {
      message: 'Test failed after retries',
      stacktrace: 'at test (test.ts:1:1)',
      failedAt: { file: 'test.ts', line: 1, column: 1 },
      userLandFrames: [
        { function: 'test', file: 'test.ts', line: 1, isUserLand: true }
      ]
    },
    attachments: []
  };

  try {
    const chain = buildCausalChain(retryTest);

    if (!chain || chain.nodes.length !== 5) {
      console.error('❌ Multiple retries test failed: Wrong chain length');
      return false;
    }

    if (chain.nodes[0]?.type !== 'failure') {
      console.error('❌ Multiple retries test failed: Failure not first');
      return false;
    }

    if (chain.rootFailureId !== 'failure-test-3') {
      console.error('❌ Multiple retries test failed: Wrong root failure ID');
      return false;
    }

    console.log('✅ Multiple retries handled with single failure root');
    return true;
  } catch (error) {
    console.error('❌ Multiple retries test failed with exception:', error);
    return false;
  }
}

// Test 4: Effect → cause ordering validation
export function testEffectCauseOrdering(): boolean {
  const orderedTest: TestCaseResult = {
    testId: 'test-4',
    title: 'Ordering Test',
    location: { file: 'test.ts', line: 1, column: 1 },
    tags: [],
    status: 'failed',
    timing: { startTime: 0, endTime: 100, durationMs: 100 },
    retries: { attempts: [], maxRetries: 0 },
    steps: [
      {
        stepId: 'step-1',
        title: 'Failing step',
        status: 'failed',
        timing: { startTime: 0, endTime: 50, durationMs: 50 }
      }
    ],
    failure: {
      message: 'Assertion failed',
      stacktrace: 'at failingStep (test.ts:10:1)\nat caller (lib.ts:20:1)',
      failedAt: { file: 'test.ts', line: 10, column: 1 },
      userLandFrames: [
        { function: 'failingStep', file: 'test.ts', line: 10, isUserLand: true },
        { function: 'caller', file: 'lib.ts', line: 20, isUserLand: true }
      ]
    },
    attachments: []
  };

  try {
    const chain = buildCausalChain(orderedTest);

    if (!chain || chain.nodes.length !== 6) {
      console.error('❌ Ordering test failed: Wrong chain length');
      return false;
    }

    // Verify STRICT effect → cause ordering
    const expectedOrder = ['failure', 'method', 'caller', 'stepdef', 'test', 'feature'];
    const actualOrder = chain.nodes.map(node => node.type);

    if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
      console.error('❌ Ordering test failed: Wrong node order');
      console.error('Expected:', expectedOrder);
      console.error('Actual:', actualOrder);
      return false;
    }

    console.log('✅ Effect → cause ordering maintained');
    return true;
  } catch (error) {
    console.error('❌ Ordering test failed with exception:', error);
    return false;
  }
}

// Run all validation tests
export function runValidationTests(): boolean {
  console.log('\n🧪 Running Phase 8.14-J Validation Tests...\n');

  const tests = [
    testMalformedStack,
    testMissingStepdef,
    testMultipleRetries,
    testEffectCauseOrdering
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} threw exception:`, error);
      failed++;
    }
  }

  console.log(`\n📊 Validation Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All Phase 8.14-J validation tests passed!');
    return true;
  } else {
    console.error('❌ Some validation tests failed');
    return false;
  }
}
