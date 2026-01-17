import { test, expect } from '@playwright/test';

test.describe('Activities View Visual', () => {
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

  test('activities list with active and archived', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { ActivityModel } = await import('/js/models/activity.js');
      const { CategoryModel } = await import('/js/models/category.js');

      const category = await CategoryModel.create({ name: 'Focus' });
      await ActivityModel.create({ name: 'Deep work', points: 20, categoryId: category.id });
      const toArchive = await ActivityModel.create({ name: 'Stretch', points: 5 });
      await ActivityModel.archive(toArchive.id);
    });

    await page.evaluate(async () => {
      await window.app.navigateTo('activities');
    });

    await expect(page.locator('.activities-view[data-ready="true"]')).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('activities-view', { body: screenshot, contentType: 'image/png' });
  });
});
