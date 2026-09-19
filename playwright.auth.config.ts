import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/auth-browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/auth-browser-server.mjs",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15000 },
  },
});
