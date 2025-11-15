import { test, expect } from '@playwright/test';

function randIndex(n: number) {
  return Math.floor(Math.random() * n);
}

async function getShowsCount(page: import('@playwright/test').Page) {
  const raw = await page.locator('#show-count-number').innerText();
  const m = raw.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

test.describe('Browse Shows', () => {
  test('Letters, Pills, Count, Dropdown, Table', async ({ page }) => {
    await test.step('Open Browse Shows', async () => {
      await page.goto('/tradelist/shows/', { waitUntil: 'domcontentloaded' });
    });

    const letterBar = page.locator('#letter-bar');
    await test.step('Wait for letter bar to be visible', async () => {
      await expect(letterBar).toBeVisible({ timeout: 15_000 });
    });

    const allLinks = page.locator('#letter-bar .nav-link[data-letter]');
    await test.step('Wait for letters to be populated', async () => {
      await expect.poll(async () => await allLinks.count(), { timeout: 30_000 })
        .toBeGreaterThan(1);
    });

    const letterLinks = page.locator('#letter-bar .nav-link[data-letter]:not([data-letter="all"])');
    let letterCount = 0;
    await test.step('Count available letter links (excluding "All")', async () => {
      letterCount = await letterLinks.count();
      await test.step('Assert there is at least one selectable letter', async () => {
        expect(letterCount).toBeGreaterThan(0);
      });
    });

    const randomLetterIdx = randIndex(letterCount);
    const randomLetter = letterLinks.nth(randomLetterIdx);
    const selectedLetter = (await randomLetter.getAttribute('data-letter')) || '';

    await test.step(`Click random letter: ${selectedLetter || '(unknown)'}`, async () => {
      await randomLetter.click();
    });

    let showsAfterLetter = 0;
    await test.step('Shows counter becomes > 0 after letter selection', async () => {
      await expect.poll(async () => await getShowsCount(page), { timeout: 20_000 })
        .toBeGreaterThan(0);
      showsAfterLetter = await getShowsCount(page);
    });

    const pillsWrap = page.locator('#band-pills');
    await test.step('Wait for band pills to appear', async () => {
      await expect(pillsWrap).toBeVisible({ timeout: 15_000 });
    });

    const pills = pillsWrap.locator('.band-pill');
    await test.step('Wait until at least one band pill is rendered', async () => {
      await expect.poll(async () => await pills.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    });

    if (selectedLetter && selectedLetter !== '#') {
      await test.step(`Verify at least one pill matches letter ${selectedLetter}`, async () => {
        const anyMatches = (await pills.allTextContents())
          .some(n => (n?.trim()?.[0] || '').toUpperCase() === selectedLetter.toUpperCase());
        expect(anyMatches).toBe(true);
      });
    }

    let pillsCount = 0;
    await test.step('Count rendered band pills for the selected letter', async () => {
      pillsCount = await page.locator('#band-pills').locator('.band-pill').count();
      expect(pillsCount).toBeGreaterThan(0);
    });

    const randomPillIdx = randIndex(pillsCount);
    const randomPill = pills.nth(randomPillIdx);
    const pillText = (await randomPill.textContent())?.trim() || '(unknown pill)';

    await test.step(`Click random band pill: ${pillText}`, async () => {
      await randomPill.click();
    });

    await test.step('Shows counter after pill selection', async () => {
      await expect.poll(async () => await getShowsCount(page), { timeout: 20_000 })
        .toBeGreaterThan(0);
      const showsAfterPill = await getShowsCount(page);

      if (pillsCount >= 2) {
        expect(showsAfterPill).not.toBe(showsAfterLetter);
      }
    });

    await test.step('Year filter becomes visible', async () => {
      await expect(page.locator('.year-filter')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Table shows at least one row', async () => {
      const rows = page.locator('#shows-table-body tr');
      await expect.poll(async () => await rows.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    });
  });
});