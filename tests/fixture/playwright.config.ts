// The page tests in templates/tests against a fixture site: SITE_DIR (good or bad, beside this file), served by Python's
// static server on SITE_PORT. CI runs the good site, where every test passes, then the bad one through check-bad.mjs,
// where every test must fail. Browsers run in CI only, never on a laptop that only edits.
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.SITE_PORT ?? 3100);
const dir = process.env.SITE_DIR ?? "good";

export default defineConfig({
  testDir: "../../templates/tests",
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory ${dir}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
