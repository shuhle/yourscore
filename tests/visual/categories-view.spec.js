import { test, expect } from '@playwright/test';

test.describe('Categories View Visual', () => {
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

  test('category list with defaults and custom entries', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { CategoryModel } = await import('/js/models/category.js');
      await CategoryModel.create({ name: 'Fitness' });
      await CategoryModel.create({ name: 'Creative' });
    });

    await page.evaluate(async () => {
      await window.app.navigateTo('categories');
    });

    await expect(page.locator('.categories-view[data-ready="true"]')).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('categories-view', { body: screenshot, contentType: 'image/png' });
  });
});
