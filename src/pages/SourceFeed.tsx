import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { sourceBySlug } from "@/config/sources";
import { useSourceFeed } from "@/hooks/useNews";
import { StoryCard, StoryListSkeleton } from "@/components/StoryCard";
import { EmptyState, ErrorPanel } from "@/components/States";
import { LoadMore } from "@/components/LoadMore";
import { SourceFavicon } from "@/components/SourceFavicon";
import { Seo } from "@/components/Seo";
import NotFound from "@/pages/NotFound";

export default function SourceFeed() {
  const { slug = "" } = useParams();
  const source = sourceBySlug(slug);
  const feed = useSourceFeed(source?.domain);
  const stories = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages.flat() ?? []).filter((s) => !seen.has(s.id) && seen.add(s.id));
  }, [feed.data]);

  if (!source) return <NotFound />;

  return (
    <div className="mx-auto max-w-3xl">
      <Seo title={source.name} description={`Latest AI news from ${source.name}.`} path={`/sources/${source.slug}`} />
      <Link to="/sources" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All sources
      </Link>
      <header className="mb-6 flex items-center gap-4">
        <SourceFavicon domain={source.domain} name={source.name} size={48} className="rounded-lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{source.name}</h1>
          <a href={`https://${source.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Visit {source.domain} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      </header>
      {feed.isPending ? (
        <StoryListSkeleton />
      ) : feed.isError && !stories.length ? (
        <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} />
      ) : !stories.length ? (
        <EmptyState title={`No stories from ${source.name} yet`}>New stories appear here as soon as they're published.</EmptyState>
      ) : (
        <>
          <div className="space-y-3">{stories.map((s) => <StoryCard key={s.id} story={s} />)}</div>
          <LoadMore auto={false} hasMore={Boolean(feed.hasNextPage)} loading={feed.isFetchingNextPage} onLoad={() => feed.fetchNextPage()} />
        </>
      )}
    </div>
  );
}
