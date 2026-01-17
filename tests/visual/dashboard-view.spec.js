import { test, expect } from '@playwright/test';

test.describe('Dashboard View Visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
    await page.reload();
    await page.waitForFunction(() => window.app);
  });

  test('dashboard with default state', async ({ page }) => {
    // Navigate to dashboard
    await page.locator('#app-nav .nav-item', { hasText: 'Stats' }).click();
    await expect(page.locator('.dashboard-view[data-ready="true"]')).toBeVisible();

    // Verify main sections are visible
    await expect(page.locator('.score-card')).toBeVisible();
    await expect(page.locator('.streaks-grid')).toBeVisible();
    await expect(page.locator('.achievement-summary')).toBeVisible();

    await page.screenshot({
      path: 'tests/visual/screenshots/dashboard-default.png',
      fullPage: true
    });
  });

  test('dashboard with activity data', async ({ page }) => {
    // Create test data
    await page.evaluate(async () => {
      const { CategoryModel } = await import('/js/models/category.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString } = await import('/js/utils/date.js');

      // Set score
      await ScoreModel.setScore(150);

      // Create activities
      const cat = await CategoryModel.create({ name: 'Test' });
      const activity1 = await ActivityModel.create({
        name: 'Exercise',
        points: 15,
        categoryId: cat.id
      });
      const activity2 = await ActivityModel.create({
        name: 'Reading',
        points: 10,
        categoryId: cat.id
      });

      // Create completions over multiple days
      const today = getLocalDateString();
      const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

      await CompletionModel.create({ activityId: activity1.id, date: today });
      await CompletionModel.create({ activityId: activity1.id, date: yesterday });
      await CompletionModel.create({ activityId: activity2.id, date: today });

      // Record history for streak
      await ScoreModel.recordHistory({ date: yesterday, score: 135, earned: 15, decay: 10 });
      await ScoreModel.recordHistory({ date: today, score: 150, earned: 25, decay: 10 });
    });

    // Navigate to dashboard
    await page.locator('#app-nav .nav-item', { hasText: 'Stats' }).click();
    await expect(page.locator('.dashboard-view[data-ready="true"]')).toBeVisible();

    // Verify score is displayed
    await expect(page.locator('[data-testid="dashboard-score"]')).toHaveText('150');

    await page.screenshot({
      path: 'tests/visual/screenshots/dashboard-with-data.png',
      fullPage: true
    });
  });
});
