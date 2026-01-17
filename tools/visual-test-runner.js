/**
 * Visual Test Runner
 * Runs Playwright tests and captures screenshots for AI analysis
 */

import { firefox, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'tests/visual/screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Capture screenshot of a page at a specific state
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} name - Screenshot name
 * @param {string} [viewport='desktop'] - Viewport size
 */
async function captureScreenshot(page, name, viewport = 'desktop') {
  const viewports = {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 }
  };

  const size = viewports[viewport] || viewports.desktop;
  await page.setViewportSize(size);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}_${viewport}_${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  console.log(`Screenshot saved: ${filepath}`);
  return filepath;
}

/**
 * Run visual tests and capture screenshots
 */
async function runVisualTests() {
  // Use Firefox on ARM64 (Apple Silicon) for better compatibility
  const isARM64 = process.arch === 'arm64';
  const browserType = isARM64 ? firefox : chromium;
  console.log(`Using ${isARM64 ? 'Firefox' : 'Chromium'} (${process.arch} architecture)`);

  const browser = await browserType.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  const screenshots = [];

  try {
    // Test 1: Home page in all viewports
    console.log('Testing home page...');
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    for (const viewport of ['mobile', 'tablet', 'desktop']) {
      const path = await captureScreenshot(page, 'home', viewport);
      screenshots.push({ name: 'home', viewport, path });
    }

    // Test 2: Navigation states
    console.log('Testing navigation...');
    const navViews = ['daily', 'activities', 'dashboard', 'settings'];
    for (const view of navViews) {
      await page.click(`[data-view="${view}"]`);
      await page.waitForTimeout(300); // Wait for any animations
      const path = await captureScreenshot(page, `nav-${view}`, 'mobile');
      screenshots.push({ name: `nav-${view}`, viewport: 'mobile', path });
    }

    console.log('\nVisual tests completed!');
    console.log(`Screenshots captured: ${screenshots.length}`);
    console.log('\nScreenshot paths:');
    screenshots.forEach(s => console.log(`  - ${s.path}`));

    return screenshots;
  } catch (error) {
    console.error('Visual test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if executed directly
if (process.argv[1].includes('visual-test-runner')) {
  runVisualTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runVisualTests, captureScreenshot };
