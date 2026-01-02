import assert from 'node:assert';

import { normalizeRun } from './normalize.js';

// Lightweight sanity checks; not executed in production paths.
function sampleRun(): any {
  return {
    runId: 'r1',
    schemaVersion: '1.0.0',
    projects: [
      {
        projectId: 'p1',
        name: 'p1',
        tests: [
          {
            testId: 't1',
            title: 'broken',
            status: 'failed',
            timing: { startTime: 'bad' },
            retries: undefined,
            steps: [
              {
                stepId: 's1',
                title: 'step',
                status: 'passed',
                timing: { startTime: 0 }
              }
            ],
            failure: {
              userLandFrames: [{ file: '41', line: null, column: -1 }],
              failedAt: { file: 'a/b/c.ts', line: 10, column: 2 }
            }
          }
        ]
      }
    ]
  };
}

// Allow opt-in execution to avoid side effects during normal builds.
if (process.env.ORBIS_NORMALIZE_TESTS === 'true') {
  const out = normalizeRun(sampleRun());
  assert.equal(out.projects.length, 1);
  const t = out.projects[0].tests[0];
  assert.ok(Array.isArray(t.steps));
  assert.ok(Array.isArray(t.attachments));
  assert.ok(Array.isArray(t.consoleLogs));
  assert.ok(Array.isArray(t.retries.attempts));
  assert.ok(Array.isArray(t.failure?.userLandFrames));
}

