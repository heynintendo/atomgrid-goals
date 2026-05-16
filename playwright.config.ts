import { defineConfig, devices } from "@playwright/test";

// Single chromium project for hackathon — cross-browser audit is out of scope.
// webServer auto-starts pnpm dev if :3000 is free and reuses an existing
// instance otherwise, so `pnpm screenshots` works whether or not the dev
// server is already running in another terminal.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1, // shared dev DB — keep tests serial to avoid races
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
