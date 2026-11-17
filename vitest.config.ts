import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // A timezone with daylight saving time, so the date-bucket tests can check the 23- and
    // 25-hour days where "midnight minus 24 hours" is not yesterday's midnight.
    env: { TZ: "America/New_York" },
  },
});
