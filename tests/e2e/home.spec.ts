import { test, expect } from "@playwright/test";

test.describe("Homepage (rules + top lists)", () => {
  test("renders Rules section and both Top 10 blocks", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/tradelist/");
    await expect(page.getByTestId("rules")).toBeVisible();
    await expect(page.getByTestId("rules-list")).toBeVisible();

    const tapersBlock = page.getByTestId("tapers-top10");
    await expect(tapersBlock).toBeVisible();

    const taperItems = tapersBlock.getByTestId("taper-item");
    const taperCount = await taperItems.count();
    expect(taperCount).toBeGreaterThanOrEqual(1);
    expect(taperCount).toBeLessThanOrEqual(10);
    await expect(taperItems.first()).toBeVisible();

    if (taperCount >= 1) await expect(taperItems.nth(0)).toContainText("🥇");
    if (taperCount >= 2) await expect(taperItems.nth(1)).toContainText("🥈");
    if (taperCount >= 3) await expect(taperItems.nth(2)).toContainText("🥉");

    for (let i = 0; i < taperCount; i++) {
      const countEl = taperItems.nth(i).getByTestId("taper-count");
      await expect(countEl).toHaveText(/^\s*\d+\s*$/);
    }

    const tradersBlock = page.getByTestId("traders-top10");
    await expect(tradersBlock).toBeVisible();

    const traderItems = tradersBlock.getByTestId("trader-item");
    const traderCount = await traderItems.count();
    expect(traderCount).toBeGreaterThanOrEqual(1);
    expect(traderCount).toBeLessThanOrEqual(10);
    await expect(traderItems.first()).toBeVisible();

    if (traderCount >= 1) await expect(traderItems.nth(0)).toContainText("🥇");
    if (traderCount >= 2) await expect(traderItems.nth(1)).toContainText("🥈");
    if (traderCount >= 3) await expect(traderItems.nth(2)).toContainText("🥉");

    for (let i = 0; i < traderCount; i++) {
      const countEl = traderItems.nth(i).getByTestId("trader-count");
      await expect(countEl).toHaveText(/^\s*\d+\s*$/);
    }
  });
});