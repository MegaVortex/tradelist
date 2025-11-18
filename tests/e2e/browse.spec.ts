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
	
    await test.step('At least two band labels are present', async () => {
      const bandLabels = page.locator('.band-label');
      await expect.poll(async () => await bandLabels.count(), { timeout: 10_000 })
        .toBeGreaterThan(1);
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
	
    // --- Year dropdown: pick a random year and assert changes ---
    let showsBeforeYear = await getShowsCount(page);
    
    await test.step('Open year dropdown', async () => {
      await page.locator('#yearFilterBtn').click();
    });
    
    // Wait for menu items to appear
    const allYearItems = page.locator('#yearMenu .dropdown-item');
    await expect.poll(async () => await allYearItems.count(), { timeout: 10_000 })
      .toBeGreaterThan(0);
    
    // Exclude the "All years" option; pick from real years
    const yearItems = allYearItems.filter({ hasText: /^(?!All years$).+/ });
    const yearCount = await yearItems.count();
    expect(yearCount).toBeGreaterThan(0);
    
    const yearIdx = randIndex(yearCount);
    const yearToPick = yearItems.nth(yearIdx);
    const yearText = (await yearToPick.textContent())?.trim() || '';
    
    await test.step(`Select random year: ${yearText}`, async () => {
      await yearToPick.click();
    });
    
    // Button caption should reflect the selection
    await test.step('Year button reflects selection', async () => {
      await expect(page.locator('#yearFilterBtn')).toContainText(yearText, { timeout: 10_000 });
    });
    
    // Counter should remain > 0 and typically narrow (<= previous)
    await test.step('Shows counter reflects year filter', async () => {
      await expect.poll(async () => await getShowsCount(page), { timeout: 20_000 })
        .toBeGreaterThan(0);
      const afterYear = await getShowsCount(page);
      if (showsBeforeYear > 0) {
        expect(afterYear).toBeLessThanOrEqual(showsBeforeYear);
      }
    });

    await test.step('Table has at least 12 columns', async () => {
      const thCount = await page.locator('#shows-table thead th').count();
      expect(thCount).toBeGreaterThanOrEqual(12);
    });

    await test.step('At least one valid category label is present', async () => {
      const categoryLabels = page.locator('.category-label');
      await expect.poll(async () => await categoryLabels.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);

      const texts = (await categoryLabels.allTextContents()).map(t => t.trim());
      const allowed = ['🎥 Video', '🎥 Misc', '🎥 Compilation', '🔊 Audio'];
      const anyValid = texts.some(t => allowed.includes(t));
      expect(anyValid).toBe(true);
    });

    await test.step('At least one year label is present', async () => {
      const yearLabels = page.locator('.year-label');
      await expect.poll(async () => await yearLabels.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    });

    await test.step('Table shows at least one row', async () => {
      const rows = page.locator('#shows-table-body tr');
      await expect.poll(async () => await rows.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    });
	
    await test.step('Type label is a/v/m with correct kind', async () => {
      const labels = page.getByTestId('type-label');
    
      // Wait until at least one label exists
      await expect.poll(async () => await labels.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    
      // Text must be a/v/m
      for (const t of (await labels.allTextContents())) {
        expect(t.trim()).toMatch(/^[avm]$/i);
      }
    
      // data-kind must be one of audio|video|misc
      const allowed = new Set(['audio', 'video', 'misc']);
      const n = await labels.count();
      for (let i = 0; i < n; i++) {
        const kind = await labels.nth(i).getAttribute('data-kind');
        expect(kind && allowed.has(kind)).toBe(true);
		
        // Extra rule: for video rows, require at least one resolution badge
        if (kind === 'video') {
          const resBadges = label.locator(
            'xpath=ancestor::tr[1]//span[contains(@class,"res-badge")]'
          );
          const resCount = await resBadges.count();
          expect(resCount).toBeGreaterThan(0);
        }
      }
    });
  });
});