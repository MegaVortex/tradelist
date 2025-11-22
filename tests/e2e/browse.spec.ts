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
	
    await test.step('Selecting 5 shows works, 6th triggers limit dialog', async () => {
      const cartButtons = page.locator('button.add-to-cart');
    
      // Helper: is a given button currently in "add" state and clickable?
      const isAddState = async (idx: number) => {
        const btn = cartButtons.nth(idx);
        if (await btn.count() === 0) return false;
    
        const cls = (await btn.getAttribute('class')) || '';
        const disabledAttr = await btn.getAttribute('disabled');
    
        const disabled = cls.includes('disabled') || disabledAttr !== null;
        const isAdd = cls.includes('btn-outline-success'); // green "add" state
    
        return isAdd && !disabled;
      };
    
      // Make sure we actually have some cart buttons
      const totalButtons = await cartButtons.count();
      expect(totalButtons).toBeGreaterThan(0);
    
      const selectedIndexes: number[] = [];
    
      // Click 5 different add-able buttons
      for (let i = 0; selectedIndexes.length < 5 && i < totalButtons; i++) {
        if (await isAddState(i)) {
          await cartButtons.nth(i).click();
          selectedIndexes.push(i);
        }
      }
    
      // We expect to have successfully added 5 shows
      expect(selectedIndexes.length).toBeGreaterThanOrEqual(5);
    
      // Now find another button that is still in "add" state (the 6th)
      let sixthIndex = -1;
      for (let i = 0; i < totalButtons; i++) {
        if (selectedIndexes.includes(i)) continue; // skip the 5 we already clicked
        if (await isAddState(i)) {
          sixthIndex = i;
          break;
        }
      }
    
      expect(sixthIndex).toBeGreaterThanOrEqual(0);
    
      // Prepare to capture the alert dialog
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept(); // close the alert
      });
    
      // This should trigger the "max 5 shows" alert
      await cartButtons.nth(sixthIndex).click();
    
      expect(dialogMessage).toContain('You can only select up to 5 shows');
    });

    const pagination = page.locator('#pagination-controls');
    const pageButtons = pagination.locator('button, a'); // all clickable items inside

    await test.step('Wait for pagination controls to appear', async () => {
      await expect(pagination).toBeVisible({ timeout: 15_000 });
      // Wait until we have at least a few clickable items (1, 2, 3, …, arrow)
      await expect.poll(async () => await pageButtons.count(), { timeout: 20_000 })
        .toBeGreaterThan(3);
    });

    await test.step('Go to page 2', async () => {
      const page2 = pagination.locator('button, a').filter({ hasText: /^2$/ }).first();
      await expect(page2).toBeVisible();
      await page2.click();
    });

    await test.step('Click Next (→) to advance one page', async () => {
      const nextArrow = pagination.locator('button, a').filter({ hasText: '→' }).first();
      await expect(nextArrow).toBeVisible();
      await nextArrow.click();
    });

    await test.step('Click last page number', async () => {
      const numericPages = pagination.locator('button, a').filter({ hasText: /^[0-9]+$/ });
      const count = await numericPages.count();
      expect(count).toBeGreaterThan(1);

      const lastPage = numericPages.nth(count - 1);
      await lastPage.click();
    });

    await test.step('Click one page before the last', async () => {
      const numericPages = pagination.locator('button, a').filter({ hasText: /^[0-9]+$/ });
      const count = await numericPages.count();
      expect(count).toBeGreaterThan(1);

      const prevToLast = numericPages.nth(count - 2);
      await prevToLast.click();
    });

    await test.step('Click Back (←) to go one page back', async () => {
      const prevArrow = pagination.locator('button, a').filter({ hasText: '←' }).first();
      // some UIs don’t show ← on last page; if it’s hidden, just skip this check
      if (await prevArrow.count()) {
        await prevArrow.click();
      }
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
      const texts = await labels.allTextContents();
      for (const t of texts) {
        expect(t.trim()).toMatch(/^[avm]$/i);
      }
    
      // data-kind must be one of audio|video|misc
      const allowedKinds = new Set(['audio', 'video', 'misc']);
      const n = await labels.count();
    
      for (let i = 0; i < n; i++) {
        const label = labels.nth(i);                        // 👈 define label here
        const kind = await label.getAttribute('data-kind');
        expect(kind && allowedKinds.has(kind)).toBe(true);
    
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
  
    // Find first camera icon
    const cameraButton = page
      .locator('span[role="button"]')
      .filter({ hasText: '📷' })
      .first();
  
    await test.step('Wait for a pics (📷) icon and open image modal', async () => {
      await expect.poll(async () => await cameraButton.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
      await cameraButton.click();
    });
  
    const modal = page.locator('#imageModal');
    const counter = page.locator('#imageCounter');
    const nextBtn = page.locator('#modalNext');
    const prevBtn = page.locator('#modalPrev');
    const closeBtn = page.locator('#modalClose');
  
    // Helper to parse "X / Y"
    const parseCounter = async () => {
      const text = (await counter.innerText()).trim(); // e.g. "1 / 4"
      const [curStr, totalStr] = text.split('/').map(s => s.trim());
      const current = parseInt(curStr, 10);
      const total = parseInt(totalStr, 10);
      return { current, total };
    };
  
    await test.step('Wait for modal and initial counter', async () => {
      await expect(modal).toBeVisible({ timeout: 10_000 });
      await expect(counter).toBeVisible({ timeout: 10_000 });
    });
  
    await test.step('Navigate with Next until last image', async () => {
      let { current, total } = await parseCounter();
      expect(total).toBeGreaterThanOrEqual(1);
  
      let safety = 0;
      while (current < total && safety < 20) {
        await nextBtn.click();
        await expect(counter).not.toHaveText(`${current} / ${total}`, { timeout: 5_000 });
        ({ current, total } = await parseCounter());
        safety++;
      }
  
      // We should be at the last image
      const final = await parseCounter();
      expect(final.current).toBe(final.total);
    });
  
    await test.step('Navigate with Prev back to first image', async () => {
      let { current, total } = await parseCounter();
      let safety = 0;
  
      while (current > 1 && safety < 20) {
        await prevBtn.click();
        await expect(counter).not.toHaveText(`${current} / ${total}`, { timeout: 5_000 });
        ({ current, total } = await parseCounter());
        safety++;
      }
  
      const final = await parseCounter();
      expect(final.current).toBe(1);
    });
  
    await test.step('Close modal', async () => {
      await closeBtn.click();
      await expect(modal).toBeHidden({ timeout: 10_000 });
    });

    const firstCartButton = page.locator('button.add-to-cart').first();
  
    await test.step('Wait for first cart button to be rendered', async () => {
      await expect
        .poll(async () => await firstCartButton.count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
    });
  
    // Helper: map element to logical state
    const getState = async () => {
      const cls = (await firstCartButton.getAttribute('class')) || '';
      const text = (await firstCartButton.innerText()).trim();
      const isAdd =
        cls.includes('btn-outline-success') || text.includes('➕');
      const isRemove =
        cls.includes('btn-outline-danger') || text.includes('❌');
      return { cls, text, isAdd, isRemove };
    };
  
    const initial = await getState();
  
    await test.step('Initial state is either "add" or "remove"', async () => {
      expect(initial.isAdd || initial.isRemove).toBe(true);
    });
  
    // --- Click once: state should flip ---
    await test.step('Click cart button (1st time) and wait for state change', async () => {
      await firstCartButton.click();
      // move mouse away so hover styles don't confuse us
      await page.mouse.move(0, 0);
  
      await expect
        .poll(async () => {
          const s = await getState();
          // logical state (add/remove) must differ from initial
          return s.isAdd !== initial.isAdd || s.isRemove !== initial.isRemove;
        }, { timeout: 10_000 })
        .toBe(true);
    });
  
    const afterFirstClick = await getState();
  
    await test.step('State after first click is opposite of initial', async () => {
      if (initial.isAdd) {
        expect(afterFirstClick.isRemove).toBe(true);
      } else if (initial.isRemove) {
        expect(afterFirstClick.isAdd).toBe(true);
      }
    });
  
    // --- Click again: should go back to original logical state ---
    await test.step('Click cart button (2nd time) and wait for state change back', async () => {
      await firstCartButton.click();
      await page.mouse.move(0, 0);
  
      await expect
        .poll(async () => {
          const s = await getState();
          // logical state equal to initial again
          return s.isAdd === initial.isAdd && s.isRemove === initial.isRemove;
        }, { timeout: 10_000 })
        .toBe(true);
    });
  
    const afterSecondClick = await getState();
  
    await test.step('State after second click matches initial state again', async () => {
      expect(afterSecondClick.isAdd).toBe(initial.isAdd);
      expect(afterSecondClick.isRemove).toBe(initial.isRemove);
    });
  });
});