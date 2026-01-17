import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Completion Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should create a completion record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      const completion = await CompletionModel.create({
        activityId: 'activity-123',
        date: '2024-01-15'
      });

      return completion;
    });

    expect(result.id).toBeDefined();
    expect(result.activityId).toBe('activity-123');
    expect(result.date).toBe('2024-01-15');
    expect(result.completedAt).toBeDefined();
  });

  test('should prevent duplicate completion same day', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({
        activityId: 'activity-123',
        date: '2024-01-15'
      });

      try {
        await CompletionModel.create({
          activityId: 'activity-123',
          date: '2024-01-15'
        });
        return { error: null };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.error).toContain('already completed');
  });

  test('should allow same activity different days', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-16' });

      const all = await CompletionModel.getAll();
      return all.length;
    });

    expect(result).toBe(2);
  });

  test('should check if activity is completed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });

      return {
        isCompletedYes: await CompletionModel.isCompleted('act-1', '2024-01-15'),
        isCompletedNo: await CompletionModel.isCompleted('act-1', '2024-01-16'),
        isCompletedOther: await CompletionModel.isCompleted('act-2', '2024-01-15')
      };
    });

    expect(result.isCompletedYes).toBe(true);
    expect(result.isCompletedNo).toBe(false);
    expect(result.isCompletedOther).toBe(false);
  });

  test('should get completions by date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-3', date: '2024-01-16' });

      const jan15 = await CompletionModel.getByDate('2024-01-15');
      const jan16 = await CompletionModel.getByDate('2024-01-16');

      return {
        jan15Count: jan15.length,
        jan16Count: jan16.length
      };
    });

    expect(result.jan15Count).toBe(2);
    expect(result.jan16Count).toBe(1);
  });

  test('should toggle completion', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      // Toggle on
      const first = await CompletionModel.toggle('act-1', '2024-01-15');

      // Toggle off
      const second = await CompletionModel.toggle('act-1', '2024-01-15');

      // Toggle on again
      const third = await CompletionModel.toggle('act-1', '2024-01-15');

      return {
        first: first.completed,
        second: second.completed,
        third: third.completed
      };
    });

    expect(result.first).toBe(true);
    expect(result.second).toBe(false);
    expect(result.third).toBe(true);
  });

  test('should get completions by date range', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'a', date: '2024-01-10' });
      await CompletionModel.create({ activityId: 'b', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'c', date: '2024-01-20' });
      await CompletionModel.create({ activityId: 'd', date: '2024-01-25' });

      const range = await CompletionModel.getByDateRange('2024-01-12', '2024-01-22');
      return range.length;
    });

    expect(result).toBe(2); // Only Jan 15 and Jan 20
  });

  test('should count completions by activity', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-16' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-17' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });

      const counts = await CompletionModel.getCompletionCountsByActivity('2024-01-01', '2024-01-31');
      return counts;
    });

    expect(result['act-1']).toBe(3);
    expect(result['act-2']).toBe(1);
  });

  test('should check if all activities completed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });

      const allComplete = await CompletionModel.allCompleted('2024-01-15', ['act-1', 'act-2']);
      const notAllComplete = await CompletionModel.allCompleted('2024-01-15', ['act-1', 'act-2', 'act-3']);
      const emptyList = await CompletionModel.allCompleted('2024-01-15', []);

      return { allComplete, notAllComplete, emptyList };
    });

    expect(result.allComplete).toBe(true);
    expect(result.notAllComplete).toBe(false);
    expect(result.emptyList).toBe(false);
  });

  test('should calculate completion streak', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      // Create a 3-day streak ending on Jan 15
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-13' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-14' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      // Gap on Jan 16
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-17' });

      const streakFromJan15 = await CompletionModel.getCompletionStreak('2024-01-15');
      const streakFromJan17 = await CompletionModel.getCompletionStreak('2024-01-17');

      return { streakFromJan15, streakFromJan17 };
    });

    expect(result.streakFromJan15).toBe(3);
    expect(result.streakFromJan17).toBe(1);
  });

  test('should get completion by ID', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      const created = await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      const found = await CompletionModel.getById(created.id);
      const notFound = await CompletionModel.getById('nonexistent-id');

      return {
        found: !!found,
        matchesCreated: found?.id === created.id,
        notFound: notFound === undefined
      };
    });

    expect(result.found).toBe(true);
    expect(result.matchesCreated).toBe(true);
    expect(result.notFound).toBe(true);
  });

  test('should find completion by activity and date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });

      const found = await CompletionModel.findByActivityAndDate('act-1', '2024-01-15');
      const notFoundActivity = await CompletionModel.findByActivityAndDate('act-2', '2024-01-15');
      const notFoundDate = await CompletionModel.findByActivityAndDate('act-1', '2024-01-16');

      return {
        found: !!found,
        notFoundActivity: notFoundActivity === undefined,
        notFoundDate: notFoundDate === undefined
      };
    });

    expect(result.found).toBe(true);
    expect(result.notFoundActivity).toBe(true);
    expect(result.notFoundDate).toBe(true);
  });

  test('should get completions by activity', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-16' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-17' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });

      const act1Completions = await CompletionModel.getByActivity('act-1');
      const act2Completions = await CompletionModel.getByActivity('act-2');
      const act3Completions = await CompletionModel.getByActivity('act-3');

      return {
        act1Count: act1Completions.length,
        act2Count: act2Completions.length,
        act3Count: act3Completions.length
      };
    });

    expect(result.act1Count).toBe(3);
    expect(result.act2Count).toBe(1);
    expect(result.act3Count).toBe(0);
  });

  test('should delete completion by activity and date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });

      const deletedExisting = await CompletionModel.deleteByActivityAndDate('act-1', '2024-01-15');
      const deletedNonExisting = await CompletionModel.deleteByActivityAndDate('act-1', '2024-01-15');
      const isCompleted = await CompletionModel.isCompleted('act-1', '2024-01-15');

      return {
        deletedExisting,
        deletedNonExisting,
        isCompleted
      };
    });

    expect(result.deletedExisting).toBe(true);
    expect(result.deletedNonExisting).toBe(false);
    expect(result.isCompleted).toBe(false);
  });

  test('should count completions by date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-3', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-16' });

      const jan15Count = await CompletionModel.countByDate('2024-01-15');
      const jan16Count = await CompletionModel.countByDate('2024-01-16');
      const jan17Count = await CompletionModel.countByDate('2024-01-17');

      return { jan15Count, jan16Count, jan17Count };
    });

    expect(result.jan15Count).toBe(3);
    expect(result.jan16Count).toBe(1);
    expect(result.jan17Count).toBe(0);
  });

  test('should get dates with completions', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-10' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-20' });

      const dates = await CompletionModel.getDatesWithCompletions('2024-01-01', '2024-01-31');
      return {
        size: dates.size,
        hasJan10: dates.has('2024-01-10'),
        hasJan15: dates.has('2024-01-15'),
        hasJan20: dates.has('2024-01-20'),
        hasJan25: dates.has('2024-01-25')
      };
    });

    expect(result.size).toBe(3);
    expect(result.hasJan10).toBe(true);
    expect(result.hasJan15).toBe(true);
    expect(result.hasJan20).toBe(true);
    expect(result.hasJan25).toBe(false);
  });

  test('should clear all completions', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-2', date: '2024-01-16' });

      const beforeClear = await CompletionModel.getAll();
      await CompletionModel.clear();
      const afterClear = await CompletionModel.getAll();

      return {
        beforeCount: beforeClear.length,
        afterCount: afterClear.length
      };
    });

    expect(result.beforeCount).toBe(2);
    expect(result.afterCount).toBe(0);
  });
});
