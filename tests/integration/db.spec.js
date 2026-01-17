import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('IndexedDB Storage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app first to have access to the database
    await page.goto('/');
    // Clear any existing database for clean tests
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should initialize database with all stores', async ({ page }) => {
    const stores = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      return Array.from(db.db.objectStoreNames);
    });

    expect(stores).toContain('settings');
    expect(stores).toContain('categories');
    expect(stores).toContain('activities');
    expect(stores).toContain('completions');
    expect(stores).toContain('scoreHistory');
    expect(stores).toContain('achievements');
  });

  test('should put and get a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();

      // Put a setting
      await db.put('settings', { key: 'testKey', value: 'testValue' });

      // Get it back
      return await db.get('settings', 'testKey');
    });

    expect(result).toEqual({ key: 'testKey', value: 'testValue' });
  });

  test('should getAll records from a store', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();

      // Put multiple settings
      await db.put('settings', { key: 'key1', value: 'value1' });
      await db.put('settings', { key: 'key2', value: 'value2' });
      await db.put('settings', { key: 'key3', value: 'value3' });

      return await db.getAll('settings');
    });

    expect(results).toHaveLength(3);
    expect(results.map(r => r.key)).toContain('key1');
    expect(results.map(r => r.key)).toContain('key2');
    expect(results.map(r => r.key)).toContain('key3');
  });

  test('should delete a record', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();

      // Put a record
      await db.put('settings', { key: 'toDelete', value: 'deleteMe' });

      // Verify it exists
      const before = await db.get('settings', 'toDelete');
      if (!before) return { error: 'Record not created' };

      // Delete it
      await db.delete('settings', 'toDelete');

      // Verify it's gone
      const after = await db.get('settings', 'toDelete');
      return { before, after };
    });

    expect(result.before).toBeDefined();
    expect(result.after).toBeUndefined();
  });

  test('should clear all records from a store', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();

      // Put multiple records
      await db.put('settings', { key: 'a', value: '1' });
      await db.put('settings', { key: 'b', value: '2' });

      const countBefore = await db.count('settings');

      // Clear the store
      await db.clear('settings');

      const countAfter = await db.count('settings');
      return { countBefore, countAfter };
    });

    expect(result.countBefore).toBe(2);
    expect(result.countAfter).toBe(0);
  });

  test('should query by index', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const { db, generateId } = await import('/js/storage/db.js');
      await db.init();

      // Create activities with different categories
      await db.put('activities', {
        id: generateId(),
        name: 'Activity 1',
        categoryId: 'cat-a',
        archived: false
      });
      await db.put('activities', {
        id: generateId(),
        name: 'Activity 2',
        categoryId: 'cat-a',
        archived: false
      });
      await db.put('activities', {
        id: generateId(),
        name: 'Activity 3',
        categoryId: 'cat-b',
        archived: false
      });

      // Query by categoryId index
      const catA = await db.getByIndex('activities', 'categoryId', 'cat-a');
      const catB = await db.getByIndex('activities', 'categoryId', 'cat-b');

      return { catACount: catA.length, catBCount: catB.length };
    });

    expect(results.catACount).toBe(2);
    expect(results.catBCount).toBe(1);
  });

  test('should putMany records in a single transaction', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db, generateId } = await import('/js/storage/db.js');
      await db.init();

      const categories = [
        { id: generateId(), name: 'Morning', order: 0 },
        { id: generateId(), name: 'Work', order: 1 },
        { id: generateId(), name: 'Evening', order: 2 }
      ];

      await db.putMany('categories', categories);

      return await db.count('categories');
    });

    expect(result).toBe(3);
  });

  test('should generate unique IDs', async ({ page }) => {
    const ids = await page.evaluate(async () => {
      const { generateId } = await import('/js/storage/db.js');
      return [generateId(), generateId(), generateId()];
    });

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);

    // IDs should be valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const id of ids) {
      expect(id).toMatch(uuidRegex);
    }
  });

  test('should handle compound index for completions', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db, generateId } = await import('/js/storage/db.js');
      await db.init();

      const activityId = generateId();

      // Create a completion for today
      await db.put('completions', {
        id: generateId(),
        activityId: activityId,
        date: '2024-01-15',
        completedAt: new Date().toISOString()
      });

      // Try to find it by compound index
      const found = await db.getOneByIndex('completions', 'activityDate', [activityId, '2024-01-15']);

      // Try a date that doesn't exist
      const notFound = await db.getOneByIndex('completions', 'activityDate', [activityId, '2024-01-16']);

      return { found: !!found, notFound: !!notFound };
    });

    expect(result.found).toBe(true);
    expect(result.notFound).toBe(false);
  });
});
