import { test, expect } from '@playwright/test';

test.describe('Browse Shows — letter bar → band pills', () => {
  test('clicking a letter shows band pills for that bucket', async ({ page }) => {
    await page.goto('/shows/');

    const letterLinks = page.locator('#letter-bar .nav-link');
    await expect(letterLinks).toHaveCountGreaterThan(1);

    const firstLetterLink = letterLinks.nth(1);
    const selectedLetter = await firstLetterLink.getAttribute('data-letter');
    expect(selectedLetter).toBeTruthy();
    await firstLetterLink.click();

    const bandPillsWrap = page.locator('#band-pills');
    await expect(bandPillsWrap).toBeVisible();

    const bandPills = bandPillsWrap.locator('.band-pill');
    const pillCount = await bandPills.count();
    expect(pillCount).toBeGreaterThanOrEqual(1);


    const names = await bandPills.allTextContents();

    if (selectedLetter !== '#') {
      // at least one starts with the selected letter (case-insensitive)
      const anyMatches = names.some(n => (n?.trim()?.[0] || '').toUpperCase() === selectedLetter?.toUpperCase());
      expect(anyMatches).toBe(true);
    } else {
      // '#' bucket: at least one pill starts with a non A–Z
      const nonAZ = /^[^A-Z]/i;
      const anyNonAZ = names.some(n => nonAZ.test(n?.trim()?.[0] || ''));
      expect(anyNonAZ).toBe(true);
    }
  });
});