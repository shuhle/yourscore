import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('ActivityModel (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('creates activity with defaults', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const activity = await ActivityModel.create({
        name: 'Test Activity',
        points: 7.9
      });

      return activity;
    });

    expect(result.name).toBe('Test Activity');
    expect(result.points).toBe(7);
    expect(result.archived).toBe(false);
    expect(result.categoryId).toBeDefined();
  });

  test('archives and restores activity', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const activity = await ActivityModel.create({ name: 'Archive Me', points: 5 });
      await ActivityModel.archive(activity.id);
      const archived = await ActivityModel.getArchived();
      await ActivityModel.unarchive(activity.id);
      const archivedAfter = await ActivityModel.getArchived();

      return { archivedCount: archived.length, archivedAfter: archivedAfter.length };
    });

    expect(result.archivedCount).toBe(1);
    expect(result.archivedAfter).toBe(0);
  });
});

test.describe('CategoryModel (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('seeds uncategorized once', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const first = await CategoryModel.seedDefaults();
      const second = await CategoryModel.seedDefaults();

      return { firstCount: first.length, secondCount: second.length };
    });

    expect(result.firstCount).toBe(1);
    expect(result.secondCount).toBe(1);
  });

  test('reorders categories by provided ids', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const a = await CategoryModel.create({ name: 'A', order: 0 });
      const b = await CategoryModel.create({ name: 'B', order: 1 });
      const c = await CategoryModel.create({ name: 'C', order: 2 });

      await CategoryModel.reorder([c.id, a.id, b.id]);

      const categories = await CategoryModel.getAll();
      return categories.map(cat => cat.name);
    });

    expect(result).toEqual(['C', 'A', 'B']);
  });
});

test.describe('CompletionModel (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('prevents duplicate completion for the same date', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });

      try {
        await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
        return { error: null };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(result.error).toContain('already completed');
  });

  test('calculates completion streak', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      await db.init();

      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-13' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-14' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-15' });
      await CompletionModel.create({ activityId: 'act-1', date: '2024-01-17' });

      return {
        streakFrom15: await CompletionModel.getCompletionStreak('2024-01-15'),
        streakFrom17: await CompletionModel.getCompletionStreak('2024-01-17')
      };
    });

    expect(result.streakFrom15).toBe(3);
    expect(result.streakFrom17).toBe(1);
  });
});

test.describe('ScoreModel (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('adds points and updates break-even status', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      await db.init();

      await SettingsModel.setDecayAmount(20);
      await ScoreModel.setScore(0);

      await ScoreModel.addEarnedToday(15);
      const notBroken = await ScoreModel.getBreakEvenStatus();

      await ScoreModel.addEarnedToday(10);
      const broken = await ScoreModel.getBreakEvenStatus();

      return { notBroken, broken };
    });

    expect(result.notBroken.breakEven).toBe(false);
    expect(result.notBroken.remaining).toBe(5);
    expect(result.broken.breakEven).toBe(true);
    expect(result.broken.surplus).toBe(5);
  });

  test('records score history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({
        date: '2024-01-15',
        score: 100,
        earned: 20,
        decay: 10
      });

      return await ScoreModel.getHistoryByDate('2024-01-15');
    });

    expect(result.score).toBe(100);
    expect(result.earned).toBe(20);
    expect(result.decay).toBe(10);
  });
});

test.describe('SettingsModel (unit)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('initializes first use date for new user', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const isNewUser = await SettingsModel.initializeIfNeeded();
      const firstUseDate = await SettingsModel.getFirstUseDate();
      const lastActiveDate = await SettingsModel.getLastActiveDate();
      const today = getLocalDateString();

      return { isNewUser, firstUseDate, lastActiveDate, today };
    });

    expect(result.isNewUser).toBe(true);
    expect(result.firstUseDate).toBe(result.today);
    expect(result.lastActiveDate).toBe(result.today);
  });
});
