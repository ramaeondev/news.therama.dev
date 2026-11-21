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
