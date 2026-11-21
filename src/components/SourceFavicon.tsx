import { useState } from "react";
import { cn } from "@/lib/utils";

const COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500", "bg-teal-500"];

/** Publisher favicon with a coloured monogram fallback. */
export function SourceFavicon({ domain, name, size = 16, className }: { domain: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (failed || !domain) {
    const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
    return (
      <span
        aria-hidden="true"
        style={{ ...style, fontSize: Math.max(9, size * 0.55) }}
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", color, className)}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size > 16 ? 64 : 32}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={style}
      className={cn("shrink-0 rounded-sm", className)}
    />
  );
}
