import { test, expect } from '@playwright/test';

test.describe('Activities View', () => {
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

  async function openActivities(page) {
    await page.locator('#app-nav .nav-item', { hasText: 'Activities' }).click();
    await expect(page.locator('.activities-view[data-ready="true"]')).toBeVisible();
  }

  test('validates and creates an activity', async ({ page }) => {
    await openActivities(page);

    await page.locator('[data-testid="activity-submit"]').click({ noWaitAfter: true });
    await expect(page.locator('[data-testid="activity-form-error"]')).toHaveText('Activity name is required.');

    // Fill name and verify it's set
    const nameInput = page.locator('#activity-name');
    const pointsInput = page.locator('#activity-points');

    await nameInput.fill('Read 20 pages');
    await expect(nameInput).toHaveValue('Read 20 pages');

    await pointsInput.fill('0');
    await expect(pointsInput).toHaveValue('0');

    await page.locator('[data-testid="activity-submit"]').click({ noWaitAfter: true });
    await expect(page.locator('[data-testid="activity-form-error"]')).toHaveText('Points must be a positive number.');

    await pointsInput.fill('12');
    await expect(pointsInput).toHaveValue('12');
    await page.locator('[data-testid="activity-submit"]').click({ noWaitAfter: true });

    const activity = page.locator('.activity-row', { hasText: 'Read 20 pages' });
    await expect(activity).toBeVisible();
    await expect(activity).toContainText('12 pts');
  });

  test('edits and archives an activity', async ({ page }) => {
    await openActivities(page);

    const nameInput = page.locator('#activity-name');
    const pointsInput = page.locator('#activity-points');

    // Create activity
    await nameInput.fill('Morning Walk');
    await expect(nameInput).toHaveValue('Morning Walk');
    await pointsInput.fill('8');
    await expect(pointsInput).toHaveValue('8');
    await page.locator('[data-testid="activity-submit"]').click({ noWaitAfter: true });

    const activity = page.locator('.activity-row', { hasText: 'Morning Walk' });
    await expect(activity).toBeVisible();
    await activity.locator('[data-testid="activity-edit"]').click();

    // Edit activity
    await nameInput.fill('Morning Walk Plus');
    await expect(nameInput).toHaveValue('Morning Walk Plus');
    await pointsInput.fill('10');
    await expect(pointsInput).toHaveValue('10');
    await page.locator('[data-testid="activity-submit"]').click({ noWaitAfter: true });

    await expect(page.locator('.activity-row', { hasText: 'Morning Walk Plus' })).toBeVisible();

    const updated = page.locator('.activity-row', { hasText: 'Morning Walk Plus' });
    await updated.locator('[data-testid="activity-archive"]').click();

    await expect(page.locator('[data-testid="archived-list"]')).toContainText('Morning Walk Plus');
  });

});
