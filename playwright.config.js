import { defineConfig, devices } from '@playwright/test';

// Detect if running on ARM64 (Apple Silicon in Docker)
const isARM64 = process.arch === 'arm64';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },
  projects: [
    // Use Firefox as primary on ARM64 (better compatibility), Chromium otherwise
    {
      name: 'desktop',
      use: isARM64
        ? { ...devices['Desktop Firefox'] }
        : { ...devices['Desktop Chrome'] },
    },
    // WebKit works well on ARM64 and matches Safari for iOS testing
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
    // Optional: Add Chromium as secondary if it's available
    ...(!isARM64 ? [] : [{
      name: 'chromium-optional',
      use: { ...devices['Desktop Chrome'] },
      grep: /@chromium/,  // Only run tests tagged with @chromium
    }]),
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
