import { test, expect } from '@playwright/test';

test.describe('Settings View', () => {
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

  async function openSettings(page) {
    await page.locator('#app-nav .nav-item', { hasText: 'Settings' }).click();
    await expect(page.locator('.settings-view[data-ready="true"]')).toBeVisible();
  }

  test('updates decay amount and main score', async ({ page }) => {
    await openSettings(page);

    await page.fill('#settings-decay', '15');
    await page.fill('#settings-score', '42');
    await page.locator('[data-testid="settings-save"]').dispatchEvent('click');

    const result = await page.evaluate(async () => {
      const { SettingsModel } = await import('/js/models/settings.js');
      const { ScoreModel } = await import('/js/models/score.js');
      return {
        decayAmount: await SettingsModel.getDecayAmount(),
        mainScore: await ScoreModel.getScore()
      };
    });

    expect(result.decayAmount).toBe(15);
    expect(result.mainScore).toBe(42);
  });

  test('updates theme and UI scale immediately', async ({ page }) => {
    await openSettings(page);

    await page.selectOption('#settings-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Use evaluate to set range input value since fill() is unreliable for range inputs
    await page.evaluate(() => {
      const input = document.querySelector('#settings-scale');
      input.value = '1.2';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('[data-testid="settings-scale-value"]')).toHaveText('1.20x');

    const result = await page.evaluate(() => {
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        scale: document.documentElement.style.getPropertyValue('--ui-scale')
      };
    });

    expect(result.theme).toBe('dark');
    expect(result.scale).toBe('1.2');
  });
});
