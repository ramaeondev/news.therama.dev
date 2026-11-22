# news.therama.dev: AI News

A fast, read-only AI news site. It shows the latest stories from official AI company blogs and tech publications, and every story links to its original publisher.

- **Data:** the AI News API on the self-hosted Supabase at `https://api-v3.therama.dev`, schema `ai_news`. Articles are collected by Huginn. See the [api.therama.dev](https://github.com/ramaeondev/api.therama.dev) repo, plan 003.
- **Contract:** [`docs/api.yaml`](docs/api.yaml) (OpenAPI 3.1).
- **Product spec:** [`docs/BRIEF.md`](docs/BRIEF.md).

## Stack
Vite 7, React 19 and TypeScript, Tailwind 3 + shadcn/ui, TanStack Query 5, React Router 7, next-themes, date-fns, Vitest + Testing Library.

## Run
```sh
npm install
npm run dev        # http://localhost:8080
npm test           # unit + component tests
npm run lint
npm run build      # type-check + production build to dist/
npm run preview    # serve dist/ on http://localhost:4173
```

No configuration is needed: the app defaults to the public API and publishable key. To point it at another backend, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Structure
```
src/
  lib/api.ts          typed fetch client (feed with keyset paging, story, search RPC, by-source)
  lib/time.ts         reader-timezone day grouping and relative/absolute times
  hooks/useNews.ts    React Query hooks
  config/sources.ts   known publishers (the API has no "list sources" endpoint)
  config/features.ts  flags for features waiting on backend enrichment
  components/         Layout, StoryCard, states, search box, favicon, SEO
  pages/              Home, Story, Search, Sources, SourceFeed, About, NotFound
```

## Routes
| Route | Page |
|---|---|
| `/` | Latest stories grouped by day, with publisher thumbnails and topic chips; infinite scroll; "New stories" pill |
| `/news/:id` | Story with its publisher link(s) and "More from source" |
| `/search?q=&range=&from=&to=&company=&tool=&category=` | Full-text search with time and topic filters (shareable URLs; topic chips link here) |
| `/sources`, `/sources/:slug` | Publishers and their stories |
| `/about` | About and attribution, with social links from `static.social_links` |
| `/admin` | Editorial review (not linked; `noindex`). Password-only sign-in for the single admin; publish, reject or unpublish stories one by one or in bulk (tick rows, or select a whole tab, then confirm the batch); merge or dismiss possible duplicates |

## Notes
- **Public pages are read-only:** no login, no writes. Only the public views and the `search_published_stories` RPC are used.
- **Admin (`/admin`):** signs in through Supabase Auth with a fixed account email (`VITE_ADMIN_EMAIL`, default `admin@news.therama.dev`) and the password set by api.therama.dev's `scripts/create-ai-news-admin.sh`. It calls the `ai_news.admin_*` RPCs with the admin's token; the server checks the admin role on every call. The session lives in `sessionStorage`.
- **Feed order:** sorted by `first_published_at`, the publisher's publication time.
- **Time zone:** all dates show in IST (Asia/Kolkata) by default. The clock picker in the header switches to UTC, the reader's local time or any zone; the choice is kept in `localStorage` (`news-timezone`).
- **Images:** publisher-hosted (`image_url` from the API), loaded with `referrerpolicy=no-referrer`; hidden if they fail to load.
- **Merged stories:** an old `/news/:id` of a story the admin merged redirects through `v_story_redirects`.
- **Backend availability:** the backend runs on a home server and can be briefly offline. Pages then show a retry panel.
- **Feature flags** (`src/config/features.ts`): topic chips and filters are on; top stories and story-type badges stay off until the backend fills that data. AI summaries appear automatically once the `summary` field is populated.

## Deploy (Vercel)
Import the repo in Vercel (framework preset Vite, build `npm run build`, output `dist`) and add the domain `news.therama.dev`. `vercel.json` rewrites every path to `index.html` for client-side routing. No environment variables are required.
