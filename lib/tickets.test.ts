import { describe, expect, it } from "vitest";
import { displayValue, formatTimestamp, searchBySubject } from "./tickets";

describe("searchBySubject", () => {
  const tickets = [
    { id: "1", subject: "Refund request" },
    { id: "2", subject: "Refund status" },
    { id: "3", subject: "Cannot log in" },
  ];
  const ids = (list: { id: string }[]) => list.map((t) => t.id);

  it("matches subjects ignoring case", () => {
    expect(ids(searchBySubject(tickets, "REFUND"))).toEqual(["1", "2"]);
  });

  it("returns the full list for an empty search", () => {
    expect(searchBySubject(tickets, "")).toBe(tickets);
  });

  it("widens again as characters are deleted, when given the full list each time", () => {
    // The page used to search the previous results, so "refund s" -> "refund" stayed at one ticket.
    expect(ids(searchBySubject(tickets, "refund s"))).toEqual(["2"]);
    expect(ids(searchBySubject(tickets, "refund"))).toEqual(["1", "2"]);
  });

  it("copes with tickets that have no subject", () => {
    const imported: { id: string; subject?: string }[] = [{ id: "4" }];
    expect(searchBySubject(imported, "x")).toEqual([]);
  });
});

describe("formatTimestamp", () => {
  it("shows day.month.year hours:minutes in local time", () => {
    const seconds = new Date(2026, 10, 7, 9, 5).getTime() / 1000;
    expect(formatTimestamp({ seconds })).toBe("07.11.2026 09:05");
  });

  it("says unassigned when there is no timestamp", () => {
    expect(formatTimestamp(null)).toBe("unassigned");
  });
});

describe("displayValue", () => {
  it("passes real values through and replaces blanks with 'unassigned'", () => {
    expect(displayValue("bob@example.com")).toBe("bob@example.com");
    expect(displayValue(["billing"])).toEqual(["billing"]);
    expect(displayValue("   ")).toBe("unassigned");
    expect(displayValue([])).toBe("unassigned");
    expect(displayValue(undefined)).toBe("unassigned");
  });
});
