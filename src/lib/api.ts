// Read-only client for the AI News API (schema "ai_news" on the self-hosted Supabase at
// https://api-v3.therama.dev). Contract: docs/api.yaml. No login; the publishable key is public.
import type { FeedCursor, Story, StorySource, StoryWithSources } from "@/types/news";

export const API_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://api-v3.therama.dev").replace(/\/$/, "");
export const API_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || "sb_publishable_TvfycUXoZ1whU1e-L8qhH-_PwN2YmxB";

export const PAGE_SIZE = 20;
export const STORY_COLUMNS =
  "id,headline,description,summary,story_type,importance_score,first_published_at,last_updated_at,source_count";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Params = Record<string, string | number | undefined>;

export function buildUrl(path: string, params: Params = {}): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_URL}/rest/v1/${path}${qs ? `?${qs}` : ""}`;
}

async function request<T>(url: string, init: RequestInit = {}, signal?: AbortSignal, profile = "ai_news"): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      ...init,
      signal,
      headers: { apikey: API_KEY, "Accept-Profile": profile, ...(init.headers || {}) },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Network error: the news server could not be reached.");
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ApiError(resp.status, `API ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

export const get = <T>(path: string, params?: Params, signal?: AbortSignal) =>
  request<T>(buildUrl(path, params), {}, signal);

export const rpc = <T>(fn: string, body: unknown, signal?: AbortSignal) =>
  request<T>(
    buildUrl(`rpc/${fn}`),
    { method: "POST", headers: { "Content-Profile": "ai_news", "Content-Type": "application/json" }, body: JSON.stringify(body) },
    signal,
  );

/** PostgREST keyset filter: rows strictly after the cursor in (first_published_at desc, id desc) order. */
export function keysetFilter(c: FeedCursor): string {
  return `(first_published_at.lt."${c.t}",and(first_published_at.eq."${c.t}",id.lt.${c.id}))`;
}

const inList = (ids: string[]) => `in.(${ids.join(",")})`;

export function attachSources(stories: Story[], sources: StorySource[]): StoryWithSources[] {
  const byStory = new Map<string, StorySource[]>();
  for (const s of sources) {
    const list = byStory.get(s.story_id) ?? [];
    list.push(s);
    byStory.set(s.story_id, list);
  }
  return stories.map((story) => ({
    ...story,
    sources: (byStory.get(story.id) ?? []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
  }));
}

export async function fetchSourcesFor(storyIds: string[], signal?: AbortSignal): Promise<StorySource[]> {
  if (!storyIds.length) return [];
  return get<StorySource[]>("v_story_sources", { story_id: inList(storyIds), order: "is_primary.desc" }, signal);
}

async function withSources(stories: Story[], signal?: AbortSignal) {
  return attachSources(stories, await fetchSourcesFor(stories.map((s) => s.id), signal));
}

/** One page of the home feed, newest publisher time first. */
export async function fetchFeedPage(cursor?: FeedCursor, signal?: AbortSignal): Promise<StoryWithSources[]> {
  const stories = await get<Story[]>(
    "v_published_stories",
    {
      select: STORY_COLUMNS,
      first_published_at: "not.is.null",
      order: "first_published_at.desc,id.desc",
      limit: PAGE_SIZE,
      or: cursor ? keysetFilter(cursor) : undefined,
    },
    signal,
  );
  return withSources(stories, signal);
}

/** Newest story id/time, used to detect new stories without refetching the whole feed. */
export async function fetchLatestMarker(signal?: AbortSignal): Promise<Pick<Story, "id" | "first_published_at"> | null> {
  const rows = await get<Pick<Story, "id" | "first_published_at">[]>(
    "v_published_stories",
    { select: "id,first_published_at", first_published_at: "not.is.null", order: "first_published_at.desc,id.desc", limit: 1 },
    signal,
  );
  return rows[0] ?? null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

/** A single published story with its sources, or null when it does not exist / is not public. */
export async function fetchStory(id: string, signal?: AbortSignal): Promise<StoryWithSources | null> {
  if (!isUuid(id)) return null;
  const rows = await get<Story[]>("v_published_stories", { select: STORY_COLUMNS, id: `eq.${id}`, limit: 1 }, signal);
  if (!rows.length) return null;
  return (await withSources(rows, signal))[0];
}

export interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

const byPublisherTimeDesc = (a: Story, b: Story) =>
  (b.first_published_at ?? "").localeCompare(a.first_published_at ?? "") || b.id.localeCompare(a.id);

/** Full-text search. The RPC orders by site time; results are re-sorted by publisher time. */
export async function searchStories(p: SearchParams, signal?: AbortSignal): Promise<StoryWithSources[]> {
  const stories = await rpc<Story[]>(
    "search_published_stories",
    {
      p_query: p.q?.trim() || null,
      p_from: p.from || null,
      p_to: p.to || null,
      p_company_slug: null,
      p_tool_slug: null,
      p_category_slug: null,
      p_limit: p.limit ?? PAGE_SIZE,
      p_offset: p.offset ?? 0,
    },
    signal,
  );
  return withSources([...stories].sort(byPublisherTimeDesc), signal);
}

/** Stories from one publisher domain (one source per story today), newest first. */
export async function fetchBySource(domain: string, offset = 0, limit = PAGE_SIZE, signal?: AbortSignal): Promise<StoryWithSources[]> {
  const sources = await get<StorySource[]>(
    "v_story_sources",
    { source_domain: `eq.${domain}`, order: "published_at.desc.nullslast,story_id.desc", limit, offset },
    signal,
  );
  if (!sources.length) return [];
  const ids = [...new Set(sources.map((s) => s.story_id))];
  const stories = await get<Story[]>("v_published_stories", { select: STORY_COLUMNS, id: inList(ids) }, signal);
  const byId = new Map(stories.map((s) => [s.id, s]));
  const allSources = await fetchSourcesFor(ids, signal);
  return attachSources(
    ids.map((id) => byId.get(id)).filter((s): s is Story => Boolean(s)),
    allSources,
  );
}

/** Row of static.social_links (shared reference data, also used by portfolio.therama.dev). */
export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  display_name: string;
  sort_order: number;
}

/** Active social links from the shared "static" schema, in display order. */
export async function fetchSocialLinks(signal?: AbortSignal): Promise<SocialLink[]> {
  const rows = await request<SocialLink[]>(
    buildUrl("social_links", { select: "id,platform,url,display_name,sort_order", is_active: "eq.true", order: "sort_order.asc" }),
    {},
    signal,
    "static",
  );
  return rows.filter((r) => /^https?:\/\//i.test(r.url));
}
