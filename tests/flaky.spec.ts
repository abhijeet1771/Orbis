import { test, expect } from '@playwright/test';

test('flaky test that passes on retry', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  // Get current retry attempt (Playwright provides this via test.info())
  const retry = test.info().retry;
  
  console.log(`Flaky test attempt ${retry + 1}`);
  
  if (retry === 0) {
    // First attempt: intentional failure
    // Intentional wait: first attempt delay
    await page.waitForTimeout(4000);
    
    // This tests Orbis flaky detection and retry logic
    // Will fail because h1 likely doesn't have this exact text
    await expect(page.locator('h1')).toHaveText('This will fail on first attempt', { timeout: 1000 });
  } else {
    // Retry attempt: passes
    // Intentional wait: retry takes longer
    await page.waitForTimeout(6000);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test passes on retry after ~18-22 seconds total
  }
});

