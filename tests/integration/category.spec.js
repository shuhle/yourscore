import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Category Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should create a new category', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const category = await CategoryModel.create({ name: 'Test Category' });
      return category;
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test Category');
    expect(result.order).toBe(0);
    expect(result.createdAt).toBeDefined();
  });

  test('should seed uncategorized only', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const categories = await CategoryModel.seedDefaults();
      return {
        count: categories.length,
        names: categories.map(c => c.name)
      };
    });

    expect(result.count).toBe(1);
    expect(result.names).toEqual(['Uncategorized']);
  });

  test('should not duplicate default categories', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      // Seed twice
      await CategoryModel.seedDefaults();
      const categories = await CategoryModel.seedDefaults();

      return categories.length;
    });

    expect(result).toBe(1);
  });

  test('should get categories sorted by order', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      // Create out of order
      await CategoryModel.create({ name: 'Third', order: 2 });
      await CategoryModel.create({ name: 'First', order: 0 });
      await CategoryModel.create({ name: 'Second', order: 1 });

      const categories = await CategoryModel.getAll();
      return categories.map(c => c.name);
    });

    expect(result).toEqual(['First', 'Second', 'Third']);
  });

  test('should update a category', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const category = await CategoryModel.create({ name: 'Original' });
      const updated = await CategoryModel.update(category.id, { name: 'Updated' });

      return { original: category.name, updated: updated.name };
    });

    expect(result.original).toBe('Original');
    expect(result.updated).toBe('Updated');
  });

  test('should delete a category', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      await CategoryModel.getUncategorized();
      const category = await CategoryModel.create({ name: 'ToDelete' });
      const countBefore = await CategoryModel.count();

      await CategoryModel.delete(category.id);
      const countAfter = await CategoryModel.count();

      return { countBefore, countAfter };
    });

    expect(result.countBefore).toBe(2);
    expect(result.countAfter).toBe(1);
  });

  test('should prevent deleting Uncategorized', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel, UNCATEGORIZED_ID } = await import('/js/models/category.js');
      await db.init();

      await CategoryModel.getUncategorized(); // Ensure it exists

      try {
        await CategoryModel.delete(UNCATEGORIZED_ID);
        return { error: null };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.error).toContain('Cannot delete Uncategorized');
  });

  test('should prevent renaming Uncategorized', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel, UNCATEGORIZED_ID } = await import('/js/models/category.js');
      await db.init();

      await CategoryModel.getUncategorized();

      try {
        await CategoryModel.update(UNCATEGORIZED_ID, { name: 'Other' });
        return { error: null };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.error).toContain('Cannot rename Uncategorized');
  });

  test('should reorder categories', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      const cat1 = await CategoryModel.create({ name: 'A', order: 0 });
      const cat2 = await CategoryModel.create({ name: 'B', order: 1 });
      const cat3 = await CategoryModel.create({ name: 'C', order: 2 });

      // Reorder: C, A, B
      await CategoryModel.reorder([cat3.id, cat1.id, cat2.id]);

      const categories = await CategoryModel.getAll();
      return categories.map(c => c.name);
    });

    expect(result).toEqual(['C', 'A', 'B']);
  });

  test('should find category by name', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { CategoryModel } = await import('/js/models/category.js');
      await db.init();

      await CategoryModel.create({ name: 'Health' });

      const found = await CategoryModel.findByName('health'); // lowercase
      const notFound = await CategoryModel.findByName('nonexistent');

      return {
        found: found?.name,
        notFound: notFound
      };
    });

    expect(result.found).toBe('Health');
    expect(result.notFound).toBeUndefined();
  });
});
