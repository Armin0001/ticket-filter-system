export type TimestampLike = { seconds: number } | null | undefined;

export const DATE_BUCKETS = ["today", "yesterday", "last week", "last month"] as const;

/**
 * Local midnight `daysAgo` calendar days before `now` (negative for days ahead).
 * Built with calendar arithmetic rather than "minus 86,400,000 ms", because a day that
 * contains a daylight-saving change is 23 or 25 hours long.
 */
export function startOfDay(now: Date, daysAgo = 0): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime();
}

/**
 * Whether a Firestore timestamp falls in a date bucket. The buckets don't overlap:
 * today, yesterday, 2 to 7 days ago ("last week") and 8 to 30 days ago ("last month").
 * Unknown buckets match everything; a missing timestamp matches nothing.
 */
export function isInDateBucket(timestamp: TimestampLike, bucket: string, now = new Date()): boolean {
  if (!timestamp || !timestamp.seconds) return false;
  const t = timestamp.seconds * 1000;

  switch (bucket) {
    case "today":
      return t >= startOfDay(now) && t < startOfDay(now, -1);
    case "yesterday":
      return t >= startOfDay(now, 1) && t < startOfDay(now);
    case "last week":
      return t >= startOfDay(now, 7) && t < startOfDay(now, 1);
    case "last month":
      return t >= startOfDay(now, 30) && t < startOfDay(now, 7);
    default:
      return true;
  }
}
