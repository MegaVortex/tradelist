import type { Page, Locator } from '@playwright/test';

export function getCartButton(page: Page): Locator {
  return page.locator('button.btn-cart');
}

export async function openCartModal(page: Page): Promise<void> {
  const cartButton = getCartButton(page);
  await cartButton.click();

  const cartModal = page.locator('#cartModal');
  await cartModal.waitFor({ state: 'visible', timeout: 10_000 });
}

export async function closeCartModal(page: Page): Promise<void> {
  const closeTextButton = page
    .locator('#cartModal button:has-text("Close")')
    .first();

  if (await closeTextButton.count()) {
    await closeTextButton.click();
  }

  await page.locator('#cartModal').waitFor({
    state: 'hidden',
    timeout: 10_000,
  });
}