import { differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";

export const FALLBACK_TZ = "Asia/Kolkata";

export function readerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;
  } catch {
    return FALLBACK_TZ;
  }
}

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function dayKey(iso: string, timeZone = readerTimeZone()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** "Today", "Yesterday" or e.g. "Thu, 19 Nov" (adds the year when not the current year). */
export function dayLabel(key: string, now = new Date(), timeZone = readerTimeZone()): string {
  const today = dayKey(now.toISOString(), timeZone);
  const diff = differenceInCalendarDays(new Date(`${today}T00:00:00Z`), new Date(`${key}T00:00:00Z`));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(`${key}T12:00:00Z`);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

/** Groups items by reader-local day, preserving order. */
export function groupByDay<T>(items: T[], getIso: (item: T) => string | null, timeZone = readerTimeZone()) {
  const groups: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const iso = getIso(item);
    const key = iso ? dayKey(iso, timeZone) : "unknown";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

export function relativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (now.getTime() - date.getTime() < 60_000) return "just now";
  return `${formatDistanceToNowStrict(date, { addSuffix: false })} ago`
    .replace(/ seconds?/, "s").replace(/ minutes?/, "m").replace(/ hours?/, "h");
}

export function absoluteTime(iso: string, timeZone = readerTimeZone()): string {
  // en-IN gives readable zone names such as "IST"; other zones fall back to GMT offsets.
  return new Intl.DateTimeFormat("en-IN", {
    timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  }).format(new Date(iso));
}

/** ISO timestamp N hours ago (for search time chips). */
export const hoursAgoIso = (hours: number, now = new Date()) => new Date(now.getTime() - hours * 3_600_000).toISOString();
