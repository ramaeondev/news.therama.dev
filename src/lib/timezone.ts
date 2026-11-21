// Display time zone for the whole site. Default: India Standard Time.
// The reader can switch (IST, UTC, their local zone, or any IANA zone); the choice is
// remembered in this browser only.

export const DEFAULT_TZ = "Asia/Kolkata";
export const LOCAL = "local";
const STORAGE_KEY = "news-timezone";

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Resolves a stored choice ("local" or an IANA name) to an IANA zone. */
export const resolveTimeZone = (choice: string) => (choice === LOCAL ? browserTimeZone() : choice);

/** Short label for a zone, e.g. "IST", "UTC", "GMT+1". */
export function zoneAbbrev(tz: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-IN", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? tz;
  } catch {
    return tz;
  }
}

/** All IANA zones the browser knows, with a small fallback list. */
export function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  const list = intl.supportedValuesOf?.("timeZone") ?? [
    "Asia/Kolkata", "UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles",
    "Asia/Singapore", "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney",
  ];
  return list.includes("UTC") ? list : ["UTC", ...list];
}

export function readChoice(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (v === LOCAL || isValidTimeZone(v))) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_TZ;
}

export function saveChoice(choice: string): void {
  try {
    if (choice === DEFAULT_TZ) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage unavailable: choice lasts for this page */
  }
}
