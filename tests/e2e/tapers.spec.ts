import { test, expect } from '@playwright/test';

test.describe('Tapers Top 10 block', () => {
  test('each item has name and count; links (if any) are safe', async ({ page }) => {
    await page.goto('/tradelist/');

    const block = page.getByTestId('tapers-top10');
    await expect(block).toBeVisible();

    const items = block.getByTestId('taper-item');
    await expect(items).toHaveCount(10);

    for (let i = 0; i < 10; i++) {
      const item = items.nth(i);

      await expect(item).toHaveAttribute('data-name', /.+/);

      const countEl = item.getByTestId('taper-count');
      await expect(countEl).toHaveText(/^\s*\d+\s*$/);

      const link = item.getByTestId('taper-link');
      const linkCount = await link.count();
      if (linkCount > 0) {
        await expect(link).toHaveAttribute('target', '_blank');
        const rel = await link.getAttribute('rel');
        expect(rel).toBeTruthy();
        expect(rel!.toLowerCase()).toContain('noopener');
      }
    }
  });
});