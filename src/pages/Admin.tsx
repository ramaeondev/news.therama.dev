import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, ExternalLink, Loader2, LogOut, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SourceFavicon } from "@/components/SourceFavicon";
import { EmptyState, ErrorPanel } from "@/components/States";
import { LotusMark } from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { loadSession, signIn, signOut } from "@/lib/auth";
import {
  AuthRequiredError, fetchAdminStories, fetchMergeSuggestionCount, fetchStatusCounts, resummarizeStory, setStoryStatus, type AdminStatus, type AdminStory,
} from "@/lib/adminApi";
import { DuplicatesPanel } from "@/components/admin/DuplicatesPanel";
import { absoluteTime, relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useTimeZone } from "@/lib/timezone-context";

const PAGE = 50;
type TabKey = AdminStatus | "duplicates";
const TABS: { key: TabKey; label: string }[] = [
  { key: "pending_review", label: "Pending" },
  { key: "duplicates", label: "Possible duplicates" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(password);
      setPassword("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-xl border p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <LotusMark className="h-12 w-12" />
        <h1 className="mt-3 text-xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and publish AI News stories.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="admin-password" className="sr-only">Password</label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "admin-error" : undefined}
        />
        {error && <p id="admin-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />} Sign in
        </Button>
      </form>
    </div>
  );
}

const ACTIONS: Record<AdminStatus, { to: AdminStatus; label: string; icon: typeof Check; variant: "default" | "outline" }[]> = {
  pending_review: [
    { to: "published", label: "Publish", icon: Check, variant: "default" },
    { to: "rejected", label: "Reject", icon: X, variant: "outline" },
  ],
  published: [{ to: "archived", label: "Unpublish", icon: Archive, variant: "outline" }],
  rejected: [
    { to: "published", label: "Publish", icon: Check, variant: "default" },
    { to: "pending_review", label: "Back to pending", icon: RotateCcw, variant: "outline" },
  ],
  archived: [
    { to: "published", label: "Republish", icon: Check, variant: "default" },
    { to: "pending_review", label: "Back to pending", icon: RotateCcw, variant: "outline" },
  ],
};

const DONE_TEXT: Record<AdminStatus, string> = {
  published: "Published",
  rejected: "Rejected",
  archived: "Unpublished",
  pending_review: "Moved to pending",
};

function StoryRow({ story, onAction, onResummarize, busyId }: { story: AdminStory; onAction: (s: AdminStory, to: AdminStatus) => void; onResummarize: (s: AdminStory) => void; busyId: string | null }) {
  const busy = busyId === story.id;
  const { timeZone } = useTimeZone();
  return (
    <li className="rounded-lg border p-4">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {story.source_name && (
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
            <SourceFavicon domain={story.source_domain ?? ""} name={story.source_name} /> {story.source_name}
          </span>
        )}
        {story.source_trust_score != null && <Badge variant="secondary">trust {story.source_trust_score}</Badge>}
        {story.first_published_at && (
          <time dateTime={story.first_published_at} title={absoluteTime(story.first_published_at, timeZone)}>
            {relativeTime(story.first_published_at)}
          </time>
        )}
        {story.last_reviewed_at && <span>· reviewed {relativeTime(story.last_reviewed_at)}</span>}
      </div>
      <h3 className="font-semibold leading-snug">{story.headline}</h3>
      {story.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{story.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ACTIONS[story.publication_status].map((a) => (
          <Button key={a.to} size="sm" variant={a.variant} disabled={busy} onClick={() => onAction(story, a.to)}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <a.icon className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {a.label}
          </Button>
        ))}
        {story.original_url && (
          <a href={story.original_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Original <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in new tab)</span>
          </a>
        )}
        {story.publication_status === "published" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onResummarize(story)} title="Write a fresh AI summary (within about 5 minutes)">
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" /> Re-summarise
          </Button>
        )}
        {story.publication_status === "published" && (
          <a href={`/news/${story.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            On site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}

function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const [tab, setTab] = useState<TabKey>("pending_review");
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleAuthError = (err: unknown) => {
    if (err instanceof AuthRequiredError) {
      qc.removeQueries({ queryKey: ["admin"] });
      onSignedOut();
      return true;
    }
    return false;
  };

  const counts = useQuery({ queryKey: ["admin", "counts"], queryFn: fetchStatusCounts, retry: false });
  const dupCount = useQuery({ queryKey: ["admin", "dup-count"], queryFn: fetchMergeSuggestionCount, retry: false });
  const statusTab: AdminStatus = tab === "duplicates" ? "pending_review" : tab;
  const list = useInfiniteQuery({
    queryKey: ["admin", "list", statusTab],
    queryFn: ({ pageParam }) => fetchAdminStories(statusTab, PAGE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
    retry: false,
  });
  // Expired session or lost admin rights: drop back to the sign-in form.
  const authError = [counts.error, list.error, dupCount.error].find((e) => e instanceof AuthRequiredError);
  useEffect(() => {
    if (authError) {
      qc.removeQueries({ queryKey: ["admin"] });
      onSignedOut();
    }
  }, [authError, qc, onSignedOut]);

  const mutation = useMutation({
    mutationFn: ({ story, to }: { story: AdminStory; to: AdminStatus }) => setStoryStatus(story.id, to),
    onMutate: ({ story }) => setBusyId(story.id),
    onSuccess: (_d, { story, to }) => {
      toast.success(`${DONE_TEXT[to]}: ${story.headline.slice(0, 60)}${story.headline.length > 60 ? "…" : ""}`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      // Public pages pick up the change on their next fetch.
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["story", story.id] });
    },
    onError: (err) => {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Action failed");
    },
    onSettled: () => setBusyId(null),
  });

  const resummarize = useMutation({
    mutationFn: (story: AdminStory) => resummarizeStory(story.id),
    onMutate: (story) => setBusyId(story.id),
    onSuccess: () => {
      toast.success("Summary cleared; a fresh one is written within about 5 minutes");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err) => {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Action failed");
    },
    onSettled: () => setBusyId(null),
  });

  const stories = list.data?.pages.flat() ?? [];
  const logout = async () => {
    await signOut();
    qc.removeQueries({ queryKey: ["admin"] });
    onSignedOut();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheck className="h-6 w-6 text-brand" aria-hidden="true" /> Admin
        </h1>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sign out
        </Button>
      </div>

      <div role="tablist" aria-label="Story status" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs", tab === t.key ? "bg-primary-foreground/20" : "bg-muted")}>
              {t.key === "duplicates" ? (dupCount.data ?? "…") : counts.data ? counts.data[t.key] : "…"}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "duplicates" ? (
          <DuplicatesPanel onAuthError={handleAuthError} />
        ) : list.isPending ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" /></div>
        ) : list.isError ? (
          <ErrorPanel onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : !stories.length ? (
          <EmptyState title={tab === "pending_review" ? "Nothing to review" : "No stories here"}>
            {tab === "pending_review" ? "New stories from lower-trust sources will appear here." : undefined}
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-3">
              {stories.map((s) => (
                <StoryRow key={s.id} story={s} busyId={busyId} onAction={(story, to) => mutation.mutate({ story, to })} onResummarize={(story) => resummarize.mutate(story)} />
              ))}
            </ul>
            {list.hasNextPage && (
              <div className="flex justify-center py-6">
                <Button variant="outline" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [signedIn, setSignedIn] = useState(() => Boolean(loadSession()));
  return (
    <>
      <Helmet>
        <title>Admin | therama AI News</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {signedIn ? <Dashboard onSignedOut={() => setSignedIn(false)} /> : <Login onDone={() => setSignedIn(true)} />}
    </>
  );
}
