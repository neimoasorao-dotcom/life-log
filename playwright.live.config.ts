import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests/pages",
  timeout: 90_000,
  use: {
    baseURL: "https://neimoasorao-dotcom.github.io",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "published-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 740 },
        launchOptions: {
          executablePath: existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined,
        },
      },
    },
    {
      name: "published-webkit-iphone",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
});
