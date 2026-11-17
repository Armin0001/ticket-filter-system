import { describe, expect, it } from "vitest";
import { DATE_BUCKETS, isInDateBucket } from "./dateBuckets";

// vitest.config.ts runs these in America/New_York, which has daylight saving time.
const at = (...parts: [number, number, number, number?, number?]) => ({
  seconds: new Date(parts[0], parts[1], parts[2], parts[3] ?? 0, parts[4] ?? 0).getTime() / 1000,
});
const bucketsOf = (timestamp: { seconds: number }, now: Date) =>
  DATE_BUCKETS.filter((bucket) => isInDateBucket(timestamp, bucket, now));

describe("isInDateBucket", () => {
  const now = new Date(2026, 10, 17, 15, 0); // 17 Nov 2026, 15:00

  it("puts each day in the right bucket", () => {
    expect(bucketsOf(at(2026, 10, 17, 0, 0), now)).toEqual(["today"]);
    expect(bucketsOf(at(2026, 10, 17, 23, 59), now)).toEqual(["today"]);
    expect(bucketsOf(at(2026, 10, 16, 12, 0), now)).toEqual(["yesterday"]);
    expect(bucketsOf(at(2026, 10, 15, 12, 0), now)).toEqual(["last week"]); // 2 days ago
    expect(bucketsOf(at(2026, 10, 10, 12, 0), now)).toEqual(["last week"]); // 7 days ago
    expect(bucketsOf(at(2026, 10, 9, 12, 0), now)).toEqual(["last month"]); // 8 days ago
    expect(bucketsOf(at(2026, 9, 18, 12, 0), now)).toEqual(["last month"]); // 30 days ago
    expect(bucketsOf(at(2026, 9, 17, 12, 0), now)).toEqual([]); // 31 days ago
    expect(bucketsOf(at(2026, 10, 18, 0, 0), now)).toEqual([]); // tomorrow
  });

  it("never puts a moment in more than one bucket", () => {
    for (let hour = 0; hour < 40 * 24; hour++) {
      const moment = { seconds: now.getTime() / 1000 - hour * 3600 };
      expect(bucketsOf(moment, now).length).toBeLessThanOrEqual(1);
    }
  });

  it("keeps 'yesterday' to yesterday when yesterday was a 23-hour day", () => {
    // Clocks went forward on 8 Mar 2026. Subtracting 24 hours from midnight on the 9th lands on
    // 23:00 on the 7th, which used to count the last hour of the 7th as "yesterday".
    const morningAfter = new Date(2026, 2, 9, 0, 30);
    expect(isInDateBucket(at(2026, 2, 7, 23, 30), "yesterday", morningAfter)).toBe(false);
    expect(isInDateBucket(at(2026, 2, 8, 0, 30), "yesterday", morningAfter)).toBe(true);
  });

  it("keeps all of yesterday in 'yesterday' when yesterday was a 25-hour day", () => {
    // Clocks went back on 1 Nov 2026. 24 hours before midnight on the 2nd is 01:00 on the 1st,
    // which used to leave 00:00 to 01:00 on the 1st out of "yesterday".
    const dayAfter = new Date(2026, 10, 2, 10, 0);
    expect(isInDateBucket(at(2026, 10, 1, 0, 30), "yesterday", dayAfter)).toBe(true);
  });

  it("matches nothing without a timestamp, and everything for an unknown bucket", () => {
    expect(isInDateBucket(null, "today", now)).toBe(false);
    expect(isInDateBucket(undefined, "today", now)).toBe(false);
    expect(isInDateBucket(at(2020, 0, 1), "any time", now)).toBe(true);
  });
});
