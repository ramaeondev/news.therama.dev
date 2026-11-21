import { useMemo } from "react";
import { Clock } from "lucide-react";
import { DEFAULT_TZ, LOCAL, allTimeZones, browserTimeZone, zoneAbbrev } from "@/lib/timezone";
import { useTimeZone } from "@/lib/timezone-context";
import { cn } from "@/lib/utils";

/** Header control: shows the current zone (e.g. "IST") and switches all times on the site. */
export function TimeZonePicker({ className }: { className?: string }) {
  const { choice, timeZone, setChoice } = useTimeZone();
  const zones = useMemo(() => allTimeZones(), []);
  const local = browserTimeZone();
  return (
    <label
      className={cn(
        "relative inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
      title={`Times shown in ${timeZone}`}
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span aria-hidden="true">{zoneAbbrev(timeZone)}</span>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label={`Time zone for dates (currently ${timeZone})`}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <optgroup label="Common">
          <option value={DEFAULT_TZ}>India (IST, default)</option>
          <option value="UTC">UTC</option>
          <option value={LOCAL}>My local time ({local})</option>
        </optgroup>
        <optgroup label="All time zones">
          {zones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
