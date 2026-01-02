import { test, expect } from '@playwright/test';

test('test that fails due to API error', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  // Intentional wait: before triggering API call
  await page.waitForTimeout(5000);
  
  // Intercept API request and force 500 response
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
  
  // Console log for Live UI evidence
  console.log('API request intercepted, forcing 500 error');
  
  // Trigger API call (this will fail)
  // In a real scenario, this would be a fetch or XHR request
  // For this test, we'll simulate by navigating to a page that makes a request
  try {
    await page.goto('/api/test-endpoint', { timeout: 3000 });
  } catch (error) {
    // Expected to fail
  }
  
  // Intentional wait: after API failure
  await page.waitForTimeout(3000);
  
  // Assert failure condition
  // This tests Orbis network request failure detection
  const response = await page.request.get('http://localhost:3000/api/test-endpoint').catch(() => null);
  expect(response?.status()).toBe(500);
  
  // Test fails after ~15-18 seconds
});

