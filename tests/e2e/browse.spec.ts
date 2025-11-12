import { test, expect } from '@playwright/test';

test.describe('Browse Shows — letter bar → band pills', () => {
  test('clicking a letter shows band pills for that bucket', async ({ page }) => {
    test.setTimeout(60_000);

    // Don’t wait for 'load' (can hang on CSS); DOM is enough.
    await page.goto('/tradelist/shows/', { waitUntil: 'domcontentloaded' });

    // Letter bar visible
    const letterBar = page.locator('#letter-bar');
    await expect(letterBar).toBeVisible({ timeout: 30_000 });

    // Wait until it has links: “All” + at least one real letter
    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]');
    await expect.poll(async () => await letterLinks.count(), { timeout: 30_000 })
      .toBeGreaterThan(1);

    // Click first real letter (skip “all”)
    const firstLetter = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])').first();
    await firstLetter.click();

    // Pills should appear
    const pillsWrap = page.locator('#band-pills');
    await expect(pillsWrap).toBeVisible({ timeout: 15_000 });

    const pills = pillsWrap.locator('.band-pill');
    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThan(0);
  });
});