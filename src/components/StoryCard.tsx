import { Link } from "react-router-dom";
import { ExternalLink, Sparkles } from "lucide-react";
import type { StoryWithSources } from "@/types/news";
import { SourceFavicon } from "@/components/SourceFavicon";
import { TimeAgo } from "@/components/TimeAgo";
import { Highlight } from "@/components/Highlight";
import { FEATURES } from "@/config/features";
import { Badge } from "@/components/ui/badge";
import { TagChips } from "@/components/TagChips";
import { StoryImage } from "@/components/StoryImage";

export function StoryCard({ story, query }: { story: StoryWithSources; query?: string }) {
  const primary = story.sources[0];
  const extra = Math.max(0, story.source_count - 1);
  return (
    <article className="group relative flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 motion-safe:animate-fade-in">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {primary && (
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              <SourceFavicon domain={primary.source_domain} name={primary.source_name} />
              {primary.source_name}
            </span>
          )}
          {primary && story.first_published_at && <span aria-hidden="true">·</span>}
          <TimeAgo iso={story.first_published_at} />
          {extra > 0 && <span className="text-primary">+{extra} more source{extra > 1 ? "s" : ""}</span>}
          {FEATURES.storyTypeBadges && story.story_type !== "news" && (
            <Badge variant="secondary" className="capitalize">{story.story_type.replace("_", " ")}</Badge>
          )}
        </div>
        <h3 className="line-clamp-3 text-base font-semibold leading-snug tracking-tight sm:text-lg">
          {/* The whole card is clickable via this stretched link. */}
          <Link to={`/news/${story.id}`} className="after:absolute after:inset-0 after:rounded-lg focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            <Highlight text={story.headline} query={query} />
          </Link>
        </h3>
        {story.summary ? (
          <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-brand" aria-label="AI summary" />
            <Highlight text={story.summary} query={query} />
          </p>
        ) : story.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            <Highlight text={story.description} query={query} />
          </p>
        ) : null}
        <TagChips tags={story.tags} max={3} className="mt-2.5" />
      </div>
      <StoryImage
        src={story.image_url}
        className="hidden h-20 w-32 shrink-0 self-center rounded-md sm:block md:h-24 md:w-40"
      />
      {primary && (
        <a
          href={primary.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 -mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Read at ${primary.source_name} (opens in new tab)`}
          title={`Read at ${primary.source_name}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </article>
  );
}

export function StoryCardSkeleton() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-4 w-4 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-5 w-11/12 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export function StoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading stories">
      {Array.from({ length: count }, (_, i) => <StoryCardSkeleton key={i} />)}
    </div>
  );
}
