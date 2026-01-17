import { test, expect } from '@playwright/test';

test.describe('Daily View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('completes and undoes an activity', async ({ page }) => {
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({
        name: 'Daily Walk',
        points: 15
      });
    });

    await page.reload();

    const card = page.locator('.activity-card', { hasText: 'Daily Walk' });
    await expect(card).toBeVisible();

    await card.click();

    await expect(card).toHaveClass(/completed/);
    await expect(card.locator('.activity-card-timestamp')).not.toBeEmpty();
    await expect(page.locator('.break-even-indicator')).toHaveClass(/achieved/);

    const scoreValue = page.locator('.score-value');
    await expect(scoreValue).toHaveText('15');

    await card.click();

    await expect(card).not.toHaveClass(/completed/);
    await expect(page.locator('.break-even-indicator')).toHaveClass(/needs-more/);
    await expect(scoreValue).toHaveText('0');
  });

  test('shows decay notification after absence', async ({ page }) => {
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { getDateDaysAgo } = await import('/js/utils/date.js');
      await db.init();

      const threeDaysAgo = getDateDaysAgo(3);
      await SettingsModel.setMany({
        firstUseDate: '2024-01-01',
        lastActiveDate: threeDaysAgo,
        decayAmount: 5
      });
      await ScoreModel.setScore(20);
    });

    await page.reload();

    const decayNotice = page.locator('.decay-notification');
    await expect(decayNotice).toBeVisible();
    await expect(decayNotice).toContainText('decay applied');
  });
});
