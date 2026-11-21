import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_EMAIL, claims, getAccessToken, isAdminToken, loadSession, signIn, signOut } from "@/lib/auth";
import { AuthRequiredError, fetchStatusCounts, setStoryStatus } from "@/lib/adminApi";

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
const jwt = (payload: object) => `h.${b64(payload)}.s`;
const ADMIN = jwt({ role: "authenticated", app_metadata: { role: "ai_news_admin" } });
const USER = jwt({ role: "authenticated", app_metadata: {} });
const tokenResponse = (access: string, expiresIn = 3600) =>
  new Response(JSON.stringify({ access_token: access, refresh_token: "r1", expires_in: expiresIn, expires_at: Math.floor(Date.now() / 1000) + expiresIn }), { status: 200 });

beforeEach(() => sessionStorage.clear());
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  await signOut();
  vi.unstubAllGlobals();
});

describe("auth", () => {
  it("decodes claims and detects the admin role", () => {
    expect(claims(ADMIN).role).toBe("authenticated");
    expect(isAdminToken(ADMIN)).toBe(true);
    expect(isAdminToken(USER)).toBe(false);
    expect(isAdminToken("garbage")).toBe(false);
  });

  it("signs in with the fixed admin email and only a password", async () => {
    const f = vi.fn().mockResolvedValue(tokenResponse(ADMIN));
    vi.stubGlobal("fetch", f);
    await signIn("s3cret");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/auth/v1/token?grant_type=password");
    expect(JSON.parse(init.body)).toEqual({ email: ADMIN_EMAIL, password: "s3cret" });
    expect(loadSession()?.access_token).toBe(ADMIN);
    expect(sessionStorage.getItem("ai-news-admin-session")).toContain("access_token");
  });

  it("rejects a wrong password and non-admin accounts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })));
    await expect(signIn("nope")).rejects.toThrow("Incorrect password.");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(tokenResponse(USER)));
    await expect(signIn("x")).rejects.toThrow(/not an AI News admin/);
    expect(loadSession()).toBeNull();
  });

  it("refreshes an expiring token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(tokenResponse(ADMIN, 30)));
    await signIn("pw");
    const fresh = jwt({ app_metadata: { role: "ai_news_admin" }, n: 2 });
    const f = vi.fn().mockResolvedValue(tokenResponse(fresh));
    vi.stubGlobal("fetch", f);
    expect(await getAccessToken()).toBe(fresh);
    expect(f.mock.calls[0][0]).toContain("grant_type=refresh_token");
  });
});

describe("admin api", () => {
  it("sends the bearer token and ai_news profile, and maps counts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(tokenResponse(ADMIN)));
    await signIn("pw");
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ publication_status: "pending_review", story_count: 2 }])));
    vi.stubGlobal("fetch", f);
    expect(await fetchStatusCounts()).toEqual({ pending_review: 2, published: 0, rejected: 0, archived: 0 });
    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/rpc/admin_status_counts");
    expect(init.headers.Authorization).toBe(`Bearer ${ADMIN}`);
    expect(init.headers["Content-Profile"]).toBe("ai_news");
  });

  it("signs out on 401/403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(tokenResponse(ADMIN)));
    await signIn("pw");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(setStoryStatus("id", "published")).rejects.toBeInstanceOf(AuthRequiredError);
    expect(loadSession()).toBeNull();
  });

  it("requires a session", async () => {
    await expect(fetchStatusCounts()).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
