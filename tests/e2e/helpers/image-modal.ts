// helpers/image-modal.ts
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function exerciseImageModal(page: Page): Promise<void> {
  const modal = page.locator('#imageModal');
  const counter = page.locator('#imageCounter');
  const nextBtn = page.locator('#modalNext');
  const prevBtn = page.locator('#modalPrev');
  const closeBtn = page.locator('#modalClose');

  const parseCounter = async () => {
    const text = (await counter.innerText()).trim();
    const [curStr, totalStr] = text.split('/').map(s => s.trim());
    const current = parseInt(curStr, 10);
    const total = parseInt(totalStr, 10);
    return { current, total };
  };

  await expect(modal).toBeVisible({ timeout: 10_000 });
  await expect(counter).toBeVisible({ timeout: 10_000 });

  await (async () => {
    let { current, total } = await parseCounter();
    expect(total).toBeGreaterThanOrEqual(1);

    let safety = 0;
    while (current < total && safety < 20) {
      await nextBtn.click();
      await expect(counter).not.toHaveText(`${current} / ${total}`, {
        timeout: 5_000,
      });
      ({ current, total } = await parseCounter());
      safety++;
    }

    const final = await parseCounter();
    expect(final.current).toBe(final.total);
  })();

  await (async () => {
    let { current, total } = await parseCounter();
    let safety = 0;

    while (current > 1 && safety < 20) {
      await prevBtn.click();
      await expect(counter).not.toHaveText(`${current} / ${total}`, {
        timeout: 5_000,
      });
      ({ current, total } = await parseCounter());
      safety++;
    }

    const final = await parseCounter();
    expect(final.current).toBe(1);
  })();

  await closeBtn.click();
  await expect(modal).toBeHidden({ timeout: 10_000 });
}