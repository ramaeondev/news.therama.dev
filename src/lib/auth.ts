// Minimal Supabase Auth client for the single AI News admin (password grant).
// The admin types only a password; the account email is fixed here.
// Session lives in sessionStorage: it ends when the tab is closed.
import { API_URL, API_KEY, ApiError } from "@/lib/api";

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || "admin@news.therama.dev";
const STORAGE_KEY = "ai-news-admin-session";

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
}

function save(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode): session lasts for this page only */
  }
}

let memory: Session | null = null;

export function loadSession(): Session | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    memory = null;
  }
  return memory;
}

function setSession(s: Session | null) {
  memory = s;
  save(s);
}

async function tokenRequest(grant: "password" | "refresh_token", body: Record<string, string>): Promise<Session> {
  let resp: Response;
  try {
    resp = await fetch(`${API_URL}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Network error: the server could not be reached.");
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new ApiError(resp.status, resp.status === 400 ? "Incorrect password." : (data.msg || data.error_description || `Sign-in failed (${resp.status})`));
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };
}

/** Decodes the JWT payload (no verification; the server enforces access). */
export function claims(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch {
    return {};
  }
}

export const isAdminToken = (token: string) =>
  (claims(token).app_metadata as { role?: string } | undefined)?.role === "ai_news_admin";

export async function signIn(password: string): Promise<Session> {
  const s = await tokenRequest("password", { email: ADMIN_EMAIL, password });
  if (!isAdminToken(s.access_token)) {
    throw new ApiError(403, "This account is not an AI News admin.");
  }
  setSession(s);
  return s;
}

/** A valid access token, refreshing it when it's about to expire. Null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  try {
    const fresh = await tokenRequest("refresh_token", { refresh_token: s.refresh_token });
    setSession(fresh);
    return fresh.access_token;
  } catch {
    setSession(null);
    return null;
  }
}

export async function signOut(): Promise<void> {
  const s = loadSession();
  setSession(null);
  if (s) {
    await fetch(`${API_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: API_KEY, Authorization: `Bearer ${s.access_token}` },
    }).catch(() => {});
  }
}

export function clearSession() {
  setSession(null);
}
