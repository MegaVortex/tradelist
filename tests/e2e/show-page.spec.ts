import { test, expect } from '@playwright/test';
import { openCartModal, closeCartModal } from './helpers/ui';

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
  test('Regular show page cart → open cart modal → remove from cart', async ({ page }) => {
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
      .locator(
        'button.add-to-cart.btn-outline-success.me-2, ' +
        'button.add-to-cart.btn-outline-danger.me-2'
      )
      .first();

    await test.step('Wait for cart button on individual page', async () => {
      await expect
        .poll(async () => await cartButton.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    });

    let state = await getCartState(cartButton);

    await test.step('Ensure cart button starts in "add" state', async () => {
      if (state.isAdd) return;

      if (state.isRemove) {
        await cartButton.click();
        await showPage.mouse.move(0, 0);

        await expect
          .poll(async () => {
            const s = await getCartState(cartButton);
            return s.isAdd;
          }, { timeout: 10_000 })
          .toBe(true);

        state = await getCartState(cartButton);
        expect(state.isAdd).toBe(true);
      } else {
        throw new Error('Cart button is in neither add nor remove state');
      }
    });

    await test.step('Add show to cart from show page', async () => {
      await cartButton.click();
      await showPage.mouse.move(0, 0);

      await expect
        .poll(async () => {
          const s = await getCartState(cartButton);
          return s.isRemove;
        }, { timeout: 10_000 })
        .toBe(true);
    });

    await test.step('Open cart modal from show page', async () => {
      await openCartModal(showPage);
      const cartModal = showPage.locator('#cartModal');
      await expect(cartModal).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Close cart modal', async () => {
      await closeCartModal(showPage);
      const cartModal = showPage.locator('#cartModal');
      await expect(cartModal).toBeHidden({ timeout: 10_000 });
    });

    await test.step('Remove show from cart on show page', async () => {
      await cartButton.click();
      await showPage.mouse.move(0, 0);

      await expect
        .poll(async () => {
          const s = await getCartState(cartButton);
          return s.isAdd;
        }, { timeout: 10_000 })
        .toBe(true);
    });
  });
  test('Regular show page has type labels for category and storage', async ({ page }) => {
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
  
    await test.step('Has a video or audio type label', async () => {
      const categoryLabel = showPage.locator(
        '.type-label-page.video-label-page, .type-label-page.audio-label-page'
      );
  
      await expect
        .poll(async () => await categoryLabel.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    });
  
    await test.step('Has HDD storage type label', async () => {
      const hddLabel = showPage.locator('.type-label-page.hdd-page');
  
      await expect
        .poll(async () => await hddLabel.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    });
  });
});