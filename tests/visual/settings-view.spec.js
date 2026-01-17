import { test, expect } from '@playwright/test';

test.describe('Settings View Visual', () => {
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

  test('settings defaults with adjusted values', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { SettingsModel } = await import('/js/models/settings.js');
      const { ScoreModel } = await import('/js/models/score.js');
      await SettingsModel.setDecayAmount(12);
      await SettingsModel.setTheme('light');
      await SettingsModel.setUIScale(1.05);
      await ScoreModel.setScore(18);
    });

    await page.evaluate(async () => {
      await window.app.navigateTo('settings');
    });

    await expect(page.locator('.settings-view[data-ready="true"]')).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('settings-view', { body: screenshot, contentType: 'image/png' });
  });
});
