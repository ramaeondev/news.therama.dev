import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, fetchAllStoryIds, setStoriesStatus, setStoryStatus } from "@/lib/adminApi";
import { signIn } from "@/lib/auth";

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
const ADMIN = `h.${b64({ role: "authenticated", app_metadata: { role: "ai_news_admin" } })}.s`;
const tokenResponse = () =>
  new Response(JSON.stringify({ access_token: ADMIN, refresh_token: "r1", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 }), { status: 200 });

const ok = () => new Response(JSON.stringify({ story_id: "x", publication_status: "published" }), { status: 200 });

/** Body of each `admin_set_story_status` call the stubbed fetch received. */
const sentBodies = (f: ReturnType<typeof vi.fn>) =>
  f.mock.calls
    .filter(([url]) => String(url).includes("admin_set_story_status"))
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(async () => {
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(tokenResponse()));
  await signIn("pw");
});
afterEach(() => vi.unstubAllGlobals());

describe("setStoriesStatus", () => {
  it("applies one status to every story and reports all as succeeded", async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", f);
    const result = await setStoriesStatus(["a", "b", "c"], "published");

    expect(result).toEqual({ succeeded: ["a", "b", "c"], failed: [] });
    const bodies = sentBodies(f);
    expect(bodies).toHaveLength(3);
    expect(bodies.map((b) => b.p_story_id).sort()).toEqual(["a", "b", "c"]);
    expect(bodies[0]).toEqual({ p_story_id: expect.any(String), p_status: "published", p_note: null });
    const [, init] = f.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${ADMIN}`, "Content-Profile": "ai_news" });
  });

  it("keeps going after a per-story failure and reports the failures", async () => {
    const f = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const { p_story_id } = JSON.parse(init.body as string);
      return Promise.resolve(p_story_id === "b" ? new Response("boom", { status: 500 }) : ok());
    });
    vi.stubGlobal("fetch", f);

    const result = await setStoriesStatus(["a", "b", "c"], "rejected");

    expect(result.succeeded.sort()).toEqual(["a", "c"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe("b");
    expect(result.failed[0].message).toContain("500");
  });

  it("passes an optional note to every call", async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", f);
    await setStoriesStatus(["a"], "archived", "off topic");
    expect(sentBodies(f)[0].p_note).toBe("off topic");
  });

  it("throws AuthRequiredError when the session is no longer valid", async () => {
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", f);
    await expect(setStoriesStatus(["a", "b"], "published")).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("does nothing for an empty selection", async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", f);
    expect(await setStoriesStatus([], "published")).toEqual({ succeeded: [], failed: [] });
    expect(f).not.toHaveBeenCalled();
  });

  it("leaves the single-story helper unchanged", async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(ok()));
    vi.stubGlobal("fetch", f);
    await setStoryStatus("a", "published");
    expect(sentBodies(f)).toEqual([{ p_story_id: "a", p_status: "published", p_note: null }]);
  });
});

describe("fetchAllStoryIds", () => {
  const row = (id: string) => ({ id });

  it("pages until a short page comes back", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([row("a"), row("b")]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([row("c")]), { status: 200 }));
    vi.stubGlobal("fetch", f);

    expect(await fetchAllStoryIds("pending_review", 500, 2)).toEqual(["a", "b", "c"]);
    expect(f).toHaveBeenCalledTimes(2);
    const bodies = f.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(bodies).toEqual([
      { p_status: "pending_review", p_limit: 2, p_offset: 0 },
      { p_status: "pending_review", p_limit: 2, p_offset: 2 },
    ]);
  });

  it("stops at the cap", async () => {
    const f = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const { p_limit } = JSON.parse(init.body as string);
      return Promise.resolve(new Response(JSON.stringify(Array.from({ length: p_limit }, (_, i) => row(`s${i}`))), { status: 200 }));
    });
    vi.stubGlobal("fetch", f);
    expect(await fetchAllStoryIds("published", 4, 2)).toHaveLength(4);
  });
});
