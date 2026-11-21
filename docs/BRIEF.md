# news.therama.dev — Frontend Build Brief (for Lovable)

> **How to use this brief:** connect the Lovable project to GitHub and commit this file as `docs/BRIEF.md` and the API contract as `docs/api.yaml` (copy of `api.therama.dev/docs/ai-news-api.openapi.yaml`). Then send the phase prompts in §12 **one at a time**, checking each phase against its acceptance criteria before moving on.

---

## 1. Product summary

**news.therama.dev** is a fast, read-only AI news site. It shows the latest news about AI companies, models and tools, collected automatically from publisher feeds, and always links to the original publisher.

- **Audience:** developers and tech readers who want one clean feed of AI news.
- **Core promise:** current, trustworthy, attributed. Every item says where it came from and links to it.
- **v1 is read-only:** no accounts, comments, bookmarks or writes.

## 2. Hard rules (do not break)

1. **Do NOT use Lovable's built-in Supabase integration or "Connect Supabase".** The backend is a self-hosted Supabase. Use `@supabase/supabase-js` directly with the URL and key in §4.
2. **No authentication.** Use no login, no `supabase.auth` calls, and no protected routes.
3. **Read-only.** Never call `insert`, `update`, `delete` or `upsert`.
4. **Only query these public resources:**
   - `v_published_stories`
   - `v_story_sources`
   - `v_published_story_categories`
   - `v_published_story_companies`
   - `v_published_story_tools`
   - the RPC `search_published_stories`

   The base tables (`articles`, `stories`, `sources`, …) return **401** and must not be used.
5. **Use only the publishable key** (`sb_publishable_…`). Never ask for or use a service-role key.
6. **No images exist yet.** The design must look good text-only (see §8).
7. **Don't invent fields.** Use exactly the field names in §5 / `docs/api.yaml`.

## 3. Tech stack

- **App:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, lucide-react icons.
- **Data:** `@tanstack/react-query` for fetching and caching, `@supabase/supabase-js` v2 as the client.
- **Routing and pages:** `react-router-dom`, and `react-helmet-async` for page titles and meta tags.
- **Dates:** `date-fns` + `date-fns-tz`.
- **Theme:** dark mode via the `class` strategy, defaulting to the system setting, with a toggle in the header.

## 4. Backend connection

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://api-v3.therama.dev';
// Publishable key: public by design, safe in browser code.
export const SUPABASE_PUBLISHABLE_KEY = '<PASTE sb_publishable_… KEY HERE>';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'ai_news' },          // sends Accept-Profile / Content-Profile: ai_news
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
```

- CORS already allows Lovable preview domains and production domains.
- The backend runs on a home server and **can occasionally be offline**. Every page needs a friendly error state with a Retry button (see §9).

## 5. Data model (what the API returns)

### 5.1 Story (`v_published_stories`): the public news item

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Permanent id. Page URL is `/news/:id` |
| `headline` | string | Always present |
| `description` | string \| null | Plain text, ≤ ~400 chars today, occasionally null (hide when null) |
| `summary` | string \| null | AI summary. **Null today**, so render only when present |
| `story_type` | enum | `announcement, product_release, model_release, research, funding, business, policy, security, analysis, news, other`. Currently always `news` (don't show a badge for `news`) |
| `importance_score` | 0–100 \| null | Null today. Reserved for a future "Top stories" section |
| `first_published_at` | timestamptz | **Publisher's publication time. Sort and display by this.** Present on all published stories |
| `published_at` | timestamptz | When it went live on this site. Don't show to users |
| `last_updated_at` | timestamptz \| null | Publisher update time |
| `source_count` | integer | Number of publisher articles (1 today) |
| `slug`, `primary_media_id` | null | Not used yet. Ignore |
| `created_at`, `updated_at` | timestamptz | Internal. Don't show |

### 5.2 Story source (`v_story_sources`): the publisher link(s) behind a story

| Field | Type | Notes |
|---|---|---|
| `story_id` | uuid | Join key |
| `article_id` | uuid | |
| `title` | string | Original publisher headline |
| `original_url` | string | Link out: open in a new tab with `rel="noopener noreferrer"` |
| `author` | string \| null | Often null |
| `published_at` | timestamptz \| null | Publisher time |
| `source_name` | string | e.g. "OpenAI News" |
| `source_domain` | string | e.g. "openai.com", used for the favicon and source pages |
| `relationship_type` | enum | `primary_coverage` today |
| `is_primary` | boolean | Show primary first |

### 5.3 Taxonomy views: empty today

`v_published_story_categories` (`category_name`, `category_slug`), `v_published_story_companies` (`company_name`, `company_slug`) and `v_published_story_tools` (`tool_name`, `tool_slug`), each with `story_id`. Build the hooks, but keep all taxonomy UI behind `FEATURES.taxonomy = false` (§10).

### 5.4 TypeScript types (`src/types/news.ts`)

```ts
export type StoryType = 'announcement'|'product_release'|'model_release'|'research'|'funding'
  |'business'|'policy'|'security'|'analysis'|'news'|'other';

