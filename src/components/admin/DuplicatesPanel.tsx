import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceFavicon } from "@/components/SourceFavicon";
import { EmptyState, ErrorPanel } from "@/components/States";
import { dismissSuggestion, fetchMergeSuggestions, mergeStories, type MergeSuggestion } from "@/lib/adminApi";
import { absoluteTime, relativeTime } from "@/lib/time";
import { useTimeZone } from "@/lib/timezone-context";

interface SideView {
  headline: string;
  status: string;
  when: string | null;
  source: string | null;
  domain: string | null;
  url: string | null;
  count: number;
}

const side = (s: MergeSuggestion, which: "a" | "b"): SideView =>
  which === "a"
    ? { headline: s.a_headline, status: s.a_status, when: s.a_first_published_at, source: s.a_source_name, domain: s.a_source_domain, url: s.a_url, count: Number(s.a_source_count) }
    : { headline: s.b_headline, status: s.b_status, when: s.b_first_published_at, source: s.b_source_name, domain: s.b_source_domain, url: s.b_url, count: Number(s.b_source_count) };

function StoryBox({ v }: { v: SideView }) {
  const { timeZone } = useTimeZone();
  return (
    <div className="flex-1 rounded-md border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {v.source && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
            <SourceFavicon domain={v.domain ?? ""} name={v.source} /> {v.source}
          </span>
        )}
        {v.when && <time dateTime={v.when} title={absoluteTime(v.when, timeZone)}>{relativeTime(v.when)}</time>}
        <Badge variant="secondary">{v.status.replace("_", " ")}</Badge>
        {v.count > 1 && <Badge variant="outline">{v.count} sources</Badge>}
      </div>
      <p className="font-medium leading-snug">{v.headline}</p>
      {v.url && (
        <a href={v.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Original <ExternalLink className="h-3 w-3" aria-hidden="true" /><span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
    </div>
  );
}

/** Admin: pairs of stories with near-identical headlines; the admin merges or dismisses. */
export function DuplicatesPanel({ onAuthError }: { onAuthError: (e: unknown) => boolean }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin", "duplicates"], queryFn: () => fetchMergeSuggestions(50, 0), retry: false });

  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };
  const fail = (err: unknown) => {
    if (!onAuthError(err)) toast.error(err instanceof Error ? err.message : "Action failed");
  };
  const merge = useMutation({
    mutationFn: ({ keep, drop }: { keep: string; drop: string; id: string }) => mergeStories(keep, drop),
    onSuccess: () => done("Stories merged"),
    onError: fail,
  });
  const dismiss = useMutation({
    mutationFn: ({ id }: { id: string }) => dismissSuggestion(id),
    onSuccess: () => done("Marked as not the same"),
    onError: fail,
  });
  const busyId = (merge.isPending && merge.variables?.id) || (dismiss.isPending && dismiss.variables?.id) || null;

  if (list.isPending) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>;
  }
  if (list.isError) return onAuthError(list.error) ? null : <ErrorPanel onRetry={() => list.refetch()} retrying={list.isFetching} />;
  if (!list.data.length) {
    return <EmptyState title="No possible duplicates">Stories with very similar headlines published within 48 hours of each other appear here.</EmptyState>;
  }

  return (
    <ul className="space-y-4">
      {list.data.map((s) => {
        const busy = busyId === s.suggestion_id;
        return (
          <li key={s.suggestion_id} className="rounded-lg border p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Headline similarity <span className="font-semibold text-foreground">{Math.round(Number(s.score) * 100)}%</span>
            </p>
            <div className="flex flex-col gap-3 md:flex-row">
              <StoryBox v={side(s, "a")} />
              <StoryBox v={side(s, "b")} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => merge.mutate({ keep: s.a_id, drop: s.b_id, id: s.suggestion_id })}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                Merge into left
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => merge.mutate({ keep: s.b_id, drop: s.a_id, id: s.suggestion_id })}>
                Merge into right <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => dismiss.mutate({ id: s.suggestion_id })}>
                <X className="mr-1.5 h-4 w-4" aria-hidden="true" /> Not the same
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
