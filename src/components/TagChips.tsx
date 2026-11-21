import { Link } from "react-router-dom";
import type { StoryTag } from "@/types/news";
import { FEATURES } from "@/config/features";
import { cn } from "@/lib/utils";

const STYLE: Record<StoryTag["kind"], string> = {
  company: "border-primary/30 text-foreground/80",
  tool: "border-sky-500/30 text-foreground/80",
  category: "border-transparent bg-muted text-muted-foreground",
};

/** Company, tool and category chips; each opens a filtered search. */
export function TagChips({ tags, max, className }: { tags: StoryTag[]; max?: number; className?: string }) {
  if (!FEATURES.taxonomy || !tags.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Topics">
      {shown.map((t) => (
        <li key={`${t.kind}:${t.slug}`}>
          <Link
            to={`/search?${t.kind}=${encodeURIComponent(t.slug)}`}
            className={cn(
              "relative z-10 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              STYLE[t.kind],
            )}
          >
            {t.name}
          </Link>
        </li>
      ))}
      {max && tags.length > max && <li className="px-1 text-xs text-muted-foreground">+{tags.length - max}</li>}
    </ul>
  );
}
