import { describe, expect, it } from "vitest";
import { matchesDateBuckets, planQuery } from "./firestoreQuery";

describe("planQuery", () => {
  it("turns each field filter into an `in` clause on the lowercased field name", () => {
    expect(planQuery({ Priority: ["Urgent", "High"], status: ["open"] }).server).toEqual([
      { field: "priority", op: "in", values: ["Urgent", "High"] },
      { field: "status", op: "in", values: ["open"] },
    ]);
  });

  it("uses array-contains-any for the array fields", () => {
    expect(planQuery({ followers: ["bob@example.com"], Tags: ["billing"] }).server).toEqual([
      { field: "followers", op: "array-contains-any", values: ["bob@example.com"] },
      { field: "tags", op: "array-contains-any", values: ["billing"] },
    ]);
  });

  it("keeps date buckets out of the Firestore query", () => {
    const plan = planQuery({ dateCreated: "today", lastMessage: "last week", agent: ["ana@example.com"] });
    expect(plan.dateBuckets).toEqual({ dateCreated: "today", lastMessage: "last week" });
    expect(plan.server.map((f) => f.field)).toEqual(["agent"]);
  });

  it("is empty when there are no filters", () => {
    expect(planQuery({})).toEqual({ server: [], dateBuckets: {} });
  });
});

describe("matchesDateBuckets", () => {
  const now = new Date(2026, 10, 17, 12, 0);
  const seconds = (d: Date) => ({ seconds: d.getTime() / 1000 });
  const ticket = {
    dateCreated: seconds(new Date(2026, 10, 17, 9, 0)), // today
    lastMessage: seconds(new Date(2026, 10, 16, 9, 0)), // yesterday
  };

  it("requires every bucket to match", () => {
    expect(matchesDateBuckets(ticket, { dateCreated: "today", lastMessage: "yesterday" }, now)).toBe(true);
    expect(matchesDateBuckets(ticket, { dateCreated: "today", lastMessage: "today" }, now)).toBe(false);
  });

  it("matches everything when there are no buckets", () => {
    expect(matchesDateBuckets(ticket, {}, now)).toBe(true);
  });
});
