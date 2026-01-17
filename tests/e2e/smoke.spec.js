import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle('YourScore');

    // Check header is visible
    const header = page.locator('#app-header h1');
    await expect(header).toBeVisible();
    await expect(header).toHaveText('YourScore');
  });

  test('navigation is visible', async ({ page }) => {
    await page.goto('/');

    // Check navigation items
    const nav = page.locator('#app-nav');
    await expect(nav).toBeVisible();

    // Check all nav items exist
    await expect(nav.locator('[data-view="daily"]')).toBeVisible();
    await expect(nav.locator('[data-view="activities"]')).toBeVisible();
    await expect(nav.locator('[data-view="categories"]')).toBeVisible();
    await expect(nav.locator('[data-view="dashboard"]')).toBeVisible();
    await expect(nav.locator('[data-view="settings"]')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Click on settings
    await page.click('[data-view="settings"]');
    await expect(page.locator('[data-view="settings"]')).toHaveClass(/active/);

    // Click on activities
    await page.click('[data-view="activities"]');
    await expect(page.locator('[data-view="activities"]')).toHaveClass(/active/);
  });

  test('app works offline', async ({ page, context, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit offline navigation is unstable in Playwright.'
    );
    // First load the page normally
    await page.goto('/');
    await expect(page.locator('#app-header h1')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload and verify it still works (WebKit can be flaky on reload while offline)
    const reloadOffline = async () => {
      if (browserName === 'webkit') {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      await expect(page.locator('#app-header h1')).toBeVisible();
    };

    await expect(reloadOffline).toPass({ timeout: 10000 });

    // Go back online
    await context.setOffline(false);
  });
});
