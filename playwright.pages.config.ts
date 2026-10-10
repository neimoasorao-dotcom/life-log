import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const chromiumPath =
  process.env.CHROMIUM_EXECUTABLE_PATH ??
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests/pages",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 320, height: 740 },
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        browserName: "chromium",
        launchOptions: { executablePath: chromiumPath },
      },
    },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    env: { VITE_BASE_PATH: "/life-log/" },
    url: "http://127.0.0.1:4173/life-log/",
    reuseExistingServer: false,
  },
});
