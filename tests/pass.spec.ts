import { test, expect } from '@playwright/test';

test('simple passing test', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  // Intentional wait: allows Live UI to show test starting
  await page.waitForTimeout(4000);
  
  // Console log for Live UI evidence
  console.log('Pass test: checking page title');
  
  // Check page title
  const title = await page.title();
  expect(title).toBeTruthy();
  
  // Intentional wait: spreads execution time
  await page.waitForTimeout(3000);
  
  // Simple interaction
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  // Intentional wait: final delay before completion
  await page.waitForTimeout(5000);
  
  console.log('Pass test: completed successfully');
  
  // Test passes after ~12-15 seconds total
});

