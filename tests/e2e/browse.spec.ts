import { test, expect } from '@playwright/test';

function randIndex(n: number) {
  return Math.floor(Math.random() * n);
}

test.describe('Browse Shows — letter bar → band pills', () => {
  test('random letter → random band pill', async ({ page }) => {
    // If your baseURL already has /tradelist, use '/shows/' instead.
    await page.goto('/tradelist/shows/', { waitUntil: 'domcontentloaded' });

    // Letter bar visible
    const letterBar = page.locator('#letter-bar');
    await expect(letterBar).toBeVisible({ timeout: 15_000 });

    // Wait for links: “All” + at least one real letter
    const allLinks = page.locator('#letter-bar .nav-link[data-letter]');
    await expect.poll(async () => await allLinks.count(), { timeout: 30_000 })
      .toBeGreaterThan(1);

    // Choose a random letter (skip "all")
    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])');
    const letterCount = await letterLinks.count();
    expect(letterCount).toBeGreaterThan(0);

    const randomLetterIdx = randIndex(letterCount);
    const randomLetter = letterLinks.nth(randomLetterIdx);
    const selectedLetter = (await randomLetter.getAttribute('data-letter')) || '';
    await randomLetter.click();

    // Band pills should appear for that bucket
    const pillsWrap = page.locator('#band-pills');
    await expect(pillsWrap).toBeVisible({ timeout: 15_000 });

    const pills = pillsWrap.locator('.band-pill');
    await expect.poll(async () => await pills.count(), { timeout: 15_000 })
      .toBeGreaterThan(0);

    const pillCount = await pills.count();
    const randomPillIdx = randIndex(pillCount);
    const randomPill = pills.nth(randomPillIdx);

    // If it's not the "#", at least one pill should start with that letter
    if (selectedLetter && selectedLetter !== '#') {
      const anyMatches = (await pills.allTextContents())
        .some(n => (n?.trim()?.[0] || '').toUpperCase() === selectedLetter.toUpperCase());
      expect(anyMatches).toBe(true);
    }

    // Click a random band pill
    await randomPill.click();

    // Year filter should become visible (shown when one band selected)
    const yearFilter = page.locator('.year-filter');
    await expect(yearFilter).toBeVisible({ timeout: 10_000 });

    // And the table should start showing real rows (not just "Loading shows…")
    const rows = page.locator('#shows-table-body tr');
    await expect.poll(async () => await rows.count(), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });
});