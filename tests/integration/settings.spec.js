import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Settings Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear database before each test
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should get default values when not set', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel, DEFAULTS } = await import('/js/models/settings.js');
      await db.init();

      return {
        decayAmount: await SettingsModel.getDecayAmount(),
        theme: await SettingsModel.getTheme(),
        uiScale: await SettingsModel.getUIScale(),
        defaults: DEFAULTS
      };
    });

    expect(result.decayAmount).toBe(result.defaults.decayAmount);
    expect(result.theme).toBe(result.defaults.theme);
    expect(result.uiScale).toBe(result.defaults.uiScale);
  });

  test('should set and get individual settings', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      await db.init();

      await SettingsModel.setDecayAmount(15);
      await SettingsModel.setTheme('dark');
      await SettingsModel.setUIScale(1.5);

      return {
        decayAmount: await SettingsModel.getDecayAmount(),
        theme: await SettingsModel.getTheme(),
        uiScale: await SettingsModel.getUIScale()
      };
    });

    expect(result.decayAmount).toBe(15);
    expect(result.theme).toBe('dark');
    expect(result.uiScale).toBe(1.5);
  });

  test('should set and get multiple settings at once', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      await db.init();

      await SettingsModel.setMany({
        decayAmount: 20,
        theme: 'dark',
        uiScale: 0.9
      });

      return await SettingsModel.getAll();
    });

    expect(result.decayAmount).toBe(20);
    expect(result.theme).toBe('dark');
    expect(result.uiScale).toBe(0.9);
  });

  test('should initialize first use date for new users', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      const { getLocalDateString } = await import('/js/utils/date.js');
      await db.init();

      const isNewUser = await SettingsModel.initializeIfNeeded();
      const firstUseDate = await SettingsModel.getFirstUseDate();
      const lastActiveDate = await SettingsModel.getLastActiveDate();
      const today = getLocalDateString();

      return { isNewUser, firstUseDate, lastActiveDate, today };
    });

    expect(result.isNewUser).toBe(true);
    expect(result.firstUseDate).toBe(result.today);
    expect(result.lastActiveDate).toBe(result.today);
  });

  test('should not reinitialize existing users', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel } = await import('/js/models/settings.js');
      await db.init();

      // First initialization
      await SettingsModel.initializeIfNeeded();

      // Set a custom first use date
      await SettingsModel.setFirstUseDate('2024-01-01');

      // Try to initialize again
      const isNewUser = await SettingsModel.initializeIfNeeded();
      const firstUseDate = await SettingsModel.getFirstUseDate();

      return { isNewUser, firstUseDate };
    });

    expect(result.isNewUser).toBe(false);
    expect(result.firstUseDate).toBe('2024-01-01');
  });

  test('should reset all settings to defaults', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { SettingsModel, DEFAULTS } = await import('/js/models/settings.js');
      await db.init();

      // Set custom values
      await SettingsModel.setMany({
        decayAmount: 50,
        theme: 'dark'
      });

      // Reset
      await SettingsModel.reset();

      return {
        decayAmount: await SettingsModel.getDecayAmount(),
        theme: await SettingsModel.getTheme(),
        defaults: DEFAULTS
      };
    });

    expect(result.decayAmount).toBe(result.defaults.decayAmount);
    expect(result.theme).toBe(result.defaults.theme);
  });
});
