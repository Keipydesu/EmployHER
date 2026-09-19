import { defineConfig } from "@playwright/test";
import demo from "./playwright.config";
import authenticated from "./playwright.auth.config";

export default defineConfig({
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: "demo", testDir: demo.testDir, use: demo.use },
    {
      name: "authenticated",
      testDir: authenticated.testDir,
      use: authenticated.use,
    },
  ],
  webServer: [demo.webServer!, authenticated.webServer!].flat(),
});
