#!/usr/bin/env node

/**
 * Validation runner for Phase 8.14-J Regression Guards
 * Execute with: node packages/server/src/causal/validate.ts
 */

import { runValidationTests } from './causalChain.test.js';

console.log('🚀 Orbis Phase 8.14-J Validation Runner');
console.log('=====================================\n');

const success = runValidationTests();

if (success) {
  console.log('\n✅ Phase 8.14-J Validation: PASSED');
  process.exit(0);
} else {
  console.log('\n❌ Phase 8.14-J Validation: FAILED');
  process.exit(1);
}
