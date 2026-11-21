import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, groupByDay, relativeTime } from "@/lib/time";

const TZ = "Asia/Kolkata";

describe("time", () => {
  it("computes the calendar day in the reader's time zone", () => {
    // 20:00 UTC on the 20th is already the 21st in India (UTC+5:30)
    expect(dayKey("2026-11-20T20:00:00Z", TZ)).toBe("2026-11-21");
    expect(dayKey("2026-11-20T20:00:00Z", "UTC")).toBe("2026-11-20");
  });

  it("labels today, yesterday and older days", () => {
    const now = new Date("2026-11-21T06:00:00Z");
    expect(dayLabel("2026-11-21", now, TZ)).toBe("Today");
    expect(dayLabel("2026-11-20", now, TZ)).toBe("Yesterday");
    expect(dayLabel("2026-11-19", now, TZ)).toBe("Thu 19 Nov");
    expect(dayLabel("2025-11-19", now, TZ)).toContain("2025");
  });

  it("groups consecutive items by day, preserving order", () => {
    const items = ["2026-11-21T05:00:00Z", "2026-11-21T01:00:00Z", "2026-11-20T10:00:00Z", null];
    const groups = groupByDay(items, (x) => x, TZ);
    expect(groups.map((g) => [g.key, g.items.length])).toEqual([["2026-11-21", 2], ["2026-11-20", 1], ["unknown", 1]]);
  });

  it("formats compact relative times", () => {
    const now = new Date();
    expect(relativeTime(new Date(now.getTime() - 10_000).toISOString(), now)).toBe("just now");
    expect(relativeTime(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe("3h ago");
  });
});
