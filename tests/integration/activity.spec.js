import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MODE__ = true;
  });
});

test.describe('Activity Model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      await db.init();
      await db.reset();
    });
  });

  test('should create a new activity', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const activity = await ActivityModel.create({
        name: 'Morning Run',
        description: 'Run for 30 minutes',
        points: 15,
        categoryId: 'health'
      });

      return activity;
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Morning Run');
    expect(result.description).toBe('Run for 30 minutes');
    expect(result.points).toBe(15);
    expect(result.categoryId).toBe('health');
    expect(result.archived).toBe(false);
  });

  test('should require name and positive points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const errors = [];

      try {
        await ActivityModel.create({ name: '', points: 10 });
      } catch (e) {
        errors.push('empty name: ' + e.message);
      }

      try {
        await ActivityModel.create({ name: 'Test', points: 0 });
      } catch (e) {
        errors.push('zero points: ' + e.message);
      }

      try {
        await ActivityModel.create({ name: 'Test', points: -5 });
      } catch (e) {
        errors.push('negative points: ' + e.message);
      }

      return errors;
    });

    expect(result.length).toBe(3);
    expect(result[0]).toContain('name is required');
    expect(result[1]).toContain('positive number');
    expect(result[2]).toContain('positive number');
  });

  test('should get activities excluding archived', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({ name: 'Active 1', points: 10 });
      await ActivityModel.create({ name: 'Active 2', points: 10 });
      const toArchive = await ActivityModel.create({ name: 'Archived', points: 10 });

      await ActivityModel.archive(toArchive.id);

      const active = await ActivityModel.getAll();
      const all = await ActivityModel.getAllIncludingArchived();

      return {
        activeCount: active.length,
        allCount: all.length,
        activeNames: active.map(a => a.name)
      };
    });

    expect(result.activeCount).toBe(2);
    expect(result.allCount).toBe(3);
    expect(result.activeNames).not.toContain('Archived');
  });

  test('should update an activity', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const activity = await ActivityModel.create({
        name: 'Original',
        description: 'Original desc',
        points: 10
      });

      const updated = await ActivityModel.update(activity.id, {
        name: 'Updated',
        description: 'Updated desc',
        points: 20
      });

      return { original: activity, updated };
    });

    expect(result.updated.name).toBe('Updated');
    expect(result.updated.description).toBe('Updated desc');
    expect(result.updated.points).toBe(20);
    expect(result.updated.id).toBe(result.original.id); // ID should not change
  });

  test('should archive and unarchive activities', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      const activity = await ActivityModel.create({ name: 'Test', points: 10 });

      const archived = await ActivityModel.archive(activity.id);
      const archivedList = await ActivityModel.getArchived();

      const unarchived = await ActivityModel.unarchive(activity.id);
      const unarchivedList = await ActivityModel.getArchived();

      return {
        archivedState: archived.archived,
        archivedCount: archivedList.length,
        unarchivedState: unarchived.archived,
        unarchivedCount: unarchivedList.length
      };
    });

    expect(result.archivedState).toBe(true);
    expect(result.archivedCount).toBe(1);
    expect(result.unarchivedState).toBe(false);
    expect(result.unarchivedCount).toBe(0);
  });

  test('should get activities by category', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({ name: 'Health 1', points: 10, categoryId: 'health' });
      await ActivityModel.create({ name: 'Health 2', points: 10, categoryId: 'health' });
      await ActivityModel.create({ name: 'Work 1', points: 10, categoryId: 'work' });

      const healthActivities = await ActivityModel.getByCategory('health');
      const workActivities = await ActivityModel.getByCategory('work');

      return {
        healthCount: healthActivities.length,
        workCount: workActivities.length
      };
    });

    expect(result.healthCount).toBe(2);
    expect(result.workCount).toBe(1);
  });

  test('should group activities by category', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({ name: 'H1', points: 10, categoryId: 'health' });
      await ActivityModel.create({ name: 'H2', points: 10, categoryId: 'health' });
      await ActivityModel.create({ name: 'W1', points: 10, categoryId: 'work' });

      const grouped = await ActivityModel.getGroupedByCategory();

      return {
        categories: Object.keys(grouped),
        healthCount: grouped['health']?.length || 0,
        workCount: grouped['work']?.length || 0
      };
    });

    expect(result.categories).toContain('health');
    expect(result.categories).toContain('work');
    expect(result.healthCount).toBe(2);
    expect(result.workCount).toBe(1);
  });

  test('should move activities between categories', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({ name: 'A1', points: 10, categoryId: 'old-cat' });
      await ActivityModel.create({ name: 'A2', points: 10, categoryId: 'old-cat' });

      const moved = await ActivityModel.moveToCategory('old-cat', 'new-cat');

      const oldCatActivities = await ActivityModel.getByCategory('old-cat');
      const newCatActivities = await ActivityModel.getByCategory('new-cat');

      return {
        moved,
        oldCount: oldCatActivities.length,
        newCount: newCatActivities.length
      };
    });

    expect(result.moved).toBe(2);
    expect(result.oldCount).toBe(0);
    expect(result.newCount).toBe(2);
  });

  test('should calculate total possible points', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/js/storage/db.js');
      const { ActivityModel } = await import('/js/models/activity.js');
      await db.init();

      await ActivityModel.create({ name: 'A1', points: 10 });
      await ActivityModel.create({ name: 'A2', points: 15 });
      await ActivityModel.create({ name: 'A3', points: 25 });

      return await ActivityModel.getTotalPossiblePoints();
    });

    expect(result).toBe(50);
  });

});
