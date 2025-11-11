import { test, expect } from '@playwright/test';

test.describe('Browse Shows — letter bar → band pills', () => {
  test('clicking a letter shows band pills for that bucket', async ({ page }, testInfo) => {
    test.setTimeout(60_000);

    const logs: string[] = [];
    page.on('console', m => logs.push(`[console:${m.type()}] ${m.text()}`));
    page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

    await page.goto('/tradelist/shows/');

    // 1) Wait for the container to render (no JS function)
    const letterBar = page.locator('#letter-bar');
    await expect(letterBar).toBeVisible({ timeout: 30_000 });

    // 2) Wait until it actually has links: "All" + at least one letter
    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]');
    await expect.poll(async () => await letterLinks.count(), {
      timeout: 30_000,
    }).toBeGreaterThan(1);

    // Pick first real letter (skip "all")
    const firstLetterLink = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])').first();
    const selectedLetter = (await firstLetterLink.getAttribute('data-letter')) || '';
    await firstLetterLink.click();

    // Band pills visible
    const bandPillsWrap = page.locator('#band-pills');
    await expect(bandPillsWrap).toBeVisible({ timeout: 15_000 });

    const bandPills = bandPillsWrap.locator('.band-pill');
    const pillCount = await bandPills.count();
    expect(pillCount).toBeGreaterThanOrEqual(1);

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