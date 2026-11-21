import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
import { useDebounced, useSearch } from "@/hooks/useNews";
import { StoryCard, StoryListSkeleton } from "@/components/StoryCard";
import { EmptyState, ErrorPanel } from "@/components/States";
import { LoadMore } from "@/components/LoadMore";
import { Seo } from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hoursAgoIso } from "@/lib/time";
import { PAGE_SIZE } from "@/lib/api";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "", label: "Any time" },
  { key: "24h", label: "Past 24 h", hours: 24 },
  { key: "7d", label: "Past week", hours: 24 * 7 },
  { key: "30d", label: "Past month", hours: 24 * 30 },
] as const;
const SUGGESTIONS = ["OpenAI", "Gemini", "Claude", "open source model", "funding", "agents"];

const toIsoDay = (d: string, endOfDay = false) => (d ? new Date(`${d}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const range = params.get("range") ?? "";
  const fromDay = params.get("from") ?? "";
  const toDay = params.get("to") ?? "";
  const [input, setInput] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const debounced = useDebounced(input, 400);

  // Keep the box in sync when q changes from outside (header search, suggestion chips, back button).
  if (q !== syncedQ) {
    setSyncedQ(q);
    setInput(q);
  }
  useEffect(() => {
    if (debounced.trim() === q) return;
    const next = new URLSearchParams(params);
    if (debounced.trim()) next.set("q", debounced.trim()); else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const setParam = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  // `range` chips and the custom date range are mutually exclusive.
  const { from, to } = useMemo(() => {
    const r = RANGES.find((x) => x.key === range);
    if (r && "hours" in r) return { from: hoursAgoIso(r.hours), to: undefined };
    return { from: toIsoDay(fromDay), to: toIsoDay(toDay, true) };
    // Recompute the relative window only when the filter changes.
  }, [range, fromDay, toDay]);

  const hasQuery = Boolean(q.trim());
  const search = useSearch({ q, from, to });
  const results = useMemo(() => {
    const seen = new Set<string>();
    return (search.data?.pages.flat() ?? []).filter((s) => !seen.has(s.id) && seen.add(s.id));
  }, [search.data]);
  const filtered = Boolean(range || fromDay || toDay);
  const active = hasQuery || filtered;

  return (
    <div className="mx-auto max-w-3xl">
      <Seo title={hasQuery ? `Search: ${q}` : "Search"} path="/search" />
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Search</h1>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Search headlines and descriptions, e.g. "open source" model'
          aria-label="Search query"
          autoFocus={!q}
          className="h-12 pl-10 text-base"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Time filter">
        {RANGES.map((r) => {
          const selected = r.key === range && !(r.key === "" && (fromDay || toDay));
          return (
            <Button
              key={r.key || "any"}
              size="sm"
              variant={selected ? "default" : "outline"}
              className="rounded-full"
              aria-pressed={selected}
              onClick={() => setParam({ range: r.key, from: "", to: "" })}
            >
              {r.label}
            </Button>
          );
        })}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="ml-1">Added between</span>
          <input type="date" aria-label="From date" value={fromDay} max={toDay || undefined}
            onChange={(e) => setParam({ from: e.target.value, range: "" })}
            className="h-8 rounded-md border bg-background px-2 text-foreground" />
          <span>and</span>
          <input type="date" aria-label="To date" value={toDay} min={fromDay || undefined}
            onChange={(e) => setParam({ to: e.target.value, range: "" })}
            className="h-8 rounded-md border bg-background px-2 text-foreground" />
          {(fromDay || toDay) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Clear dates" onClick={() => setParam({ from: "", to: "" })}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        {!active ? (
          <div>
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="secondary" size="sm" className="rounded-full" onClick={() => setParam({ q: s })}>{s}</Button>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Tip: use quotes for exact phrases and a minus sign to exclude words, e.g. <code>"open source" -funding</code>.</p>
          </div>
        ) : search.isPending ? (
          <StoryListSkeleton />
        ) : search.isError && !results.length ? (
          <ErrorPanel onRetry={() => search.refetch()} retrying={search.isFetching} />
        ) : !results.length ? (
          <EmptyState title={hasQuery ? `No stories match "${q}"` : "No stories in this period"}>
            Try fewer words, a wider time range, or quotes for an exact phrase.
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {search.hasNextPage ? `${results.length}+` : results.length} result{results.length === 1 ? "" : "s"}
              {hasQuery && <> for <span className="font-medium text-foreground">"{q}"</span></>}
            </p>
            <div className={cn("space-y-3", search.isFetching && !search.isFetchingNextPage && "opacity-60")}>
              {results.map((s) => <StoryCard key={s.id} story={s} query={q} />)}
            </div>
            <LoadMore
              auto={false}
              hasMore={Boolean(search.hasNextPage) && results.length >= PAGE_SIZE}
              loading={search.isFetchingNextPage}
              onLoad={() => search.fetchNextPage()}
              endText="End of results."
            />
          </>
        )}
      </div>
    </div>
  );
}
