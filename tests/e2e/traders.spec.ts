import { test, expect } from '@playwright/test';

test.describe('Traders Top 10 block', () => {
  test('each item has name and count; links (if any) are safe', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');

    const block = page.getByTestId('traders-top10');
    await expect(block).toBeVisible();

    const items = block.getByTestId('trader-item');

    const n = await items.count();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(10);

    await expect(items.first()).toBeVisible();

    for (let i = 0; i < n; i++) {
      const item = items.nth(i);

      await expect(item).toHaveAttribute('data-name', /.+/);

      const countEl = item.getByTestId('trader-count');
      await expect(countEl).toHaveText(/^\s*\d+\s*$/);

      const link = item.getByTestId('trader-link');
      if (await link.count()) {
        await expect(link).toHaveAttribute('target', '_blank');
        const rel = (await link.getAttribute('rel')) || '';
        expect(rel.toLowerCase()).toContain('noopener');
      }
    }
  });
});