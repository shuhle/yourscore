import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Score Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should get default score of 0', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      return await ScoreModel.getScore();
    });

    expect(result).toBe(0);
  });

  test('should set and get score', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.setScore(100);
      return await ScoreModel.getScore();
    });

    expect(result).toBe(100);
  });

  test('should add points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.setScore(50);
      const newScore = await ScoreModel.addPoints(25);
      return newScore;
    });

    expect(result).toBe(75);
  });

  test('should subtract points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.setScore(100);
      const newScore = await ScoreModel.subtractPoints(30);
      return newScore;
    });

    expect(result).toBe(70);
  });

  test('should allow negative scores', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.setScore(10);
      const newScore = await ScoreModel.subtractPoints(30);
      return newScore;
    });

    expect(result).toBe(-20);
  });

  test('should record and retrieve history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({
        date: '2024-01-15',
        score: 100,
        earned: 50,
        decay: 10
      });

      return await ScoreModel.getHistoryByDate('2024-01-15');
    });

    expect(result.date).toBe('2024-01-15');
    expect(result.score).toBe(100);
    expect(result.earned).toBe(50);
    expect(result.decay).toBe(10);
  });

  test('should get history range', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({ date: '2024-01-10', score: 10, earned: 20, decay: 10 });
      await ScoreModel.recordHistory({ date: '2024-01-15', score: 20, earned: 20, decay: 10 });
      await ScoreModel.recordHistory({ date: '2024-01-20', score: 30, earned: 20, decay: 10 });

      const range = await ScoreModel.getHistoryRange('2024-01-12', '2024-01-18');
      return range;
    });

    expect(result.length).toBe(1);
    expect(result[0].date).toBe('2024-01-15');
  });

  test('should track today earned points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.addEarnedToday(10);
      await ScoreModel.addEarnedToday(15);
      await ScoreModel.addEarnedToday(5);

      return await ScoreModel.getEarnedToday();
    });

    expect(result).toBe(30);
  });

  test('should calculate break-even status', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      await db.init();

      // Set decay to 20
      await SettingsModel.setDecayAmount(20);

      // Earned 15 (not broken even yet)
      await ScoreModel.addEarnedToday(15);
      const notBroken = await ScoreModel.getBreakEvenStatus();

      // Earned 10 more (now 25, broken even with surplus)
      await ScoreModel.addEarnedToday(10);
      const broken = await ScoreModel.getBreakEvenStatus();

      return { notBroken, broken };
    });

    expect(result.notBroken.breakEven).toBe(false);
    expect(result.notBroken.remaining).toBe(5);
    expect(result.notBroken.surplus).toBe(0);

    expect(result.broken.breakEven).toBe(true);
    expect(result.broken.remaining).toBe(0);
    expect(result.broken.surplus).toBe(5);
  });

  test('should get highest and lowest scores', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({ date: '2024-01-10', score: 50, earned: 0, decay: 0 });
      await ScoreModel.recordHistory({ date: '2024-01-11', score: 100, earned: 0, decay: 0 });
      await ScoreModel.recordHistory({ date: '2024-01-12', score: -20, earned: 0, decay: 0 });
      await ScoreModel.setScore(30);

      return {
        highest: await ScoreModel.getHighestScore(),
        lowest: await ScoreModel.getLowestScore()
      };
    });

    expect(result.highest).toBe(100);
    expect(result.lowest).toBe(-20);
  });

  test('should get all history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({ date: '2024-01-10', score: 10, earned: 20, decay: 10 });
      await ScoreModel.recordHistory({ date: '2024-01-15', score: 20, earned: 25, decay: 10 });
      await ScoreModel.recordHistory({ date: '2024-01-20', score: 30, earned: 30, decay: 10 });

      const history = await ScoreModel.getAllHistory();
      return {
        count: history.length,
        dates: history.map(h => h.date)
      };
    });

    expect(result.count).toBe(3);
    expect(result.dates).toContain('2024-01-10');
    expect(result.dates).toContain('2024-01-15');
    expect(result.dates).toContain('2024-01-20');
  });

  test('should get today history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();
      await ScoreModel.recordHistory({ date: today, score: 100, earned: 50, decay: 10 });

      const todayHistory = await ScoreModel.getTodayHistory();
      return {
        exists: !!todayHistory,
        matchesToday: todayHistory?.date === today,
        score: todayHistory?.score,
        earned: todayHistory?.earned,
        decay: todayHistory?.decay
      };
    });

    expect(result.exists).toBe(true);
    expect(result.matchesToday).toBe(true);
    expect(result.score).toBe(100);
    expect(result.earned).toBe(50);
    expect(result.decay).toBe(10);
  });

  test('should get decay applied today', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();
      await ScoreModel.recordHistory({ date: today, score: 100, earned: 30, decay: 15 });

      return await ScoreModel.getDecayToday();
    });

    expect(result).toBe(15);
  });

  test('should clear score history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.recordHistory({ date: '2024-01-10', score: 10, earned: 20, decay: 10 });
      await ScoreModel.recordHistory({ date: '2024-01-15', score: 20, earned: 20, decay: 10 });

      const beforeClear = await ScoreModel.getAllHistory();
      await ScoreModel.clearHistory();
      const afterClear = await ScoreModel.getAllHistory();

      return {
        beforeCount: beforeClear.length,
        afterCount: afterClear.length
      };
    });

    expect(result.beforeCount).toBe(2);
    expect(result.afterCount).toBe(0);
  });

  test('should reset score to 0', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      await ScoreModel.setScore(500);
      const beforeReset = await ScoreModel.getScore();
      await ScoreModel.reset();
      const afterReset = await ScoreModel.getScore();

      return { beforeReset, afterReset };
    });

    expect(result.beforeReset).toBe(500);
    expect(result.afterReset).toBe(0);
  });

  test('should update today history', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const today = getLocalDateString();

      // Create initial history
      await ScoreModel.recordHistory({ date: today, score: 50, earned: 20, decay: 10 });

      // Update it
      await ScoreModel.updateTodayHistory({ earned: 50, decay: 15 });

      const history = await ScoreModel.getTodayHistory();
      return {
        earned: history?.earned,
        decay: history?.decay
      };
    });

    expect(result.earned).toBe(50);
    expect(result.decay).toBe(15);
  });

  test('should handle getEarnedToday when no history exists', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      // No history recorded for today
      return await ScoreModel.getEarnedToday();
    });

    expect(result).toBe(0);
  });

  test('should handle getDecayToday when no history exists', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await db.init();

      // No history recorded for today
      return await ScoreModel.getDecayToday();
    });

    expect(result).toBe(0);
  });
});
