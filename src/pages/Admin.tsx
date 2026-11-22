import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, LogOut, ShieldCheck, Sparkles } from "lucide-react";
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
  AuthRequiredError, fetchAdminStories, fetchAllStoryIds, fetchMergeSuggestionCount, fetchStatusCounts, resummarizeStory, setStoriesStatus, setStoryStatus, type AdminStatus, type AdminStory,
} from "@/lib/adminApi";
import { BulkBar } from "@/components/admin/BulkBar";
import { ConfirmStatusDialog } from "@/components/admin/ConfirmStatusDialog";
import { DuplicatesPanel } from "@/components/admin/DuplicatesPanel";
import { ACTIONS, DONE_TEXT } from "@/components/admin/statusActions";
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

interface StoryRowProps {
  story: AdminStory;
  selected: boolean;
  onToggle: (id: string, next: boolean) => void;
  onAction: (s: AdminStory, to: AdminStatus) => void;
  onResummarize: (s: AdminStory) => void;
  busyId: string | null;
  disabled: boolean;
}

function StoryRow({ story, selected, onToggle, onAction, onResummarize, busyId, disabled }: StoryRowProps) {
  const busy = busyId === story.id;
  const { timeZone } = useTimeZone();
  return (
    <li className={cn("flex gap-3 rounded-lg border p-4", selected && "border-primary/60 bg-muted/40")}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
        checked={selected}
        disabled={disabled}
        onChange={(e) => onToggle(story.id, e.target.checked)}
        aria-label={`Select ${story.headline}`}
      />
      <div className="min-w-0 flex-1">
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
            <Button key={a.to} size="sm" variant={a.variant} disabled={busy || disabled} onClick={() => onAction(story, a.to)}>
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
            <Button size="sm" variant="ghost" disabled={busy || disabled} onClick={() => onResummarize(story)} title="Write a fresh AI summary (within about 5 minutes)">
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" /> Re-summarise
            </Button>
          )}
          {story.publication_status === "published" && (
            <a href={`/news/${story.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              On site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

interface SelectAllProps {
  loadedCount: number;
  /** Selected stories among the loaded rows. */
  loadedSelected: number;
  /** Stories in this tab on the server, when known. */
  total: number | undefined;
  /** Selected ids that aren't loaded yet ("select all" on a long queue). */
  extraCount: number;
  busy: boolean;
  onToggleLoaded: (next: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Header above the list: select every loaded story, or the whole tab. */
function SelectAllRow({ loadedCount, loadedSelected, total, extraCount, busy, onToggleLoaded, onSelectAll, onClear }: SelectAllProps) {
  const allLoaded = loadedCount > 0 && loadedSelected === loadedCount;
  const some = loadedSelected > 0 && !allLoaded;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  const missing = total != null ? total - loadedCount - extraCount : 0;
  const anySelected = loadedSelected + extraCount > 0;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
        <input
          ref={ref}
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-primary"
          checked={allLoaded}
          disabled={busy || !loadedCount}
          onChange={(e) => onToggleLoaded(e.target.checked)}
        />
        Select all loaded ({loadedCount})
      </label>
      {missing > 0 && (
        <Button size="sm" variant="outline" disabled={busy} onClick={onSelectAll}>
          Select all {total}
        </Button>
      )}
      {anySelected && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
          Clear selection
        </Button>
      )}
    </div>
  );
}


function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const [tab, setTab] = useState<TabKey>("pending_review");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  /** Bulk action awaiting confirmation, with the count frozen while it runs. */
  const [pendingBulk, setPendingBulk] = useState<{ to: AdminStatus; count: number } | null>(null);
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
      // The row is leaving this tab, so drop it from the bulk selection too.
      setSelected((prev) => {
        if (!prev.has(story.id)) return prev;
        const next = new Set(prev);
        next.delete(story.id);
        return next;
      });
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

  const bulk = useMutation({
    mutationFn: ({ ids, to }: { ids: string[]; to: AdminStatus }) => setStoriesStatus(ids, to),
    onSuccess: ({ succeeded, failed }, { ids, to }) => {
      const n = succeeded.length;
      if (failed.length) {
        toast.warning(`${DONE_TEXT[to]} ${n} of ${ids.length} — ${failed.length} failed. Retry the rest below.`);
      } else {
        toast.success(`${DONE_TEXT[to]} ${n} ${n === 1 ? "story" : "stories"}`);
      }
      // Keep only the failures selected so a retry is one click.
      setSelected(new Set(failed.map((f) => f.id)));
      setPendingBulk(null);
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      for (const id of ids) qc.invalidateQueries({ queryKey: ["story", id] });
    },
    onError: (err) => {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Action failed");
      setPendingBulk(null);
    },
  });

  const stories = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);
  const loadedIds = useMemo(() => stories.map((s) => s.id), [stories]);
  const loadedSet = useMemo(() => new Set(loadedIds), [loadedIds]);
  const storyById = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);
  // Transitions only make sense for stories that share a status, so the bar follows the first selected row.
  const selectionStatus: AdminStatus = selected.size
    ? storyById.get(selected.values().next().value as string)?.publication_status ?? statusTab
    : statusTab;
  const bulkBusy = bulk.isPending;
  // Stories picked by "Select all" that aren't loaded yet still count towards the batch.
  const extraCount = useMemo(() => [...selected].filter((id) => !loadedSet.has(id)).length, [selected, loadedSet]);
  const loadedSelected = selected.size - extraCount;

  const selectTab = (next: TabKey) => {
    setTab(next);
    setSelected(new Set());
    setPendingBulk(null);
  };

  const toggleStory = (id: string, next: boolean) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (next) s.add(id); else s.delete(id);
      return s;
    });
  const toggleLoaded = (next: boolean) => setSelected(next ? new Set(loadedIds) : new Set());
  const runBulk = (to: AdminStatus) => {
    if (!selected.size) return;
    // Publishing or rejecting many stories changes the public site, so ask first.
    if (selected.size > 1) {
      setPendingBulk({ to, count: selected.size });
      return;
    }
    bulk.mutate({ ids: [...selected], to });
  };
  const confirmBulk = () => {
    if (!pendingBulk) return;
    bulk.mutate({ ids: [...selected], to: pendingBulk.to });
  };
  const selectAll = async () => {
    setSelectingAll(true);
    try {
      const ids = await fetchAllStoryIds(statusTab);
      setSelected(new Set(ids));
      if (counts.data && ids.length < counts.data[statusTab]) {
        toast.info(`Selected the first ${ids.length} stories.`);
      }
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Could not select all stories");
    } finally {
      setSelectingAll(false);
    }
  };

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
            onClick={() => selectTab(t.key)}
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
            <SelectAllRow
              loadedCount={loadedIds.length}
              loadedSelected={Math.min(loadedSelected, loadedIds.length)}
              total={counts.data?.[statusTab]}
              extraCount={extraCount}
              busy={bulkBusy || selectingAll}
              onToggleLoaded={toggleLoaded}
              onSelectAll={selectAll}
              onClear={() => setSelected(new Set())}
            />
            <BulkBar
              status={selectionStatus}
              count={selected.size}
              busy={bulkBusy || selectingAll}
              onAction={runBulk}
              onClear={() => setSelected(new Set())}
            />
            <ul className="space-y-3">
              {stories.map((s) => (
                <StoryRow
                  key={s.id}
                  story={s}
                  selected={selected.has(s.id)}
                  onToggle={toggleStory}
                  busyId={busyId}
                  disabled={bulkBusy || selectingAll}
                  onAction={(story, to) => mutation.mutate({ story, to })}
                  onResummarize={(story) => resummarize.mutate(story)}
                />
              ))}
            </ul>
            {list.hasNextPage && (
              <div className="flex justify-center py-6">
                <Button variant="outline" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
            <ConfirmStatusDialog
              count={pendingBulk?.count ?? null}
              status={selectionStatus}
              target={pendingBulk?.to ?? "published"}
              busy={bulkBusy}
              onConfirm={confirmBulk}
              onOpenChange={(open) => !open && setPendingBulk(null)}
            />
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
        <title>Admin | AI News</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {signedIn ? <Dashboard onSignedOut={() => setSignedIn(false)} /> : <Login onDone={() => setSignedIn(true)} />}
    </>
  );
}
