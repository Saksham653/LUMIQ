// End-to-end tests (B7-4): Chromium only, against the production
// build served by vite preview (with the real CSP headers). Groq is
// mocked by route interception in the specs — no network, no key.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview",
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
