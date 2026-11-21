import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useFeed, useHasNewStories } from "@/hooks/useNews";
import { StoryCard, StoryListSkeleton } from "@/components/StoryCard";
import { EmptyState, ErrorPanel } from "@/components/States";
import { LoadMore } from "@/components/LoadMore";
import { SourceFavicon } from "@/components/SourceFavicon";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { SOURCES } from "@/config/sources";
import { dayLabel, groupByDay } from "@/lib/time";

export default function Home() {
  const feed = useFeed();
  const queryClient = useQueryClient();
  const stories = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages.flat() ?? []).filter((s) => !seen.has(s.id) && seen.add(s.id));
  }, [feed.data]);
  const groups = useMemo(() => groupByDay(stories, (s) => s.first_published_at), [stories]);
  const hasNew = useHasNewStories(stories[0]);

  const showNew = async () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await queryClient.resetQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["latest-marker"] });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Seo path="/" />
      <section aria-labelledby="feed-heading" className="mx-auto w-full max-w-3xl">
        <h1 id="feed-heading" className="text-2xl font-bold tracking-tight md:text-3xl">Latest AI news</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updated continuously from {SOURCES.length} sources.</p>

        {hasNew && (
          <div className="sticky top-16 z-30 mt-4 flex justify-center">
            <Button size="sm" className="rounded-full shadow-md" onClick={showNew}>
              <ArrowUp className="mr-1.5 h-4 w-4" aria-hidden="true" /> New stories
            </Button>
          </div>
        )}

        <div className="mt-6">
          {feed.isPending ? (
            <StoryListSkeleton />
          ) : feed.isError && !stories.length ? (
            <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} />
          ) : !stories.length ? (
            <EmptyState title="No stories yet">Check back soon.</EmptyState>
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.key} aria-label={dayLabel(g.key)} className="mb-6">
                  <h2 className="sticky top-14 z-20 -mx-1 mb-2 bg-background/90 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {g.key === "unknown" ? "Undated" : dayLabel(g.key)}
                  </h2>
                  <div className="space-y-3">
                    {g.items.map((s) => <StoryCard key={s.id} story={s} />)}
                  </div>
                </section>
              ))}
              {feed.isFetchNextPageError ? (
                <ErrorPanel compact onRetry={() => feed.fetchNextPage()} retrying={feed.isFetchingNextPage} />
              ) : (
                <LoadMore hasMore={Boolean(feed.hasNextPage)} loading={feed.isFetchingNextPage} onLoad={() => feed.fetchNextPage()} />
              )}
            </>
          )}
        </div>
      </section>

      <aside className="hidden lg:block" aria-label="Sources and about">
        <div className="sticky top-20 space-y-6">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold">Sources</h2>
            <ul className="space-y-2">
              {SOURCES.map((s) => (
                <li key={s.slug}>
                  <Link to={`/sources/${s.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <SourceFavicon domain={s.domain} name={s.name} /> {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <h2 className="mb-2 font-semibold text-foreground">About</h2>
            AI news from official company blogs and tech publications, with a link to every original story.{" "}
            <Link to="/about" className="font-medium text-primary hover:underline">Learn more</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
