import type { TestCaseResult, ExternalIdentity } from '@orbisreport/core';
/**
 * Normalize identities for a test case result
 * Ensures identities array is valid, derives missing fields, drops malformed IDs
 * NEVER throws, logs once per run if fixes applied, idempotent
 */
export declare function normalizeIdentities(test: TestCaseResult, log?: {
    fixed: boolean;
}): TestCaseResult;
/**
 * Extract identities from test case data
 * Called by reporter to populate raw identities before normalization
 */
export declare function extractIdentities(test: TestCaseResult): ExternalIdentity[];
//# sourceMappingURL=identity.d.ts.map