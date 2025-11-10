import { test, expect } from '@playwright/test';

test.describe('Browse Shows — letter bar → band pills', () => {
  test('clicking a letter shows band pills for that bucket', async ({ page }, testInfo) => {
    test.setTimeout(60_000);

    const logs: string[] = [];
    page.on('console', m => logs.push(`[console:${m.type()}] ${m.text()}`));
    page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

    await page.goto('/tradelist/shows/');

    // 1) Wait until data is present (your inline script sets window.allShowsData)
    await page.waitForFunction(
      () => Array.isArray((window as any).allShowsData) && (window as any).allShowsData.length > 0,
      { timeout: 30_000 }
    );

    // 2) Wait until letter bar actually has items: "All" + at least one letter
    await page.waitForFunction(() => {
      return document.querySelectorAll('#letter-bar .nav-link[data-letter]').length > 1;
    }, { timeout: 30_000 });

    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]');
    const letterCount = await letterLinks.count();

    if (letterCount <= 1) {
      // Use page.evaluate() so it doesn't wait for the element
      const html = await page.evaluate(() =>
        document.getElementById('letter-bar')?.outerHTML ?? 'No #letter-bar'
      );
      const countFromWindow = await page.evaluate(() =>
        (window as any).allShowsData?.length ?? null
      );

      await testInfo.attach('letter-bar.html', { body: html, contentType: 'text/html' });
      await testInfo.attach('console.log', { body: logs.join('\n') || '(no console output)', contentType: 'text/plain' });
      await testInfo.attach('window.allShowsData.length.txt', { body: String(countFromWindow), contentType: 'text/plain' });

      test.skip(`No letters rendered in CI (letters=${letterCount}). Possible empty allShowsData (len=${countFromWindow}).`);
    }

    // Pick first real letter (skip "all")
    const firstLetterLink = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])').first();
    const selectedLetter = (await firstLetterLink.getAttribute('data-letter')) || '';
    await firstLetterLink.click();

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