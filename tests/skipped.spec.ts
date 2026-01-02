import { test } from '@playwright/test';

test.skip('skipped test', async ({ page }) => {
  // This test is skipped - remains instant
  // Used to verify Orbis handles skipped tests correctly
  await page.goto('/');
});

