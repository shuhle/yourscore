import { test, expect } from '@playwright/test';

test.describe('Score Display Visual States', () => {
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

  test('positive score', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { ScoreModel } = await import('/js/models/score.js');
      await ScoreModel.setScore(25);
      await ScoreModel.addEarnedToday(25);
      await window.app.renderCurrentView();
    });

    const scoreValue = page.locator('.score-value');
    await expect(scoreValue).toHaveClass(/score-positive/);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('score-positive', { body: screenshot, contentType: 'image/png' });
  });

  test('neutral score', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { ScoreModel } = await import('/js/models/score.js');
      await ScoreModel.setScore(0);
      await ScoreModel.addEarnedToday(0);
      await window.app.renderCurrentView();
    });

    const scoreValue = page.locator('.score-value');
    await expect(scoreValue).toHaveClass(/score-neutral/);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('score-neutral', { body: screenshot, contentType: 'image/png' });
  });

  test('negative score', async ({ page }, testInfo) => {
    await page.evaluate(async () => {
      const { ScoreModel } = await import('/js/models/score.js');
      await ScoreModel.setScore(-10);
      await ScoreModel.addEarnedToday(0);
      await window.app.renderCurrentView();
    });

    const scoreValue = page.locator('.score-value');
    await expect(scoreValue).toHaveClass(/score-negative/);

    const screenshot = await page.screenshot({ fullPage: true });
    await testInfo.attach('score-negative', { body: screenshot, contentType: 'image/png' });
  });
});
