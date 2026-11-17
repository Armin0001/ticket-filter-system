import { describe, expect, it } from "vitest";
import { parseUrlFilter } from "./urlFilter";

describe("parseUrlFilter", () => {
  it("capitalises priorities, the way they are stored", () => {
    expect(parseUrlFilter("urgent")).toEqual({ priority: ["Urgent"] });
    expect(parseUrlFilter("low")).toEqual({ priority: ["Low"] });
  });

  it("capitalises folders too, so the Spam shortcut finds tickets in the Spam folder", () => {
    // Firestore `in` queries are case-sensitive; ["spam"] never matched the stored "Spam".
    expect(parseUrlFilter("spam")).toEqual({ folder: ["Spam"] });
    expect(parseUrlFilter("archive")).toEqual({ folder: ["Archive"] });
    expect(parseUrlFilter("inbox")).toEqual({ folder: ["Active"] });
  });

  it("keeps statuses lowercase, the way they are stored", () => {
    expect(parseUrlFilter("on-hold")).toEqual({ status: ["on-hold"] });
    expect(parseUrlFilter("open")).toEqual({ status: ["open"] });
  });

  it("reports a missing or unknown value instead of guessing", () => {
    expect(parseUrlFilter(null)).toEqual({ error: "no param" });
    expect(parseUrlFilter("")).toEqual({ error: "no param" });
    expect(parseUrlFilter("Urgent")).toEqual({ error: "Unknown input" });
    expect(parseUrlFilter("whatever")).toEqual({ error: "Unknown input" });
  });
});
