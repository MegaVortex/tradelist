import { defineConfig, devices } from '@playwright/test';

const PREBUILT = !!process.env.PW_PREBUILT;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html']],
  use: {
    baseURL: baseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'on'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: PREBUILT
    ? [
        {
          command: 'npm run serve:test',
          url: 'http://127.0.0.1:8080/tradelist/',
          reuseExistingServer: true
        }
      ]
    : [
        {
          command: 'npm run build',
          reuseExistingServer: false,
          timeout: 1800_000
        },
        {
          command: 'npm run serve:test',
          url: 'http://127.0.0.1:8080/tradelist/',
          reuseExistingServer: !process.env.CI
        }
      ]
});
