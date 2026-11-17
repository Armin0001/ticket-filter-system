const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "pending", "solved", "closed", "on-hold"];

// Folder names are stored capitalised in Firestore ("Spam"), and `in` queries are case-sensitive,
// so the lowercase URL value has to be mapped. "inbox" is an alias for the Active folder.
const FOLDERS: Record<string, string> = {
  active: "Active",
  inbox: "Active",
  archive: "Archive",
  spam: "Spam",
  trash: "Trash",
};

export type UrlFilter = Record<string, string[]> | { error: string };

/**
 * Turns the `?filter=` value behind the header shortcuts (urgent, spam, open, ...) into the filter it
 * stands for, spelled the way the value is stored: priorities and folders capitalised, statuses lowercase.
 */
export function parseUrlFilter(input: string | null): UrlFilter {
  if (!input) return { error: "no param" };
  if (PRIORITIES.includes(input)) return { priority: [input.charAt(0).toUpperCase() + input.slice(1)] };
  if (input in FOLDERS) return { folder: [FOLDERS[input]] };
  if (STATUSES.includes(input)) return { status: [input] };
  return { error: "Unknown input" };
}
