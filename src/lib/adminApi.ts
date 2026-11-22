// Admin-only RPCs (ai_news.admin_*), called with the admin's access token.
import { API_KEY, ApiError, buildUrl } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/auth";

export type AdminStatus = "pending_review" | "published" | "rejected" | "archived";

export interface AdminStory {
  id: string;
  headline: string;
  description: string | null;
  publication_status: AdminStatus;
  first_published_at: string | null;
  published_at: string | null;
  created_at: string;
  article_id: string | null;
  original_url: string | null;
  author: string | null;
  source_name: string | null;
  source_domain: string | null;
  source_trust_score: number | null;
  last_review_status: string | null;
  last_reviewed_at: string | null;
}

export class AuthRequiredError extends Error {}

async function adminRpc<T>(fn: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new AuthRequiredError("Signed out");
  let resp: Response;
  try {
    resp = await fetch(buildUrl(`rpc/${fn}`), {
      method: "POST",
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Profile": "ai_news",
        "Accept-Profile": "ai_news",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Network error: the server could not be reached.");
  }
  if (resp.status === 401 || resp.status === 403) {
    clearSession();
    throw new AuthRequiredError("Session expired or not an admin");
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ApiError(resp.status, `API ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchStatusCounts(): Promise<Record<AdminStatus, number>> {
  const rows = await adminRpc<{ publication_status: AdminStatus; story_count: number }[]>("admin_status_counts", {});
  const counts = { pending_review: 0, published: 0, rejected: 0, archived: 0 } as Record<AdminStatus, number>;
  for (const r of rows) if (r.publication_status in counts) counts[r.publication_status] = Number(r.story_count);
  return counts;
}

export const fetchAdminStories = (status: AdminStatus, limit = 50, offset = 0) =>
  adminRpc<AdminStory[]>("admin_list_stories", { p_status: status, p_limit: limit, p_offset: offset });

export const setStoryStatus = (storyId: string, status: AdminStatus, note?: string) =>
  adminRpc<{ story_id: string; publication_status: AdminStatus }>("admin_set_story_status", {
    p_story_id: storyId,
    p_status: status,
    p_note: note ?? null,
  });

export interface BatchStatusResult {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

/**
 * Applies one status to many stories, a few at a time so the API isn't flooded.
 * The backend RPC takes a single id, so this fans out; partial failures are
 * reported per story instead of failing the whole batch. An expired session
 * still surfaces as AuthRequiredError (after the in-flight calls settle).
 */
export async function setStoriesStatus(
  ids: string[],
  status: AdminStatus,
  note?: string,
  concurrency = 4,
): Promise<BatchStatusResult> {
  const outcomes: (Error | null)[] = new Array(ids.length).fill(null);
  let authError: AuthRequiredError | null = null;
  let next = 0;
  const worker = async () => {
    while (next < ids.length && !authError) {
      const i = next++;
      try {
        await setStoryStatus(ids[i], status, note);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          authError = err;
          return;
        }
        outcomes[i] = err instanceof Error ? err : new Error("Action failed");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  if (authError) throw authError;
  const result: BatchStatusResult = { succeeded: [], failed: [] };
  ids.forEach((id, i) => {
    const err = outcomes[i];
    if (err) result.failed.push({ id, message: err.message });
    else result.succeeded.push(id);
  });
  return result;
}

/** Upper bound for "select all": large queues are still a handful of pages. */
export const SELECT_ALL_CAP = 500;

/** Every story id in a status tab, paging through `admin_list_stories`. */
export async function fetchAllStoryIds(status: AdminStatus, cap = SELECT_ALL_CAP, pageSize = 50): Promise<string[]> {
  const ids: string[] = [];
  for (let offset = 0; offset < cap; offset += pageSize) {
    const rows = await fetchAdminStories(status, Math.min(pageSize, cap - offset), offset);
    ids.push(...rows.map((r) => r.id));
    if (rows.length < pageSize) break;
  }
  return ids;
}

export interface MergeSuggestion {
  suggestion_id: string;
  score: number;
  created_at: string;
  a_id: string; a_headline: string; a_status: AdminStatus; a_first_published_at: string | null;
  a_source_name: string | null; a_source_domain: string | null; a_url: string | null; a_source_count: number;
  b_id: string; b_headline: string; b_status: AdminStatus; b_first_published_at: string | null;
  b_source_name: string | null; b_source_domain: string | null; b_url: string | null; b_source_count: number;
}

export const fetchMergeSuggestions = (limit = 50, offset = 0) =>
  adminRpc<MergeSuggestion[]>("admin_list_merge_suggestions", { p_limit: limit, p_offset: offset });

export const fetchMergeSuggestionCount = () => adminRpc<number>("admin_merge_suggestion_count", {});

/** Moves `mergeId`'s articles onto `keepId` and archives `mergeId` (its URL redirects). */
export const mergeStories = (keepId: string, mergeId: string) =>
  adminRpc<{ kept: string; merged: string; articles_moved: number }>("admin_merge_stories", {
    p_keep_story_id: keepId,
    p_merge_story_id: mergeId,
  });

export const dismissSuggestion = (suggestionId: string) =>
  adminRpc<{ suggestion_id: string; status: string }>("admin_dismiss_suggestion", { p_suggestion_id: suggestionId });

/** Clears a story's AI summary; the backend writes a fresh one on its next sweep (about 5 minutes). */
export const resummarizeStory = (storyId: string) =>
  adminRpc<{ story_id: string; summaries_cleared: number }>("admin_resummarize", { p_story_id: storyId });
