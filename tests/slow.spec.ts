import { test, expect } from '@playwright/test';

test('slow test with multiple waits', async ({ page }) => {
  // Navigate to page
  await page.goto('/');
  
  console.log('Slow test: starting first wait');
  
  // First intentional wait
  await page.waitForTimeout(5000);
  
  // Simple check
  const body = page.locator('body');
  await expect(body).toBeVisible();
  
  console.log('Slow test: starting second wait');
  
  // Second intentional wait
  await page.waitForTimeout(6000);
  
  // Another check
  const title = await page.title();
  expect(title).toBeTruthy();
  
  console.log('Slow test: starting third wait');
  
  // Third intentional wait
  await page.waitForTimeout(5000);
  
  // Final check
  await expect(page.locator('html')).toBeVisible();
  
  console.log('Slow test: completed');
  
  // Test passes after ~18-20 seconds total
  // Used to test Live progress pacing
});

