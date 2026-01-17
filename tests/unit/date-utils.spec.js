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

  test('getLocalDateString pads single digit months and days', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getLocalDateString } = await import('/js/utils/date.js');
      return {
        jan1: getLocalDateString(new Date(2024, 0, 1)),
        dec31: getLocalDateString(new Date(2024, 11, 31)),
        sep9: getLocalDateString(new Date(2024, 8, 9))
      };
    });

    expect(result.jan1).toBe('2024-01-01');
    expect(result.dec31).toBe('2024-12-31');
    expect(result.sep9).toBe('2024-09-09');
  });

  test('getTimestamp returns ISO 8601 format', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getTimestamp } = await import('/js/utils/date.js');
      const timestamp = getTimestamp();
      return {
        timestamp,
        isISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(timestamp)
      };
    });

    expect(result.isISO).toBe(true);
  });

  test('parseLocalDate creates Date at midnight local time', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { parseLocalDate } = await import('/js/utils/date.js');
      const date = parseLocalDate('2024-06-15');
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hours: date.getHours(),
        minutes: date.getMinutes()
      };
    });

    expect(result.year).toBe(2024);
    expect(result.month).toBe(5); // June is month 5 (0-indexed)
    expect(result.day).toBe(15);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  test('daysBetween handles positive and negative ranges', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { daysBetween } = await import('/js/utils/date.js');
      return {
        forward: daysBetween('2024-01-01', '2024-01-04'),
        backward: daysBetween('2024-01-04', '2024-01-01'),
        sameDay: daysBetween('2024-01-01', '2024-01-01'),
        acrossMonths: daysBetween('2024-01-30', '2024-02-02'),
        acrossYears: daysBetween('2023-12-30', '2024-01-02')
      };
    });

    expect(result.forward).toBe(3);
    expect(result.backward).toBe(-3);
    expect(result.sameDay).toBe(0);
    expect(result.acrossMonths).toBe(3);
    expect(result.acrossYears).toBe(3);
  });

  test('hasNewDayStarted detects day changes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { hasNewDayStarted, getLocalDateString } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      return {
        sameDay: hasNewDayStarted(today, today),
        differentDay: hasNewDayStarted('2024-01-01', '2024-01-02'),
        yearBoundary: hasNewDayStarted('2023-12-31', '2024-01-01')
      };
    });

    expect(result.sameDay).toBe(false);
    expect(result.differentDay).toBe(true);
    expect(result.yearBoundary).toBe(true);
  });

  test('daysSinceLastActive returns non-negative days', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { daysSinceLastActive } = await import('/js/utils/date.js');
      return {
        threeDaysAgo: daysSinceLastActive('2024-01-01', '2024-01-04'),
        sameDay: daysSinceLastActive('2024-01-01', '2024-01-01'),
        futureDate: daysSinceLastActive('2024-01-05', '2024-01-01') // Should return 0, not negative
      };
    });

    expect(result.threeDaysAgo).toBe(3);
    expect(result.sameDay).toBe(0);
    expect(result.futureDate).toBe(0);
  });

  test('isToday correctly identifies today', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { isToday, getLocalDateString } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      return {
        today: isToday(today),
        notToday: isToday('2020-01-01'),
        anotherDate: isToday('1999-12-31')
      };
    });

    expect(result.today).toBe(true);
    expect(result.notToday).toBe(false);
    expect(result.anotherDate).toBe(false);
  });

  test('isYesterday correctly identifies yesterday', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { isYesterday, getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');
      const yesterday = getDateDaysAgo(1);
      const today = getLocalDateString();
      return {
        yesterday: isYesterday(yesterday),
        today: isYesterday(today),
        twoDaysAgo: isYesterday(getDateDaysAgo(2))
      };
    });

    expect(result.yesterday).toBe(true);
    expect(result.today).toBe(false);
    expect(result.twoDaysAgo).toBe(false);
  });

  test('getDateDaysAgo returns correct past dates', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getDateDaysAgo, getLocalDateString, daysBetween } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      const threeDaysAgo = getDateDaysAgo(3);
      const sevenDaysAgo = getDateDaysAgo(7);
      return {
        threeDaysAgoDiff: daysBetween(threeDaysAgo, today),
        sevenDaysAgoDiff: daysBetween(sevenDaysAgo, today),
        zeroDaysAgo: getDateDaysAgo(0) === today
      };
    });

    expect(result.threeDaysAgoDiff).toBe(3);
    expect(result.sevenDaysAgoDiff).toBe(7);
    expect(result.zeroDaysAgo).toBe(true);
  });

  test('getDateDaysFromNow returns correct future dates', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getDateDaysFromNow, getLocalDateString, daysBetween } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      const threeDaysFromNow = getDateDaysFromNow(3);
      const sevenDaysFromNow = getDateDaysFromNow(7);
      return {
        threeDaysFromNowDiff: daysBetween(today, threeDaysFromNow),
        sevenDaysFromNowDiff: daysBetween(today, sevenDaysFromNow),
        zeroDaysFromNow: getDateDaysFromNow(0) === today
      };
    });

    expect(result.threeDaysFromNowDiff).toBe(3);
    expect(result.sevenDaysFromNowDiff).toBe(7);
    expect(result.zeroDaysFromNow).toBe(true);
  });

  test('getDateRange returns inclusive range', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getDateRange } = await import('/js/utils/date.js');
      return {
        threeDay: getDateRange('2024-01-02', '2024-01-04'),
        singleDay: getDateRange('2024-01-01', '2024-01-01'),
        acrossMonths: getDateRange('2024-01-30', '2024-02-02')
      };
    });

    expect(result.threeDay).toEqual(['2024-01-02', '2024-01-03', '2024-01-04']);
    expect(result.singleDay).toEqual(['2024-01-01']);
    expect(result.acrossMonths).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']);
  });

  test('formatDate with short format', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { formatDate } = await import('/js/utils/date.js');
      const formatted = formatDate('2024-06-15', 'short');
      // Should contain month and day
      return {
        formatted,
        hasContent: formatted.length > 0
      };
    });

    expect(result.hasContent).toBe(true);
  });

  test('formatDate with long format', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { formatDate } = await import('/js/utils/date.js');
      const formatted = formatDate('2024-06-15', 'long');
      // Long format includes weekday, year, month, day
      return {
        formatted,
        hasContent: formatted.length > 0,
        longerThanShort: formatted.length > formatDate('2024-06-15', 'short').length
      };
    });

    expect(result.hasContent).toBe(true);
    expect(result.longerThanShort).toBe(true);
  });

  test('formatDate with relative format shows today/yesterday', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { formatDate, getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');
      const today = getLocalDateString();
      const yesterday = getDateDaysAgo(1);
      return {
        todayRelative: formatDate(today, 'relative'),
        yesterdayRelative: formatDate(yesterday, 'relative')
      };
    });

    // Should return localized "Today" and "Yesterday"
    expect(result.todayRelative.length).toBeGreaterThan(0);
    expect(result.yesterdayRelative.length).toBeGreaterThan(0);
    expect(result.todayRelative).not.toBe(result.yesterdayRelative);
  });

  test('formatTimestamp returns formatted time', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { formatTimestamp } = await import('/js/utils/date.js');
      const timestamp = '2024-06-15T14:30:00.000Z';
      return {
        formatted: formatTimestamp(timestamp),
        emptyInput: formatTimestamp(''),
        nullInput: formatTimestamp(null)
      };
    });

    expect(result.formatted.length).toBeGreaterThan(0);
    expect(result.emptyInput).toBe('');
    expect(result.nullInput).toBe('');
  });
});
