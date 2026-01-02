import { test, expect } from '@playwright/test';

test('smoke test @smoke', async ({ page }) => {
  // Tagged test - unchanged behavior
  await page.goto('/');
  await page.waitForTimeout(2000);
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('regression test @regression', async ({ page }) => {
  // Tagged test - unchanged behavior
  await page.goto('/');
  await page.waitForTimeout(2000);
  const title = await page.title();
  expect(title).toBeTruthy();
});

