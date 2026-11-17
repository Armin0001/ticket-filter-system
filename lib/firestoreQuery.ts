import { isInDateBucket, type TimestampLike } from "./dateBuckets";

const DATE_FIELDS = ["dateCreated", "lastActivity", "lastMessage"];
const ARRAY_FIELDS = ["followers", "Tags"];

export type ServerFilter = {
  field: string;
  op: "in" | "array-contains-any";
  values: unknown[];
};

export type QueryPlan = {
  /** Becomes one Firestore `where` clause each. */
  server: ServerFilter[];
  /** Date buckets, checked in the browser on the documents Firestore returns. */
  dateBuckets: Record<string, string>;
};

/**
 * Splits the active filters into the `where` clauses Firestore runs and the date buckets checked
 * client-side. Doing the dates in the browser keeps "today" relative to the user's clock and means
 * no composite index is needed for every combination of date and field filters.
 */
export function planQuery(filters: Record<string, any>): QueryPlan {
  const server: ServerFilter[] = [];
  const dateBuckets: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (DATE_FIELDS.includes(key)) {
      dateBuckets[key] = value;
      continue;
    }
    server.push({
      field: key.charAt(0).toLowerCase() + key.slice(1), // "Priority" -> "priority"
      op: ARRAY_FIELDS.includes(key) ? "array-contains-any" : "in",
      values: value,
    });
  }

  return { server, dateBuckets };
}

/** Whether a ticket falls in every date bucket of the plan (true when there are none). */
export function matchesDateBuckets(
  ticket: Record<string, unknown>,
  dateBuckets: Record<string, string>,
  now = new Date(),
): boolean {
  return Object.entries(dateBuckets).every(([field, bucket]) =>
    isInDateBucket(ticket[field] as TimestampLike, bucket, now),
  );
}
