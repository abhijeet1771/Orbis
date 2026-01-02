import { test, expect } from '@playwright/test';

test('test that fails with assertion error', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  // Intentional wait: allows Live UI to show test starting
  await page.waitForTimeout(5000);
  
  // Perform interaction
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  // Intentional wait: spreads execution before failure
  await page.waitForTimeout(4000);
  
  // Console log for Live UI evidence
  console.log('About to fail assertion...');
  
  // Incorrect assertion - will fail
  // This tests Orbis failure detection and debugger
  await expect(page.locator('h1')).toHaveText('This text does not exist', { timeout: 1000 });
  
  // This line never executes due to failure above
  // Failure occurs after ~12-15 seconds
});

