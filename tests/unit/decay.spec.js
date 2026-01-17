import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Decay Service (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('calculateDecay multiplies days by amount', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { DecayService } = await import('/js/services/decay.js');
      return {
        zero: DecayService.calculateDecay(0, 10),
        one: DecayService.calculateDecay(1, 10),
        multi: DecayService.calculateDecay(3, 5)
      };
    });

    expect(result.zero).toBe(0);
    expect(result.one).toBe(10);
    expect(result.multi).toBe(15);
  });

  test('simulateDecay returns expected totals', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { DecayService } = await import('/js/services/decay.js');
      return DecayService.simulateDecay(100, 12, 4);
    });

    expect(result.totalDecay).toBe(48);
    expect(result.finalScore).toBe(52);
  });

  test('first day skips decay', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { DecayService } = await import('/js/services/decay.js');
      await db.init();

      return await DecayService.checkAndApplyDecay();
    });

    expect(result.applied).toBe(false);
    expect(result.isFirstDay).toBe(true);
  });
});
