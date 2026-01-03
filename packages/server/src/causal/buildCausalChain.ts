import type { TestCaseResult, CausalChain, CausalNode, CausalNodeType } from '@orbisreport/core';

/**
 * Build a CausalChain from a TestCaseResult.
 * Generates human debugging causality (effect → cause), not execution order.
 */
export function buildCausalChain(test: TestCaseResult): CausalChain {
  const nodes: CausalNode[] = [];
  const rootFailureId = `failure-${test.testId}`;

  // 1. FAILURE NODE (assertion) - always first
  if (test.failure) {
    nodes.push({
      id: rootFailureId,
      type: 'failure',
      title: test.failure.message.split('\n')[0], // First line only
      subtitle: test.failure.expected !== undefined ? `Expected: ${String(test.failure.expected)}` : undefined,
      location: test.failure.failedAt || test.location,
      metadata: {
        stacktrace: test.failure.stacktrace,
        expected: test.failure.expected,
        actual: test.failure.actual
      }
    });
  }

  // 2. METHOD WHERE FAILURE OCCURRED
  if (test.failure?.failedAt) {
    const methodNode: CausalNode = {
      id: `method-${test.testId}`,
      type: 'method',
      title: extractMethodName(test.failure.failedAt),
      location: test.failure.failedAt
    };

    // Try to get code snippet if userLandFrames available
    if (test.failure.userLandFrames && test.failure.userLandFrames.length > 0) {
      const frame = test.failure.userLandFrames[0];
      methodNode.codeSnippet = {
        language: inferLanguage(frame.file),
        content: `// ${frame.function || 'anonymous'} at ${frame.file}:${frame.line}`,
        highlightLines: frame.line ? [frame.line] : undefined
      };
      methodNode.subtitle = frame.function || 'anonymous function';
    }

    nodes.push(methodNode);
  }

  // 3. CALLER METHOD(S) - one level only
  if (test.failure?.userLandFrames && test.failure.userLandFrames.length > 1) {
    // Skip the first frame (already used above), take the next one as caller
    const callerFrame = test.failure.userLandFrames[1];
    if (callerFrame) {
      nodes.push({
        id: `caller-${test.testId}`,
        type: 'caller',
        title: callerFrame.function || 'caller',
        subtitle: `called from ${callerFrame.file}:${callerFrame.line}`,
        location: {
          file: callerFrame.file,
          line: callerFrame.line || 1,
          column: callerFrame.column || 0
        },
        codeSnippet: {
          language: inferLanguage(callerFrame.file),
          content: `// Called from ${callerFrame.function || 'anonymous'} at ${callerFrame.file}:${callerFrame.line}`,
          highlightLines: callerFrame.line ? [callerFrame.line] : undefined
        }
      });
    }
  }

  // 4. STEP DEFINITION
  if (test.steps.length > 0) {
    // Find the step that contains the failure, or the last step
    const failedStep = test.steps.find(step => step.failure) || test.steps[test.steps.length - 1];

    if (failedStep) {
      nodes.push({
        id: `stepdef-${test.testId}`,
        type: 'stepdef',
        title: failedStep.title,
        subtitle: `Step ${test.steps.indexOf(failedStep) + 1} of ${test.steps.length}`,
        location: test.location, // Test location as proxy for step definition
        metadata: {
          stepId: failedStep.stepId,
          status: failedStep.status,
          duration: failedStep.timing.durationMs
        }
      });
    }
  }

  // 5. TEST INTENT
  nodes.push({
    id: `test-${test.testId}`,
    type: 'test',
    title: test.title,
    subtitle: `Test ID: ${test.testId}`,
    location: test.location,
    metadata: {
      status: test.status,
      tags: test.tags,
      duration: test.timing.durationMs,
      retries: test.retries?.attempts?.length || 0
    }
  });

  // 6. FEATURE / FOLDER GROUPING
  const featureNode: CausalNode = {
    id: `feature-${test.testId}`,
    type: 'feature',
    title: extractFeatureName(test.location.file, test.tags),
    subtitle: test.location.file.split('/').slice(-2).join('/'), // Last two path segments
    location: {
      file: test.location.file,
      line: 1,
      column: 0
    },
    metadata: {
      allTags: test.tags,
      filePath: test.location.file
    }
  };

  nodes.push(featureNode);

  // Dev assertion: Failure must always be first
  if (nodes[0]?.type !== 'failure') {
    console.warn('[orbis] Invalid causal chain order - failure node must be first');
  }

  return {
    rootFailureId,
    nodes
  };
}

/**
 * Extract method name from failure location
 */
function extractMethodName(location: { file: string; line: number; column?: number }): string {
  // In a real implementation, this might involve parsing the file or using debug info
  // For now, we'll use a simple heuristic based on the location
  const fileName = location.file.split('/').pop()?.split('.')[0] || 'unknown';
  return `${fileName} (line ${location.line})`;
}

/**
 * Infer programming language from file extension
 */
function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'cs':
      return 'csharp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    default:
      return 'text';
  }
}

/**
 * Extract feature/grouping name from file path and tags
 */
function extractFeatureName(filePath: string, tags: string[]): string {
  // Try to extract meaningful grouping from tags first
  const featureTag = tags.find(tag => tag.startsWith('@feature-') || tag.startsWith('feature:'));
  if (featureTag) {
    return featureTag.replace(/^(@feature-|feature:)/, '');
  }

  // Fallback to folder structure
  const pathParts = filePath.split('/');
  if (pathParts.length >= 2) {
    // Use second-to-last directory as feature name
    const featureDir = pathParts[pathParts.length - 2];
    if (featureDir && featureDir !== 'tests' && featureDir !== 'spec' && featureDir !== 'src') {
      return featureDir;
    }
  }

  // Final fallback to file directory
  const fileDir = pathParts.slice(-2, -1)[0];
  return fileDir || 'tests';
}
