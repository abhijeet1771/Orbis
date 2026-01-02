import { test, expect } from '@playwright/test';

// Helper B: waits and fails
async function helperB(page: any): Promise<void> {
  console.log('Helper B: starting...');
  console.log('Helper B: about to wait 4 seconds');
  
  // Intentional wait: helper B delay
  await page.waitForTimeout(4000);
  
  console.log('Helper B: about to fail assertion');
  
  // This will fail - tests failure path depth
  await expect(page.locator('h1')).toHaveText('This will fail', { timeout: 1000 });
}

// Helper A: calls Helper B
async function helperA(page: any): Promise<void> {
  console.log('Helper A: starting...');
  console.log('Helper A: about to wait 3 seconds before calling Helper B');
  
  // Intentional wait: helper A delay before calling B
  await page.waitForTimeout(3000);
  
  console.log('Helper A: calling Helper B');
  
  // Call Helper B (which will fail)
  await helperB(page);
}

test('test with nested helper failures', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  console.log('Nested failure test: starting');
  console.log('Nested failure test: about to wait 3 seconds before Helper A');
  
  // Intentional wait: test body delay before helper A
  await page.waitForTimeout(3000);
  
  console.log('Nested failure test: calling Helper A');
  
  // Call Helper A (which calls Helper B, which fails)
  // This tests:
  // - Failure path depth in Debugger
  // - Call hierarchy reconstruction
  // - Source navigation through stack frames
  await helperA(page);
  
  // This line never executes due to nested failure
  // Total time ~15-20 seconds before failure
});

