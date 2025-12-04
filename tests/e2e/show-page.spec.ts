import { test, expect } from '@playwright/test';

function cartStateHelper(button: ReturnType<typeof test['info']> extends never ? any : any) {
}

async function getCartState(btn: import('@playwright/test').Locator) {
  const cls = (await btn.getAttribute('class')) || '';
  const text = (await btn.innerText()).trim();

  const isAdd =
    cls.includes('btn-outline-success') || text.includes('➕');
  const isRemove =
    cls.includes('btn-outline-danger') || text.includes('❌');

  return { cls, text, isAdd, isRemove };
}

test.describe('Regular show page', () => {
  test('Regular show page content', async ({ page }) => {
    await test.step('Open Browse Shows', async () => {
      await page.goto('/tradelist/shows/', { waitUntil: 'domcontentloaded' });
    });

    const rows = page.locator('#shows-table-body tr');
    await test.step('Wait for at least one show row', async () => {
      await expect
        .poll(async () => await rows.count(), { timeout: 20_000 })
        .toBeGreaterThan(0);
    });

    const ticketLink = page
      .locator('#shows-table-body tr a')
      .filter({ hasText: '🎫' })
      .first();

    await test.step('Wait for first ticket (🎫) link', async () => {
      await expect(ticketLink).toBeVisible({ timeout: 10_000 });
    });

    let showPage: import('@playwright/test').Page;
    await test.step('Open individual show page in a new tab', async () => {
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        ticketLink.click(),
      ]);
      showPage = popup;
      await showPage.waitForLoadState('domcontentloaded');
    });

    const cartButton = showPage
      .locator('button.add-to-cart.btn-outline-success.me-2, button.add-to-cart.btn-outline-danger.me-2')
      .first();

    await test.step('Wait for cart button on individual page', async () => {
      await expect
        .poll(async () => await cartButton.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    });

    const initial = await getCartState(cartButton);

    await test.step('Initial state is either "add" or "remove"', async () => {
      expect(initial.isAdd || initial.isRemove).toBe(true);
    });

    await test.step('Toggle cart state (1st click)', async () => {
      await cartButton.click();
      await showPage.mouse.move(0, 0);

      await expect
        .poll(async () => {
          const s = await getCartState(cartButton);
          return s.isAdd !== initial.isAdd || s.isRemove !== initial.isRemove;
        }, { timeout: 10_000 })
        .toBe(true);
    });

    const afterFirst = await getCartState(cartButton);

    await test.step('State after first click is opposite of initial', async () => {
      if (initial.isAdd) {
        expect(afterFirst.isRemove).toBe(true);
      } else if (initial.isRemove) {
        expect(afterFirst.isAdd).toBe(true);
      }
    });

    await test.step('Toggle cart state back (2nd click)', async () => {
      await cartButton.click();
      await showPage.mouse.move(0, 0);

      await expect
        .poll(async () => {
          const s = await getCartState(cartButton);
          return s.isAdd === initial.isAdd && s.isRemove === initial.isRemove;
        }, { timeout: 10_000 })
        .toBe(true);
    });

    const afterSecond = await getCartState(cartButton);

    await test.step('Final state matches initial', async () => {
      expect(afterSecond.isAdd).toBe(initial.isAdd);
      expect(afterSecond.isRemove).toBe(initial.isRemove);
    });
  });
});