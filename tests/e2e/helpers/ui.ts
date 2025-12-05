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
  const closeBtn = page.locator('#cartModal button[data-bs-dismiss="modal"]');
  if (await closeBtn.count()) {
    await closeBtn.click();
  }
  await page.locator('#cartModal').waitFor({ state: 'hidden', timeout: 10_000 });
}