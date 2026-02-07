import { test, expect } from '@playwright/test';

test.describe('Marketing Screenshots (Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.app);
    await page.evaluate(() => window.app.ready);
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
    await page.reload();
    await page.waitForFunction(() => window.app);
    await page.evaluate(() => window.app.ready);
  });

  test('daily view screenshot', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile-only marketing screenshot.');

    await page.evaluate(async () => {
      const { SettingsModel } = await import('/js/models/settings.js');
      const { CategoryModel } = await import('/js/models/category.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString } = await import('/js/utils/date.js');

      await SettingsModel.setMany({
        decayAmount: 12,
        theme: 'light',
        uiScale: 1
      });

      const morning = await CategoryModel.create({ name: 'Morning Sparks' });
      const focus = await CategoryModel.create({ name: 'Focus Forge' });
      const recharge = await CategoryModel.create({ name: 'Recharge Rituals' });

      const sunrise = await ActivityModel.create({
        name: 'Sunrise Sprint',
        points: 8,
        categoryId: morning.id
      });
      const coldSplash = await ActivityModel.create({
        name: 'Cold Splash',
        points: 4,
        categoryId: morning.id
      });
      const deepWork = await ActivityModel.create({
        name: 'Deep Work Blitz',
        points: 12,
        categoryId: focus.id
      });
      await ActivityModel.create({
        name: 'Inbox Zero Sweep',
        points: 6,
        categoryId: focus.id
      });
      const gratitude = await ActivityModel.create({
        name: 'Gratitude Note',
        points: 3,
        categoryId: recharge.id
      });
      await ActivityModel.create({
        name: 'Evening Stretch',
        points: 5,
        categoryId: recharge.id
      });

      const today = getLocalDateString();
      await CompletionModel.create({ activityId: sunrise.id, date: today });
      await CompletionModel.create({ activityId: deepWork.id, date: today });
      await CompletionModel.create({ activityId: gratitude.id, date: today });

      await ScoreModel.setScore(240);
      await ScoreModel.addEarnedToday(23);

      await window.app.renderCurrentView();
    });

    await expect(page.locator('.daily-view')).toBeVisible();

    await page.screenshot({
      path: 'docs/screenshots/daily-view.png',
      fullPage: false
    });
  });

  test('dashboard screenshot', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile-only marketing screenshot.');

    await page.evaluate(async () => {
      const { SettingsModel } = await import('/js/models/settings.js');
      const { CategoryModel } = await import('/js/models/category.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getLocalDateString, getDateDaysAgo } = await import('/js/utils/date.js');

      const today = getLocalDateString();
      const firstUseDate = getDateDaysAgo(20);

      await SettingsModel.setMany({
        decayAmount: 10,
        theme: 'light',
        uiScale: 1,
        firstUseDate,
        lastActiveDate: today
      });

      const momentum = await CategoryModel.create({ name: 'Momentum' });
      const mindset = await CategoryModel.create({ name: 'Mindset' });
      const body = await CategoryModel.create({ name: 'Body Battery' });

      const sprint = await ActivityModel.create({
        name: 'Power Walk',
        points: 8,
        categoryId: body.id
      });
      const focus = await ActivityModel.create({
        name: 'Deep Focus Jam',
        points: 15,
        categoryId: momentum.id
      });
      const hydration = await ActivityModel.create({
        name: 'Hydration Hero',
        points: 4,
        categoryId: body.id
      });
      const mindful = await ActivityModel.create({
        name: 'Mindful Minute',
        points: 5,
        categoryId: mindset.id
      });

      const completionPlan = [
        { daysAgo: 0, activities: [sprint, focus, hydration, mindful] },
        { daysAgo: 1, activities: [sprint, focus, hydration, mindful] },
        { daysAgo: 2, activities: [sprint, focus, hydration] },
        { daysAgo: 3, activities: [focus, hydration] },
        { daysAgo: 4, activities: [sprint, hydration, mindful] },
        { daysAgo: 5, activities: [sprint, focus] },
        { daysAgo: 6, activities: [hydration] }
      ];

      for (const entry of completionPlan) {
        const date = getDateDaysAgo(entry.daysAgo);
        for (const activity of entry.activities) {
          await CompletionModel.create({ activityId: activity.id, date });
        }
      }

      const historyPlan = [
        { daysAgo: 6, score: 120, earned: 12, decay: 10 },
        { daysAgo: 5, score: 150, earned: 18, decay: 10 },
        { daysAgo: 4, score: 190, earned: 20, decay: 10 },
        { daysAgo: 3, score: 230, earned: 16, decay: 10 },
        { daysAgo: 2, score: 280, earned: 22, decay: 10 },
        { daysAgo: 1, score: 340, earned: 26, decay: 10 },
        { daysAgo: 0, score: 420, earned: 32, decay: 10 }
      ];

      for (const entry of historyPlan) {
        await ScoreModel.recordHistory({
          date: getDateDaysAgo(entry.daysAgo),
          score: entry.score,
          earned: entry.earned,
          decay: entry.decay
        });
      }

      await ScoreModel.setScore(420);
      await ScoreModel.addEarnedToday(32);

      await window.app.navigateTo('dashboard');
    });

    await expect(page.locator('.dashboard-view[data-ready="true"]')).toBeVisible();

    await page.screenshot({
      path: 'docs/screenshots/dashboard-view.png',
      fullPage: false
    });
  });
});
