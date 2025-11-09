import { test, expect } from '@playwright/test';

test.describe('Browse Shows — letter bar → band pills', () => {
  test('clicking a letter shows band pills for that bucket', async ({ page }) => {
    // If this page is heavy to hydrate, give the test more time
    test.setTimeout(45_000);

    await page.goto('/tradelist/shows/');

    // Wait until the letter bar is actually populated by shows-table.js
    // It renders anchors like: #letter-bar .nav-link[data-letter]
    await page.waitForFunction(() => {
      const links = document.querySelectorAll('#letter-bar .nav-link[data-letter]');
      return links.length > 1; // "All" + at least one letter
    }, { timeout: 30_000 });

    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]');
    const count = await letterLinks.count();
    expect(count).toBeGreaterThan(1);

    // Pick the first real letter (skip data-letter="all")
    const firstLetterLink = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])').first();
    const selectedLetter = (await firstLetterLink.getAttribute('data-letter')) || '';
    await firstLetterLink.click();

    // Band pills should appear once a letter is selected
    const bandPillsWrap = page.locator('#band-pills');
    await expect(bandPillsWrap).toBeVisible({ timeout: 15_000 });

    const bandPills = bandPillsWrap.locator('.band-pill');
    const pillCount = await bandPills.count();
    expect(pillCount).toBeGreaterThanOrEqual(1);

    // Soft sanity: at least one pill fits the chosen bucket
    const names = await bandPills.allTextContents();
    if (selectedLetter !== '#') {
      const anyMatches = names.some(n => (n?.trim()?.[0] || '').toUpperCase() === selectedLetter.toUpperCase());
      expect(anyMatches).toBe(true);
    } else {
      const anyNonAZ = names.some(n => !/^[A-Z]/i.test((n?.trim()?.[0] || '')));
      expect(anyNonAZ).toBe(true);
    }
  });
});