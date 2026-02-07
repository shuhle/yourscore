import { test, expect } from '@playwright/test';

test.describe('Dashboard View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
    await page.reload();
    await page.waitForFunction(() => window.app);
    await page.evaluate(async () => {
      if (window.app?.ready) {
        await window.app.ready;
      }
    });
  });

  async function openDashboard(page) {
    await page.locator('#app-nav .nav-item', { hasText: 'Stats' }).click();
    await expect(page.locator('.dashboard-view[data-ready="true"]')).toBeVisible();
  }

  test.describe('Score Display', () => {
    test('shows current score prominently', async ({ page }) => {
      await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        await ScoreModel.setScore(250);
      });

      await openDashboard(page);

      const scoreEl = page.locator('[data-testid="dashboard-score"]');
      await expect(scoreEl).toHaveText('250');
      await expect(scoreEl).toHaveClass(/score-positive/);
    });

    test('shows negative score with correct styling', async ({ page }) => {
      await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        await ScoreModel.setScore(-50);
      });

      await openDashboard(page);

      const scoreEl = page.locator('[data-testid="dashboard-score"]');
      await expect(scoreEl).toHaveText('-50');
      await expect(scoreEl).toHaveClass(/score-negative/);
    });

    test('shows highest and lowest scores', async ({ page }) => {
      await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        // Record history with high and low scores
        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const twoDaysAgo = getLocalDateString(new Date(Date.now() - 86400000 * 2));

        await ScoreModel.recordHistory({ date: twoDaysAgo, score: -20, earned: 0, decay: 20 });
        await ScoreModel.recordHistory({ date: yesterday, score: 100, earned: 120, decay: 10 });
        await ScoreModel.recordHistory({ date: today, score: 50, earned: 10, decay: 10 });
        await ScoreModel.setScore(50);
      });

      await openDashboard(page);

      await expect(page.locator('[data-testid="highest-score"]')).toHaveText('100');
      await expect(page.locator('[data-testid="lowest-score"]')).toHaveText('-20');
    });

    test('shows days active', async ({ page }) => {
      await openDashboard(page);

      const daysActive = page.locator('[data-testid="days-active"]');
      await expect(daysActive).toBeVisible();
      // Should be at least 1
      const text = await daysActive.textContent();
      expect(parseInt(text)).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Today Progress', () => {
    test('shows break-even progress', async ({ page }) => {
      await page.evaluate(async () => {
        const { SettingsModel } = await import('/js/models/settings.js');
        const { ScoreModel } = await import('/js/models/score.js');

        await SettingsModel.setDecayAmount(20);
        await ScoreModel.updateTodayHistory({ earned: 10, decay: 20 });
      });

      await openDashboard(page);

      const progress = page.locator('[data-testid="breakeven-progress"]');
      await expect(progress).toBeVisible();
      // Should be 50% (10/20)
      await expect(progress).toHaveAttribute('style', /width:\s*50%/);
    });

    test('shows activity completion progress', async ({ page }) => {
      await page.evaluate(async () => {
        const { CategoryModel } = await import('/js/models/category.js');
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CompletionModel } = await import('/js/models/completion.js');

        const cat = await CategoryModel.create({ name: 'Test' });
        const activity1 = await ActivityModel.create({ name: 'A1', points: 10, categoryId: cat.id });
        const activity2 = await ActivityModel.create({ name: 'A2', points: 10, categoryId: cat.id });

        // Complete 1 of 2
        await CompletionModel.create({ activityId: activity1.id });
      });

      await openDashboard(page);

      const progress = page.locator('[data-testid="activity-progress"]');
      await expect(progress).toBeVisible();
      const width = await progress.evaluate(el => el.style.width);
      expect(width).toBe('50%');
    });
  });

  test.describe('Streaks', () => {
    test('shows successful day streak', async ({ page }) => {
      await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
        const twoDaysAgo = getLocalDateString(new Date(Date.now() - 86400000 * 2));

        await ScoreModel.recordHistory({ date: twoDaysAgo, score: 10, earned: 15, decay: 10 });
        await ScoreModel.recordHistory({ date: yesterday, score: 20, earned: 15, decay: 10 });
        await ScoreModel.recordHistory({ date: today, score: 30, earned: 15, decay: 10 });
      });

      await openDashboard(page);

      await expect(page.locator('[data-testid="success-streak"]')).toHaveText('3');
    });

    test('shows perfect day streak', async ({ page }) => {
      await page.evaluate(async () => {
        const { CategoryModel } = await import('/js/models/category.js');
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const cat = await CategoryModel.create({ name: 'Test' });
        const activity = await ActivityModel.create({ name: 'Test', points: 10, categoryId: cat.id });

        const today = getLocalDateString();
        const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

        await CompletionModel.create({ activityId: activity.id, date: today });
        await CompletionModel.create({ activityId: activity.id, date: yesterday });
      });

      await openDashboard(page);

      await expect(page.locator('[data-testid="perfect-streak"]')).toHaveText('2');
    });

    test('shows completion streak', async ({ page }) => {
      await page.evaluate(async () => {
        const { CategoryModel } = await import('/js/models/category.js');
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const cat = await CategoryModel.create({ name: 'Test' });
        const activity = await ActivityModel.create({ name: 'Test', points: 10, categoryId: cat.id });

        const today = getLocalDateString();
        await CompletionModel.create({ activityId: activity.id, date: today });
      });

      await openDashboard(page);

      await expect(page.locator('[data-testid="completion-streak"]')).toHaveText('1');
    });
  });

  test.describe('Activity Statistics', () => {
    test('shows most completed activities', async ({ page }) => {
      await page.evaluate(async () => {
        const { CategoryModel } = await import('/js/models/category.js');
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CompletionModel } = await import('/js/models/completion.js');
        const { getLocalDateString } = await import('/js/utils/date.js');

        const cat = await CategoryModel.create({ name: 'Test' });
        const activity1 = await ActivityModel.create({ name: 'Exercise', points: 15, categoryId: cat.id });
        const activity2 = await ActivityModel.create({ name: 'Reading', points: 10, categoryId: cat.id });

        // Exercise completed 5 times, Reading completed 2 times
        for (let i = 0; i < 5; i++) {
          const date = getLocalDateString(new Date(Date.now() - 86400000 * i));
          await CompletionModel.create({ activityId: activity1.id, date });
        }
        for (let i = 0; i < 2; i++) {
          const date = getLocalDateString(new Date(Date.now() - 86400000 * i));
          await CompletionModel.create({ activityId: activity2.id, date });
        }
      });

      await openDashboard(page);

      const mostCompleted = page.locator('[data-testid="most-completed"]');
      await expect(mostCompleted).toBeVisible();
      await expect(mostCompleted).toContainText('Exercise');
      await expect(mostCompleted).toContainText('5×');
    });

    test('shows activities never completed', async ({ page }) => {
      await page.evaluate(async () => {
        const { CategoryModel } = await import('/js/models/category.js');
        const { ActivityModel } = await import('/js/models/activity.js');

        const cat = await CategoryModel.create({ name: 'Test' });
        await ActivityModel.create({ name: 'Never Done', points: 10, categoryId: cat.id });
      });

      await openDashboard(page);

      const neverCompleted = page.locator('[data-testid="never-completed"]');
      await expect(neverCompleted).toBeVisible();
      await expect(neverCompleted).toContainText('Never Done');
      await expect(neverCompleted).toContainText('0×');
    });

    test('shows empty message when no activities', async ({ page }) => {
      await openDashboard(page);

      await expect(page.locator('.empty-message')).toContainText('No activities yet');
    });
  });

  test.describe('Achievements', () => {
    test('shows achievement count', async ({ page }) => {
      await openDashboard(page);

      const count = page.locator('[data-testid="achievement-count"]');
      await expect(count).toBeVisible();
      await expect(count).toContainText('/');
    });

    test('shows unlocked achievements', async ({ page }) => {
      await page.evaluate(async () => {
        const { ScoreModel } = await import('/js/models/score.js');
        const { checkForNewAchievements } = await import('/js/services/achievements.js');

        await ScoreModel.setScore(100);
        await checkForNewAchievements();
      });

      await openDashboard(page);

      // Should show century achievement
      await expect(page.locator('.recent-achievements')).toBeVisible();
      await expect(page.locator('.dashboard-achievement-badge')).toContainText('Century');
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to dashboard from nav', async ({ page }) => {
      const navItem = page.locator('#app-nav .nav-item', { hasText: 'Stats' });
      await navItem.click();

      await expect(navItem).toHaveClass(/active/);
      await expect(page.locator('.dashboard-view')).toBeVisible();
    });
  });

  test.describe('Responsiveness', () => {
    test('streaks grid adjusts on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await openDashboard(page);

      const streaksGrid = page.locator('.streaks-grid');
      await expect(streaksGrid).toBeVisible();

      // All streak items should be visible
      await expect(page.locator('.streak-item')).toHaveCount(3);
    });
  });
});
