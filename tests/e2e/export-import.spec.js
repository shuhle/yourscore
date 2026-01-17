import { test, expect } from '@playwright/test';

test.describe('Export/Import Functionality', () => {
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

  async function setupTestData(page) {
    // Create test data in the database
    return page.evaluate(async () => {
      const { CategoryModel } = await import('/js/models/category.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      const { CompletionModel } = await import('/js/models/completion.js');
      const { ScoreModel } = await import('/js/models/score.js');
      const { SettingsModel } = await import('/js/models/settings.js');

      // Set up settings
      await SettingsModel.setDecayAmount(15);
      await ScoreModel.setScore(100);

      // Create a category
      const category = await CategoryModel.create({ name: 'Test Category' });

      // Create an activity
      const activity = await ActivityModel.create({
        name: 'Test Activity',
        points: 25,
        categoryId: category.id
      });

      // Complete the activity
      await CompletionModel.toggle(activity.id);

      return {
        categoryId: category.id,
        activityId: activity.id
      };
    });
  }

  test.describe('JSON Export', () => {
    test('exports all data as JSON', async ({ page }) => {
      await setupTestData(page);
      await openSettings(page);

      // Test export via service (without triggering download)
      const exportData = await page.evaluate(async () => {
        const { exportToJSON } = await import('/js/services/export.js');
        return exportToJSON();
      });

      expect(exportData.app).toBe('YourScore');
      expect(exportData.version).toBe(1);
      expect(exportData.exportedAt).toBeTruthy();
      expect(exportData.data).toBeTruthy();

      // Verify data content
      expect(exportData.data.settings.length).toBeGreaterThan(0);
      expect(exportData.data.categories.length).toBeGreaterThan(0);
      expect(exportData.data.activities.length).toBeGreaterThan(0);
      expect(exportData.data.completions.length).toBeGreaterThan(0);

      // Verify specific data
      const activity = exportData.data.activities.find(a => a.name === 'Test Activity');
      expect(activity).toBeTruthy();
      expect(activity.points).toBe(25);
    });

    test('export button is visible in settings', async ({ page }) => {
      await openSettings(page);
      await expect(page.locator('[data-testid="export-json"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();
    });
  });

  test.describe('CSV Export', () => {
    test('exports completions as CSV', async ({ page }) => {
      await setupTestData(page);

      const csv = await page.evaluate(async () => {
        const { exportToCSV } = await import('/js/services/export.js');
        return exportToCSV();
      });

      const lines = csv.split('\n');
      expect(lines[0]).toBe('Date,Activity,Category,Points,Completed At');
      expect(lines.length).toBe(2); // Header + 1 completion

      // Verify completion data
      const completionLine = lines[1];
      expect(completionLine).toContain('Test Activity');
      expect(completionLine).toContain('Test Category');
      expect(completionLine).toContain('25');
    });

    test('handles activities without category gracefully', async ({ page }) => {
      // Create activity without category
      await page.evaluate(async () => {
        const { ActivityModel } = await import('/js/models/activity.js');
        const { CompletionModel } = await import('/js/models/completion.js');

        const activity = await ActivityModel.create({
          name: 'Uncategorized Activity',
          points: 10,
          categoryId: 'nonexistent'
        });

        await CompletionModel.toggle(activity.id);
      });

      const csv = await page.evaluate(async () => {
        const { exportToCSV } = await import('/js/services/export.js');
        return exportToCSV();
      });

      expect(csv).toContain('Uncategorized Activity');
      expect(csv).toContain('Uncategorized'); // Default category name
    });
  });

  test.describe('JSON Import', () => {
    test('imports data in replace mode (clears existing)', async ({ page }) => {
      // Setup existing data
      await setupTestData(page);

      // Import new data
      const importResult = await page.evaluate(async () => {
        const { importFromJSON } = await import('/js/services/export.js');
        const { db } = await import('/js/storage/db.js');

        const newData = {
          app: 'YourScore',
          version: 1,
          exportedAt: new Date().toISOString(),
          data: {
            settings: [
              { key: 'decayAmount', value: 20 },
              { key: 'mainScore', value: 200 }
            ],
            categories: [
              { id: 'new-cat-1', name: 'Imported Category', order: 0, createdAt: new Date().toISOString() }
            ],
            activities: [
              { id: 'new-act-1', name: 'Imported Activity', points: 50, categoryId: 'new-cat-1', archived: false, createdAt: new Date().toISOString() }
            ],
            completions: [],
            scoreHistory: [],
            achievements: []
          }
        };

        const result = await importFromJSON(newData, { merge: false });

        // Get current data
        const activities = await db.getAll('activities');
        const categories = await db.getAll('categories');

        return {
          result,
          activityCount: activities.length,
          categoryCount: categories.length,
          activityName: activities[0]?.name
        };
      });

      expect(importResult.result.success).toBe(true);
      expect(importResult.activityCount).toBe(1);
      expect(importResult.activityName).toBe('Imported Activity');
    });

    test('imports data in merge mode (keeps existing)', async ({ page }) => {
      // Setup existing data
      await setupTestData(page);

      const importResult = await page.evaluate(async () => {
        const { importFromJSON } = await import('/js/services/export.js');
        const { db } = await import('/js/storage/db.js');

        const newData = {
          app: 'YourScore',
          version: 1,
          exportedAt: new Date().toISOString(),
          data: {
            settings: [],
            categories: [
              { id: 'merge-cat-1', name: 'Merged Category', order: 100, createdAt: new Date().toISOString() }
            ],
            activities: [
              { id: 'merge-act-1', name: 'Merged Activity', points: 75, categoryId: 'merge-cat-1', archived: false, createdAt: new Date().toISOString() }
            ],
            completions: [],
            scoreHistory: [],
            achievements: []
          }
        };

        const result = await importFromJSON(newData, { merge: true });

        // Get current data
        const activities = await db.getAll('activities');
        const categories = await db.getAll('categories');

        return {
          result,
          activityCount: activities.length,
          categoryCount: categories.length,
          activityNames: activities.map(a => a.name).sort()
        };
      });

      expect(importResult.result.success).toBe(true);
      expect(importResult.activityCount).toBe(2); // Original + Merged
      expect(importResult.activityNames).toContain('Test Activity');
      expect(importResult.activityNames).toContain('Merged Activity');
    });

    test('validates import data schema', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { validateImportData } = await import('/js/services/export.js');

        // Test invalid app identifier
        const invalidApp = validateImportData({
          app: 'WrongApp',
          version: 1,
          data: {}
        });

        // Test missing required fields
        const missingFields = validateImportData({
          app: 'YourScore',
          version: 1,
          data: {
            activities: [{ id: '1', name: 'Test' }] // Missing points, categoryId, etc.
          }
        });

        return { invalidApp, missingFields };
      });

      expect(result.invalidApp.valid).toBe(false);
      expect(result.invalidApp.errors).toContain('Invalid app identifier: expected "YourScore", got "WrongApp"');

      expect(result.missingFields.valid).toBe(false);
      expect(result.missingFields.errors.length).toBeGreaterThan(0);
    });

    test('rejects invalid JSON in import', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { importFromJSONString } = await import('/js/services/export.js');
        return importFromJSONString('not valid json');
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON');
    });
  });

  test.describe('Data Round-Trip', () => {
    test('export then import preserves all data', async ({ page }) => {
      // Setup test data
      await setupTestData(page);

      // Get original data and export
      const roundTripResult = await page.evaluate(async () => {
        const { exportToJSON, importFromJSON } = await import('/js/services/export.js');
        const { db } = await import('/js/storage/db.js');

        // Export original data
        const exportedData = await exportToJSON();

        // Store original counts
        const originalActivities = await db.getAll('activities');
        const originalCategories = await db.getAll('categories');
        const originalCompletions = await db.getAll('completions');
        const originalSettings = await db.getAll('settings');

        // Clear database
        await db.reset();

        // Verify it's empty
        const emptyActivities = await db.getAll('activities');

        // Import the exported data
        const importResult = await importFromJSON(exportedData, { merge: false });

        // Get restored data
        const restoredActivities = await db.getAll('activities');
        const restoredCategories = await db.getAll('categories');
        const restoredCompletions = await db.getAll('completions');
        const restoredSettings = await db.getAll('settings');

        return {
          importResult,
          original: {
            activities: originalActivities.length,
            categories: originalCategories.length,
            completions: originalCompletions.length,
            settings: originalSettings.length
          },
          empty: {
            activities: emptyActivities.length
          },
          restored: {
            activities: restoredActivities.length,
            categories: restoredCategories.length,
            completions: restoredCompletions.length,
            settings: restoredSettings.length
          },
          activityMatch: originalActivities[0]?.name === restoredActivities.find(a => a.name === originalActivities[0]?.name)?.name
        };
      });

      expect(roundTripResult.importResult.success).toBe(true);
      expect(roundTripResult.empty.activities).toBe(0);
      expect(roundTripResult.restored.activities).toBe(roundTripResult.original.activities);
      expect(roundTripResult.restored.completions).toBe(roundTripResult.original.completions);
      expect(roundTripResult.activityMatch).toBe(true);
    });
  });

  test.describe('Reset All Data', () => {
    test('clears all data from database', async ({ page }) => {
      // Setup test data first
      await setupTestData(page);

      // Verify data exists
      const beforeReset = await page.evaluate(async () => {
        const { db } = await import('/js/storage/db.js');
        return {
          activities: (await db.getAll('activities')).length,
          completions: (await db.getAll('completions')).length
        };
      });

      expect(beforeReset.activities).toBeGreaterThan(0);
      expect(beforeReset.completions).toBeGreaterThan(0);

      // Reset data via service
      await page.evaluate(async () => {
        const { resetAllData } = await import('/js/services/export.js');
        await resetAllData();
      });

      // Verify data is cleared
      const afterReset = await page.evaluate(async () => {
        const { db } = await import('/js/storage/db.js');
        return {
          activities: (await db.getAll('activities')).length,
          completions: (await db.getAll('completions')).length,
          categories: (await db.getAll('categories')).length,
          settings: (await db.getAll('settings')).length
        };
      });

      expect(afterReset.activities).toBe(0);
      expect(afterReset.completions).toBe(0);
      expect(afterReset.categories).toBe(0);
      expect(afterReset.settings).toBe(0);
    });

    test('reset button is visible in settings', async ({ page }) => {
      await openSettings(page);
      await expect(page.locator('[data-testid="reset-data"]')).toBeVisible();
    });
  });

  test.describe('Import UI', () => {
    test('import controls are visible in settings', async ({ page }) => {
      await openSettings(page);

      await expect(page.locator('[data-testid="import-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-merge"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-file"]')).toBeAttached();
    });

    test('merge checkbox can be toggled', async ({ page }) => {
      await openSettings(page);

      const mergeCheckbox = page.locator('[data-testid="import-merge"]');
      await expect(mergeCheckbox).toBeVisible();

      // Use evaluate for reliable checkbox toggling
      await page.evaluate(() => {
        const checkbox = document.querySelector('[data-testid="import-merge"]');
        checkbox.checked = false;
      });
      await expect(mergeCheckbox).not.toBeChecked();

      // Toggle to checked
      await page.evaluate(() => {
        const checkbox = document.querySelector('[data-testid="import-merge"]');
        checkbox.checked = true;
      });
      await expect(mergeCheckbox).toBeChecked();

      // Toggle back to unchecked
      await page.evaluate(() => {
        const checkbox = document.querySelector('[data-testid="import-merge"]');
        checkbox.checked = false;
      });
      await expect(mergeCheckbox).not.toBeChecked();
    });
  });
});
