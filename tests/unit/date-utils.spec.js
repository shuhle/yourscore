import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Date Utils (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('getLocalDateString formats YYYY-MM-DD', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getLocalDateString } = await import('/js/utils/date.js');
      const dateStr = getLocalDateString(new Date(2024, 0, 5));
      return {
        dateStr,
        matches: /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      };
    });

    expect(result.matches).toBe(true);
    expect(result.dateStr).toBe('2024-01-05');
  });

  test('daysBetween handles positive and negative ranges', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { daysBetween } = await import('/js/utils/date.js');
      return {
        forward: daysBetween('2024-01-01', '2024-01-04'),
        backward: daysBetween('2024-01-04', '2024-01-01')
      };
    });

    expect(result.forward).toBe(3);
    expect(result.backward).toBe(-3);
  });

  test('getDateRange returns inclusive range', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getDateRange } = await import('/js/utils/date.js');
      return getDateRange('2024-01-02', '2024-01-04');
    });

    expect(result).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
  });
});
