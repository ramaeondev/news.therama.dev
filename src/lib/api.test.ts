import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, attachSources, buildUrl, fetchFeedPage, fetchStory, keysetFilter, searchStories } from "@/lib/api";
import type { Story, StorySource } from "@/types/news";

const story = (id: string, t: string | null): Story => ({
  id, headline: `H ${id}`, description: null, summary: null, story_type: "news", importance_score: null,
  first_published_at: t, last_updated_at: t, source_count: 1,
});
const source = (story_id: string, is_primary = true): StorySource => ({
  story_id, article_id: `a-${story_id}-${is_primary}`, title: "t", original_url: "https://x.test/a", author: null,
  published_at: null, source_id: "s", source_name: "OpenAI News", source_domain: "openai.com",
  relationship_type: "primary_coverage", is_primary,
});

function mockFetch(...bodies: unknown[]) {
  const fn = vi.fn();
  bodies.forEach((b) => fn.mockResolvedValueOnce(new Response(JSON.stringify(b), { status: 200 })));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("buildUrl / keysetFilter", () => {
  it("encodes params and drops empty ones", () => {
    const url = buildUrl("v_published_stories", { select: "id,headline", limit: 20, or: undefined, x: "" });
    expect(url).toBe("https://api-v3.therama.dev/rest/v1/v_published_stories?select=id%2Cheadline&limit=20");
  });
  it("builds a quoted keyset filter", () => {
    expect(keysetFilter({ t: "2026-11-20T21:58:29+00:00", id: "abc" })).toBe(
      '(first_published_at.lt."2026-11-20T21:58:29+00:00",and(first_published_at.eq."2026-11-20T21:58:29+00:00",id.lt.abc))',
    );
  });
});

describe("fetchFeedPage", () => {
  it("requests the ai_news profile, orders by publisher time and joins sources in one call", async () => {
    const f = mockFetch([story("1", "2026-11-20T10:00:00Z"), story("2", "2026-11-20T09:00:00Z")], [source("2"), source("1")]);
    const page = await fetchFeedPage({ t: "2026-11-21T00:00:00Z", id: "z" });
    expect(f).toHaveBeenCalledTimes(2);
    const [url, init] = f.mock.calls[0];
    expect(decodeURIComponent(url)).toContain("order=first_published_at.desc,id.desc");
    expect(decodeURIComponent(url)).toContain('or=(first_published_at.lt."2026-11-21T00:00:00Z"');
    expect(init.headers["Accept-Profile"]).toBe("ai_news");
    expect(init.headers.apikey).toMatch(/^sb_publishable_/);
    expect(decodeURIComponent(f.mock.calls[1][0])).toContain("story_id=in.(1,2)");
    expect(page.map((s) => [s.id, s.sources.length])).toEqual([["1", 1], ["2", 1]]);
  });
});

describe("fetchStory", () => {
  it("returns null for non-uuid ids without calling the API", async () => {
    const f = mockFetch();
    expect(await fetchStory("not-a-uuid")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("returns null when the story is not public", async () => {
    mockFetch([]);
    expect(await fetchStory("11111111-1111-1111-1111-111111111111")).toBeNull();
  });
});

describe("searchStories", () => {
  it("posts to the RPC with Content-Profile and re-sorts by publisher time", async () => {
    const f = mockFetch([story("old", "2026-11-01T00:00:00Z"), story("new", "2026-11-20T00:00:00Z")], []);
    const res = await searchStories({ q: " openai ", limit: 20, offset: 0 });
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/rpc/search_published_stories");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Profile"]).toBe("ai_news");
    expect(JSON.parse(init.body)).toMatchObject({ p_query: "openai", p_limit: 20, p_offset: 0, p_from: null });
    expect(res.map((s) => s.id)).toEqual(["new", "old"]);
  });
});

describe("errors", () => {
  it("wraps HTTP errors in ApiError with status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(fetchFeedPage()).rejects.toMatchObject({ name: "ApiError", status: 503 });
  });
  it("maps network failures to ApiError(0)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const err = await fetchFeedPage().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });
});

describe("attachSources", () => {
  it("puts the primary source first", () => {
    const [s] = attachSources([story("1", null)], [source("1", false), source("1", true)]);
    expect(s.sources.map((x) => x.is_primary)).toEqual([true, false]);
  });
});

describe("fetchSocialLinks", () => {
  it("reads active links from the static profile in order and drops non-http urls", async () => {
    const { fetchSocialLinks } = await import("@/lib/api");
    const f = mockFetch([
      { id: "1", platform: "github", url: "https://github.com/ramaeon", display_name: "GitHub", sort_order: 1 },
      { id: "2", platform: "bad", url: "javascript:alert(1)", display_name: "Bad", sort_order: 2 },
    ]);
    const links = await fetchSocialLinks();
    const [url, init] = f.mock.calls[0];
    expect(init.headers["Accept-Profile"]).toBe("static");
    expect(decodeURIComponent(url)).toContain("is_active=eq.true");
    expect(decodeURIComponent(url)).toContain("order=sort_order.asc");
    expect(links.map((l) => l.display_name)).toEqual(["GitHub"]);
  });
});