export interface Story {
  id: string; slug: string | null; headline: string; description: string | null;
  summary: string | null; story_type: StoryType; importance_score: number | null;
  first_published_at: string | null; last_updated_at: string | null; published_at: string;
  primary_media_id: string | null; created_at: string; updated_at: string; source_count: number;
}

export interface StorySource {
  story_id: string; article_id: string; title: string; original_url: string;
  author: string | null; published_at: string | null; source_id: string;
  source_name: string; source_domain: string;
  relationship_type: 'primary_coverage'|'independent_coverage'|'follow_up'|'correction'|'related';
  is_primary: boolean;
}

export interface StoryWithSources extends Story { sources: StorySource[] }
```

## 6. Data layer: exact queries

Put these in `src/lib/api.ts`, wrapped by React Query hooks in `src/hooks/`. Throw on `error` so React Query handles it.

```ts
const PAGE = 20;
const STORY_COLS = 'id,headline,description,summary,story_type,importance_score,first_published_at,last_updated_at,source_count';

// Feed: keyset pagination (stable while new stories arrive). Cursor = last item of previous page.
export async function fetchFeedPage(cursor?: { t: string; id: string }) {
  let q = supabase.from('v_published_stories').select(STORY_COLS)
    .not('first_published_at', 'is', null)
    .order('first_published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE);
  // Timestamps are double-quoted so values with "." or "+" parse correctly inside or().
  if (cursor) q = q.or(`first_published_at.lt."${cursor.t}",and(first_published_at.eq."${cursor.t}",id.lt.${cursor.id})`);
  const { data, error } = await q;
  if (error) throw error;
  return data as Story[];
}

// Sources for many stories in ONE request (call after each feed page).
export async function fetchSourcesFor(storyIds: string[]) {
  if (!storyIds.length) return [];
  const { data, error } = await supabase.from('v_story_sources').select('*')
    .in('story_id', storyIds)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return data as StorySource[];
}

// Single story (null => 404 page).
export async function fetchStory(id: string) {
  const { data, error } = await supabase.from('v_published_stories').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Story | null;
}

// Search (full-text, web-search syntax). Max 100 per call; paginate with offset.
export async function searchStories(p: { q?: string; from?: string; to?: string; limit?: number; offset?: number }) {
  const { data, error } = await supabase.rpc('search_published_stories', {
    p_query: p.q || null, p_from: p.from || null, p_to: p.to || null,
    p_company_slug: null, p_tool_slug: null, p_category_slug: null,
    p_limit: p.limit ?? PAGE, p_offset: p.offset ?? 0,
  });
  if (error) throw error;
  return data as Story[];
}

// Stories from one publisher (one source per story today): query sources first, then stories.
export async function fetchBySource(domain: string, offset = 0) {
  const { data: src, error } = await supabase.from('v_story_sources').select('*')
    .eq('source_domain', domain).order('published_at', { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (error) throw error;
  const ids = (src ?? []).map(s => s.story_id);
  if (!ids.length) return [] as StoryWithSources[];
  const { data: stories, error: e2 } = await supabase.from('v_published_stories').select(STORY_COLS).in('id', ids);
  if (e2) throw e2;
  const byId = new Map((stories as Story[]).map(s => [s.id, s]));
  return (src as StorySource[]).filter(s => byId.has(s.story_id))
    .map(s => ({ ...byId.get(s.story_id)!, sources: [s] }));
}
```

**Important search caveats:**
- Search results are ordered by `published_at` (time added to the site), not the publisher time.
- The `p_from`/`p_to` filters apply to `published_at`.
- After the results arrive, **re-sort them client-side by `first_published_at` desc** for display.
- Label the date filter in the UI as "Added between".

**React Query settings:**
- `staleTime: 60_000`, `gcTime: 10 * 60_000`, `retry: 2` with exponential backoff, `refetchOnWindowFocus: true`.
- Feed: `useInfiniteQuery`, where `getNextPageParam` returns `{ t, id }` from the last item, or `undefined` when the page has fewer than 20 items.
- Merge each page's sources (via `fetchSourcesFor`) into `StoryWithSources[]` inside the query function, so cards render complete.

## 7. Information architecture and pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Home feed | Latest stories, grouped by day, infinite scroll |
| `/news/:id` | Story | One story with its publisher link(s) |
| `/search?q=&from=&to=` | Search | Full-text search; query string is the source of truth (shareable URLs) |
| `/sources` | Sources | Grid of publishers (from the config in §7.1) |
| `/sources/:slug` | Source feed | Stories from one publisher |
| `/about` | About | What the site is, how stories are collected, attribution policy |
| `*` | 404 | Not found, with a link home |

### 7.1 Source config (`src/config/sources.ts`)

The public API has no "list sources" endpoint, so keep this list in the frontend:

```ts
export const SOURCES = [
  { slug: 'openai',      name: 'OpenAI News',           domain: 'openai.com',           kind: 'Official' },
  { slug: 'google-ai',   name: 'Google AI Blog',        domain: 'blog.google',          kind: 'Official' },
  { slug: 'hugging-face',name: 'Hugging Face Blog',     domain: 'huggingface.co',       kind: 'Official' },
  { slug: 'the-verge',   name: 'The Verge',             domain: 'theverge.com',         kind: 'Publisher' },
  { slug: 'techcrunch',  name: 'TechCrunch',            domain: 'techcrunch.com',       kind: 'Publisher' },
  { slug: 'ars-technica',name: 'Ars Technica',          domain: 'arstechnica.com',      kind: 'Publisher' },
  { slug: 'mit-tech-review', name: 'MIT Technology Review', domain: 'technologyreview.com', kind: 'Publisher' },
] as const;
```

Sources with no stories yet just show an empty state on their page.

### 7.2 Layout

- **Header (sticky):**
  - left: the wordmark "therama **AI News**";
  - centre (desktop): a search input; pressing Enter goes to `/search?q=…`;
  - right: links to Sources and About, plus the theme toggle;
  - mobile: a search icon opens a full-width search sheet.
- **Main:** a centred content column, `max-w-3xl` for the feed and story pages, plus an optional right rail on `lg+` (see Home).
- **Footer:** "News is collected from publisher feeds and links to the original articles. Headlines and descriptions belong to their publishers.", plus links to About and Sources.

### 7.3 Home feed (`/`)

- **Page heading:** "Latest AI news", with a subtle line underneath: "Updated continuously from N sources". N is `SOURCES.length`.
- **Day groups:** stories are grouped by the reader's local day of `first_published_at`, with sticky group labels: "Today", "Yesterday", then "Thu, 19 Nov".
- **Story card** (the whole card links to `/news/:id`):
  - top row: source favicon (16 px) + `source_name` · relative time ("3h ago"; the absolute time shows in a tooltip and the `<time dateTime>` attribute);
  - headline: `text-lg font-semibold`, at most 3 lines;
  - description: muted, 2 lines, clamped; hidden when null;
  - right side: an external-link icon button that opens the primary source's `original_url` in a new tab. It must stop the click from also opening the card.
  - When `source_count > 1`, show "+N more sources". This doesn't happen today but must be supported.
- **Infinite scroll:** an IntersectionObserver sentinel, with a "Load more" button fallback. At the end, show "You're all caught up."
- **New stories:** every 2 minutes, check whether there's a story newer than the first one shown. If there is, show a pill "New stories ↑" that refetches and scrolls to the top.
- **Right rail (lg+):** a "Sources" list (favicon + name, linking to the source page) and an "About" blurb.

### 7.4 Story page (`/news/:id`)

- **Breadcrumb:** "← Back to news". Use history back when the reader came from the site, otherwise link to `/`.
- **Top:** source chip(s) with favicon and name, then the publisher date ("20 Nov 2026, 9:58 PM IST") and a relative time.
- **Headline:** `h1`, `text-3xl md:text-4xl`, `leading-tight`.
- **Summary box:** only when `summary` is present. Label it "AI summary" and add a small disclaimer: "Generated summary. Read the original for full details."
- **Description:** as a lead paragraph.
- **Primary call to action:** a large button "Read the full story at {source_name}" with an external-link icon. It opens `original_url` in a new tab.
- **Sources section** (when there's more than one source; built now, shows later): a list of title, source and time, each opening in a new tab.
- **Share row:** a "Copy link" button (with a toast) and the native `navigator.share` when available.
- **Related:** "More from {source_name}", the 5 latest from the same domain (`fetchBySource`, excluding the current story).
- **Not found:** if `fetchStory` returns null, show "This story isn't available" with a link home.
- **Page title:** `"{headline} | therama AI News"`; the meta description is `description`.

### 7.5 Search (`/search`)

- A large input at the top, prefilled from `?q=`. Changes are debounced by 400 ms and update the URL with `replace`.
- **Filters:**
  - quick chips: "Any time", "Past 24 h", "Past week", "Past month" (these set `from`);
  - a date-range picker in a popover, labelled "Added between".
- **Results:**
  - the same story cards as the feed, without day grouping;
  - a summary line: "N results for 'q'". When there are 20 or more, write "20+" and show a "Load more" button that uses `offset`.
- **Empty query:** show a hint plus suggested searches as chips: "OpenAI", "Gemini", "Claude", "open source model", "funding".
- **No results:** "No stories match 'q'." with tips: try fewer words, or use quotes for exact phrases.
- Text matches in the headline and description get a subtle `<mark>` highlight, done client-side and case-insensitive.

### 7.6 Sources (`/sources`, `/sources/:slug`)

- **Grid:** one card per source with the favicon (32 px), name, domain and a kind badge (Official / Publisher). Each card links to its source page.
- **Source page:** a header with the large favicon, the name and a "Visit {domain}" link, then a paginated list of stories ("Load more", 20 at a time).
- **Unknown slug:** show the 404 page.

### 7.7 About (`/about`)

Static content:
- what the site is;
- how it works (stories are collected automatically from official AI company blogs and tech publications);
- that the site links to and credits original publishers, and doesn't republish full articles;
- that summaries, when shown, are AI-generated;
- a contact line.

## 8. Visual design

- **Feel:** calm, editorial and fast. Think a modern news reader, not a dashboard. Text-first, generous whitespace, strong typography.
- **Fonts:** Inter for the UI and body; `font-feature-settings: "ss01","cv11"` for headlines if available.
- **Colour:**
  - neutral greys (zinc), with one accent: indigo-600 in light mode, indigo-400 in dark mode;
  - links and focus rings use the accent;
  - story type badges, when they appear later, use soft tinted pills.
- **Cards:** no heavy shadows. Use a `border` with `hover:bg-muted/50` and a subtle translate on hover (`motion-safe` only).
- **No images yet:** use the publisher's favicon as the visual anchor. Favicon URL: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`. Fall back to a coloured monogram circle (the first letter of `source_name`) when it fails to load.
- **Density:** about 6–8 cards visible on a 1080p screen. Mobile is single column with 16 px gutters.
- **Dark mode:** a full theme, tested for contrast (WCAG AA).

## 9. States and resilience

- **Loading:** skeleton cards (5 on the feed, 1 large on the story page). Never show a blank screen.
- **Error** (network error or 5xx, e.g. the backend is offline): an inline panel saying "News is temporarily unavailable. We're having trouble reaching the server." with a Retry button that calls `refetch`. Keep showing cached data when there is some.
- **Empty feed:** "No stories yet. Check back soon."
- **Offline:** a small banner when `navigator.onLine === false`.
- Wrap the app in an error boundary with a friendly fallback.

## 10. Feature flags (`src/config/features.ts`)

```ts
export const FEATURES = {
  taxonomy: false,        // company/tool/category chips & filters (enable when enrichment ships)
  topStories: false,      // "Top stories" strip using importance_score
  storyTypeBadges: false, // badges for story_type !== 'news'
};
```

Build the taxonomy hooks and components now (chips under the headline, filter dropdowns on Search), but render them only when the flag is on.

## 11. Quality bar

- **Accessibility:**
  - semantic landmarks (`header`, `main`, `nav`, `footer`, `article` per card);
  - `<time dateTime>` for dates;
  - visible focus;
  - keyboard reachable (`/` focuses search, `Esc` closes the sheet);
  - links that open a new tab say so to screen readers: "(opens in new tab)".
- **Performance:**
  - route-level code splitting;
  - only the columns listed in `STORY_COLS` on lists;
  - one sources request per feed page;
  - Lighthouse ≥ 90 for performance and accessibility on mobile.
- **SEO:**
  - per-page `<title>` and meta description via Helmet;
  - Open Graph `og:title` and `og:description`;
  - a canonical URL `https://news.therama.dev/news/:id`;
  - `robots` allowed.
- **Times:**
  - display in the reader's timezone;
  - for SSR or unknown timezones, default to `Asia/Kolkata`;
  - always keep the ISO value in `dateTime`.
- **Security:** external links use `rel="noopener noreferrer"`. Render text as text (no `dangerouslySetInnerHTML`).

## 12. Build phases: send one prompt at a time

**Phase 1: foundation**
> Read `docs/BRIEF.md` and `docs/api.yaml`. Set up the stack from §3, the Supabase client from §4 (I'll paste the key), the types from §5.4, the data layer from §6 with React Query hooks, the source config from §7.1, the feature flags from §10, the layout (header, footer, theme toggle) from §7.2, routing for every route in §7 with placeholder pages, and the error, loading and empty components from §9. Don't use Lovable's Supabase integration and don't add auth.

*Accept when:* the app builds, all routes render, the theme toggle works, and the browser Network tab shows a successful `v_published_stories` request returning 200 with JSON.

**Phase 2: home feed**
> Build the Home feed exactly as in §7.3: keyset infinite scroll, day grouping, story cards with the favicon, source and relative time, the external-link button, the "New stories" pill, and the right rail.

*Accept when:*
- stories are newest first by `first_published_at`;
- scrolling loads the next 20 with no duplicates or gaps;
- each card shows its source;
- the external button opens the publisher in a new tab without navigating the app.

**Phase 3: story page**
> Build `/news/:id` as in §7.4, with the not-found state, share, and "More from source".

*Accept when:*
- clicking a card opens the page with the correct headline, source and date;
- "Read the full story" opens `original_url`;
- an invalid uuid shows the not-found state;
- the page title updates.

**Phase 4: search**
> Build `/search` as in §7.5, with the client-side re-sort and caveat from §6.

*Accept when:*
- searching "OpenAI" returns results;
- the URL reflects the query and filters, so reloading keeps them;
- the time chips narrow the results;
- there are proper empty and no-results states.

**Phase 5: sources and about**
> Build `/sources`, `/sources/:slug` and `/about` as in §7.6–7.7.

*Accept when:* every source card opens its page; OpenAI, TechCrunch, The Verge, Ars Technica and Google AI show stories; the others show an empty state.

**Phase 6: polish**
> Apply §8, §9 and §11: the visual pass, dark-mode contrast, skeletons, the error boundary, the offline banner, keyboard shortcuts, the Helmet meta tags and code splitting. Test at 375 px, 768 px and 1440 px.

*Accept when:* Lighthouse mobile scores ≥ 90 for performance and accessibility, there are no console errors, and simulating an offline API (block the request in DevTools) shows the retry panel.

## 13. Definition of done (v1)

- [ ] All routes in §7 work on mobile and desktop, in light and dark mode.
- [ ] The feed is sorted by publisher time, with stable infinite scroll.
- [ ] Every story shows its source and links to the original article.
- [ ] Search works with shareable URLs.
- [ ] Friendly states exist for loading, empty, errors, offline and not found.
- [ ] No writes, no auth, no service key; only the public views and RPC are used.
- [ ] The taxonomy, top-stories and story-type features are built but switched off by flag.
- [ ] Deployed (GitHub → Vercel) at `news.therama.dev`.

## 14. Coming later (design for it, don't build data for it)

- **AI summaries** (`summary`): the box is already designed.
- **Company/tool/category tags and filters:** switch on `FEATURES.taxonomy`.
- **Top stories:** by `importance_score`.
- **Story clustering:** several sources per story. Cards and the story page already support `source_count > 1`.
- **Images:** `primary_media_id` → Supabase Storage. Keep card layouts able to take an optional 16:9 thumbnail.
