import { useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRedirect } from "@/lib/api";
import { TagChips } from "@/components/TagChips";
import { StoryImage } from "@/components/StoryImage";
import { modelName } from "@/lib/models";
import { ArrowLeft, ExternalLink, Link2, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSourceFeed, useStory } from "@/hooks/useNews";
import { ErrorPanel } from "@/components/States";
import { SourceFavicon } from "@/components/SourceFavicon";
import { StoryCard } from "@/components/StoryCard";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { absoluteTime, relativeTime } from "@/lib/time";
import { sourceByDomain } from "@/config/sources";
import NotFound from "@/pages/NotFound";
import { useTimeZone } from "@/lib/timezone-context";

const primarySourceName = (s: { sources: { source_name: string }[] }) => s.sources[0]?.source_name ?? "publisher";

function MoreFromSource({ domain, name, excludeId }: { domain: string; name: string; excludeId: string }) {
  const { data } = useSourceFeed(domain, 6);
  const items = (data?.pages[0] ?? []).filter((s) => s.id !== excludeId).slice(0, 5);
  if (!items.length) return null;
  const slug = sourceByDomain(domain)?.slug;
  return (
    <section aria-labelledby="more-heading" className="mt-12 border-t pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="more-heading" className="text-lg font-semibold">More from {name}</h2>
        {slug && <Link to={`/sources/${slug}`} className="text-sm font-medium text-primary hover:underline">View all</Link>}
      </div>
      <div className="space-y-3">{items.map((s) => <StoryCard key={s.id} story={s} />)}</div>
    </section>
  );
}

export default function Story() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: story, isPending, isError, refetch, isFetching } = useStory(id);
  const { timeZone } = useTimeZone();

  const back = () => (location.key !== "default" ? navigate(-1) : navigate("/"));

  // A story merged into another one by the admin: follow it.
  const missing = !isPending && !isError && !story && Boolean(id);
  const redirect = useQuery({
    queryKey: ["redirect", id],
    queryFn: ({ signal }) => fetchRedirect(id as string, signal),
    enabled: missing,
  });
  useEffect(() => {
    if (redirect.data) navigate(`/news/${redirect.data}`, { replace: true });
  }, [redirect.data, navigate]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading story">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-20 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (isError) return <div className="mx-auto max-w-3xl"><ErrorPanel onRetry={() => refetch()} retrying={isFetching} /></div>;
  if (!story && (redirect.isPending || redirect.data)) {
    return <div className="mx-auto max-w-3xl" role="status" aria-label="Loading story"><div className="h-10 w-full animate-pulse rounded bg-muted" /></div>;
  }
  if (!story) return <NotFound title="This story isn't available" message="It may have been removed or the link is incorrect." />;

  const primary = story.sources[0];
  const url = `https://news.therama.dev/news/${story.id}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: story.headline, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <article className="mx-auto max-w-3xl">
      <Seo title={story.headline} description={story.description} path={`/news/${story.id}`} />
      <button onClick={back} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to news
      </button>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        {story.sources.map((s) => (
          <span key={s.article_id} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-foreground/80">
            <SourceFavicon domain={s.source_domain} name={s.source_name} /> {s.source_name}
          </span>
        ))}
        {story.first_published_at && (
          <time dateTime={story.first_published_at}>
            {absoluteTime(story.first_published_at, timeZone)} · {relativeTime(story.first_published_at)}
          </time>
        )}
      </div>

      <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{story.headline}</h1>
      <TagChips tags={story.tags} className="mt-4" />

      {story.image_url && (
        <figure className="mt-6">
          <StoryImage src={story.image_url} eager className="aspect-video w-full rounded-lg" />
          <figcaption className="mt-2 text-xs text-muted-foreground">Image: {story.image_attribution ?? primarySourceName(story)}</figcaption>
        </figure>
      )}

      {story.summary && (
        <section aria-label="AI summary" className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> AI summary
          </h2>
          <p className="leading-relaxed">{story.summary}</p>
          {story.summary_takeaways && story.summary_takeaways.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold">Key takeaways</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {story.summary_takeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Summary by {modelName(story.summary_model)}
            {story.summary_generated_at && <> · generated {absoluteTime(story.summary_generated_at, timeZone)}</>}
            . AI-generated from the original article; read it for full details.
          </p>
        </section>
      )}

      {story.description && <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{story.description}</p>}

      {primary && (
        <div className="mt-8">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={primary.original_url} target="_blank" rel="noopener noreferrer">
              Read the full story at {primary.source_name}
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
          {primary.author && <p className="mt-3 text-sm text-muted-foreground">By {primary.author}</p>}
        </div>
      )}

      {story.sources.length > 1 && (
        <section aria-labelledby="sources-heading" className="mt-10">
          <h2 id="sources-heading" className="mb-3 text-lg font-semibold">Sources</h2>
          <ul className="divide-y rounded-lg border">
            {story.sources.map((s) => (
              <li key={s.article_id}>
                <a href={s.original_url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 hover:bg-muted/50">
                  <SourceFavicon domain={s.source_domain} name={s.source_name} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block font-medium">{s.title}</span>
                    <span className="text-sm text-muted-foreground">{s.source_name}{s.published_at ? ` · ${relativeTime(s.published_at)}` : ""}</span>
                  </span>
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex gap-2">
        <Button variant="outline" size="sm" onClick={copy}><Link2 className="mr-2 h-4 w-4" aria-hidden="true" /> Copy link</Button>
        <Button variant="outline" size="sm" onClick={share}><Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share</Button>
      </div>

      {primary && <MoreFromSource domain={primary.source_domain} name={primary.source_name} excludeId={story.id} />}
    </article>
  );
}
