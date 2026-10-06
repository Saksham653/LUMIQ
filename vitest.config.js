import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

// This file replaces vite.config.js for vitest, so the react plugin
// must be repeated here. Its one job: keep vitest away from the
// Playwright specs (those run via `npm run test:e2e`).
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
