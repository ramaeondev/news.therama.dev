import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { DEFAULT_TZ, LOCAL, isValidTimeZone, readChoice, resolveTimeZone, zoneAbbrev } from "@/lib/timezone";
import { useTimeZone } from "@/lib/timezone-context";
import { TimeZoneProvider } from "@/components/TimeZoneProvider";
import { absoluteTime, dayKey } from "@/lib/time";

afterEach(() => localStorage.clear());

function Probe() {
  const { choice, timeZone, setChoice } = useTimeZone();
  return (
    <div>
      <span data-testid="tz">{choice}|{timeZone}</span>
      <button onClick={() => setChoice("UTC")}>utc</button>
      <button onClick={() => setChoice("Not/AZone")}>bad</button>
      <button onClick={() => setChoice(DEFAULT_TZ)}>ist</button>
    </div>
  );
}

describe("time zone", () => {
  it("defaults to IST", () => {
    render(<TimeZoneProvider><Probe /></TimeZoneProvider>);
    expect(screen.getByTestId("tz").textContent).toBe("Asia/Kolkata|Asia/Kolkata");
    expect(zoneAbbrev("Asia/Kolkata")).toBe("IST");
    expect(zoneAbbrev("UTC")).toBe("UTC");
  });

  it("switches, remembers the choice and ignores invalid zones", () => {
    render(<TimeZoneProvider><Probe /></TimeZoneProvider>);
    act(() => screen.getByText("utc").click());
    expect(screen.getByTestId("tz").textContent).toBe("UTC|UTC");
    expect(localStorage.getItem("news-timezone")).toBe("UTC");
    expect(readChoice()).toBe("UTC");
    act(() => screen.getByText("bad").click());
    expect(screen.getByTestId("tz").textContent).toBe("UTC|UTC");
    act(() => screen.getByText("ist").click());
    expect(localStorage.getItem("news-timezone")).toBeNull();
  });

  it("resolves 'local' to the browser zone and rejects junk in storage", () => {
    expect(isValidTimeZone(resolveTimeZone(LOCAL))).toBe(true);
    localStorage.setItem("news-timezone", "Mars/Olympus");
    expect(readChoice()).toBe(DEFAULT_TZ);
  });

  it("formats and groups in the chosen zone", () => {
    const iso = "2026-11-20T20:00:00Z";
    expect(absoluteTime(iso, "Asia/Kolkata")).toMatch(/21 Nov 2026.*1:30\s?am.*IST/i);
    expect(absoluteTime(iso, "UTC")).toMatch(/20 Nov 2026.*8:00\s?pm.*UTC/i);
    expect(dayKey(iso, "Asia/Kolkata")).toBe("2026-11-21");
    expect(dayKey(iso, "UTC")).toBe("2026-11-20");
  });
});
