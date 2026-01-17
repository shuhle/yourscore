import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Date Utilities', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('getLocalDateString returns YYYY-MM-DD format', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getLocalDateString } = await import('/js/utils/date.js');
      const dateStr = getLocalDateString();
      return {
        dateStr,
        matchesFormat: /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      };
    });

    expect(result.matchesFormat).toBe(true);
  });

  test('getLocalDateString handles specific dates correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getLocalDateString } = await import('/js/utils/date.js');
      // Test with a specific date
      const testDate = new Date(2024, 0, 15); // Jan 15, 2024
      return getLocalDateString(testDate);
    });

    expect(result).toBe('2024-01-15');
  });

  test('daysBetween calculates correctly', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { daysBetween } = await import('/js/utils/date.js');
      return {
        sameDay: daysBetween('2024-01-15', '2024-01-15'),
        oneDay: daysBetween('2024-01-15', '2024-01-16'),
        threeDays: daysBetween('2024-01-15', '2024-01-18'),
        negative: daysBetween('2024-01-18', '2024-01-15'),
        acrossMonth: daysBetween('2024-01-30', '2024-02-02')
      };
    });

    expect(results.sameDay).toBe(0);
    expect(results.oneDay).toBe(1);
    expect(results.threeDays).toBe(3);
    expect(results.negative).toBe(-3);
    expect(results.acrossMonth).toBe(3);
  });

  test('hasNewDayStarted detects day rollover', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { hasNewDayStarted } = await import('/js/utils/date.js');
      return {
        sameDay: hasNewDayStarted('2024-01-15', '2024-01-15'),
        nextDay: hasNewDayStarted('2024-01-15', '2024-01-16'),
        previousDay: hasNewDayStarted('2024-01-16', '2024-01-15')
      };
    });

    expect(results.sameDay).toBe(false);
    expect(results.nextDay).toBe(true);
    expect(results.previousDay).toBe(true);
  });

  test('daysSinceLastActive returns correct count', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { daysSinceLastActive } = await import('/js/utils/date.js');
      return {
        sameDay: daysSinceLastActive('2024-01-15', '2024-01-15'),
        oneDay: daysSinceLastActive('2024-01-15', '2024-01-16'),
        fiveDays: daysSinceLastActive('2024-01-10', '2024-01-15'),
        futureDate: daysSinceLastActive('2024-01-20', '2024-01-15')
      };
    });

    expect(results.sameDay).toBe(0);
    expect(results.oneDay).toBe(1);
    expect(results.fiveDays).toBe(5);
    expect(results.futureDate).toBe(0); // Should return 0 for future dates
  });

  test('getDateRange returns correct array of dates', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getDateRange } = await import('/js/utils/date.js');
      return getDateRange('2024-01-13', '2024-01-16');
    });

    expect(result).toEqual(['2024-01-13', '2024-01-14', '2024-01-15', '2024-01-16']);
  });

  test('formatDate handles relative formatting', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { formatDate, getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      const yesterday = getDateDaysAgo(1);
      const threeDaysAgo = getDateDaysAgo(3);

      return {
        today: formatDate(today, 'relative'),
        yesterday: formatDate(yesterday, 'relative'),
        threeDaysAgo: formatDate(threeDaysAgo, 'relative')
      };
    });

    expect(results.today).toBe('Today');
    expect(results.yesterday).toBe('Yesterday');
    expect(results.threeDaysAgo).toBe('3 days ago');
  });
});
