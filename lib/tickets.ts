import type { TimestampLike } from "./dateBuckets";

/**
 * Tickets whose subject contains the search text, ignoring case. Always pass the full list:
 * searching an already-searched list is what used to stop results coming back after a backspace.
 */
export function searchBySubject<T extends { subject?: string }>(tickets: T[], text: string): T[] {
  if (text === "") return tickets;
  const needle = text.toLowerCase();
  return tickets.filter((ticket) => (ticket.subject ?? "").toLowerCase().includes(needle));
}

/** A Firestore timestamp as "dd.mm.yyyy hh:mm" in local time, or "unassigned" when there is none. */
export function formatTimestamp(timestamp: TimestampLike): string {
  if (!timestamp) return "unassigned";
  const date = new Date(timestamp.seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value itself, or "unassigned" for blank strings, empty arrays and missing values. */
export function displayValue<T>(value: T): T | "unassigned" {
  const present =
    (typeof value === "string" && value.trim() !== "") || (Array.isArray(value) && value.length > 0);
  return present ? value : "unassigned";
}
