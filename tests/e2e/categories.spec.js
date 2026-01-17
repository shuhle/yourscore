import { test, expect } from '@playwright/test';

test.describe('Categories View', () => {
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

  async function openCategories(page) {
    await page.locator('#app-nav .nav-item', { hasText: 'Categories' }).click();
    await expect(page.locator('.categories-view[data-ready="true"]')).toBeVisible();
  }

  async function openActivities(page) {
    await page.locator('#app-nav .nav-item', { hasText: 'Activities' }).click();
    await expect(page.locator('.activities-view[data-ready="true"]')).toBeVisible();
  }

  test('starts with Uncategorized and allows create/rename', async ({ page }) => {
    await openCategories(page);

    const list = page.locator('[data-testid="category-list"]');
    await expect(list).toContainText('Uncategorized');

    await page.fill('#category-name', 'Focus');
    await page.locator('[data-testid="category-submit"]').dispatchEvent('click');
    await expect(list).toContainText('Focus');

    const row = page.locator('.category-row', { hasText: 'Focus' });
    await row.locator('[data-testid="category-edit"]').click();
    await page.fill('#category-name', 'Deep Work');
    await page.locator('[data-testid="category-submit"]').dispatchEvent('click');

    await expect(list).toContainText('Deep Work');
    await expect(list).not.toContainText('Focus');
  });

  test('reorders categories with buttons and keeps Uncategorized last', async ({ page }) => {
    await openCategories(page);

    await page.fill('#category-name', 'Alpha');
    await page.locator('[data-testid="category-submit"]').click();
    await expect(page.locator('[data-testid="category-list"]')).toContainText('Alpha');
    await page.fill('#category-name', 'Beta');
    await page.locator('[data-testid="category-submit"]').click();
    await expect(page.locator('[data-testid="category-list"]')).toContainText('Beta');

    const betaRow = page.locator('.category-row', { hasText: 'Beta' });
    await betaRow.locator('[data-testid="category-move-up"]').click();

    const order = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.category-row-title')).map(el => el.textContent.trim());
    });

    expect(order.indexOf('Beta')).toBeLessThan(order.indexOf('Alpha'));
    expect(order[order.length - 1]).toBe('Uncategorized');
  });

  test('deletes category and moves activities to Uncategorized', async ({ page }) => {
    await openCategories(page);

    await page.fill('#category-name', 'Fitness');
    await page.locator('[data-testid="category-submit"]').dispatchEvent('click');

    await openActivities(page);
    await page.fill('#activity-name', 'Stretch');
    await page.fill('#activity-points', '5');
    await page.selectOption('#activity-category', { label: 'Fitness' });
    await page.locator('[data-testid="activity-submit"]').click();
    // Activity should appear under the Fitness category group
    const fitnessGroup = page.locator('.category-group', { has: page.locator('.category-header', { hasText: 'Fitness' }) });
    await expect(fitnessGroup.locator('.activity-row', { hasText: 'Stretch' })).toBeVisible();

    await openCategories(page);
    const fitnessRow = page.locator('.category-row', { hasText: 'Fitness' });
    await fitnessRow.locator('[data-testid="category-delete"]').click();
    await expect(page.locator('[data-testid="category-list"]')).not.toContainText('Fitness');

    await openActivities(page);
    // Activity should now appear under the Uncategorized category group
    const uncategorizedGroup = page.locator('.category-group', { has: page.locator('.category-header', { hasText: 'Uncategorized' }) });
    await expect(uncategorizedGroup.locator('.activity-row', { hasText: 'Stretch' })).toBeVisible();
  });
});
