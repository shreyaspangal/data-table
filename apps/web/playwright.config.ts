import { defineConfig, devices } from "@playwright/test";

// Tier 3 of the testing matrix: cross-page product flows against the running
// app. Component-level behaviour (widths, sticky headers, cell rendering) is
// tested in packages/data-table via Vitest Browser Mode — not here. See
// docs/testing-matrix.md.
const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // A committed .only would silently narrow the suite in CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against a production build, not the dev server: dev-only
  // behaviour (unminified output, no React Compiler pass, different error
  // handling) would make green e2e runs unreliable evidence.
  webServer: {
    // In CI the build arrives as an artifact from the `build` job, so the
    // app is compiled once per pipeline rather than once per job.
    command: process.env.PW_SKIP_BUILD
      ? "./scripts/serve-standalone.sh"
      : "pnpm build && ./scripts/serve-standalone.sh",
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
