# olik.app — Personal Dev Landing Page

`/` is Olik's personal developer profile card, plus admin-created copies at `olik.app/<slug>`.
Auth + the `/god` admin panel + invite keys still run underneath. Owner: oli
(oliverk5578@gmail.com).

**The radar/HUD is gone.** The J.A.R.V.I.S police-scanner dashboard (`pages/Hud.jsx`, `Hud.css`),
its FastAPI backend (`api/`: main.py, Procfile, requirements.txt), the `/dashboard` route, and
the `mapbox-gl` dependency were all deleted — it was unrelated to the landing page and confusing.
Don't reintroduce them. (`pages/Dashboard.jsx` + `components/dashboard/*` + `pages/Profile.jsx` +
`components/ProfileView.jsx` are leftover bio-link-era files that nothing imports — dead code,
kept only in case that platform is ever revived.)

## Deploy
Push to `master` → Railway auto-deploys. GitHub: `Rextrc/biolink`.

## Stack
- `client/` — React + Vite + Tailwind (served by Express in prod)
- `server/` — Express + sql.js SQLite
- DB lives at `/app/data/bio.db` (Railway volume)
- Uploads at `/app/data/uploads/`

## Key commands
```
git add . && git commit -m "..." && git push   # deploy
& "C:\Users\oli\AppData\Roaming\npm\railway.cmd" logs   # check logs
```

## Routes
- `/` — Landing page (always public; the old `VITE_COMING_SOON` radar coming-soon gate and
  `pages/ComingSoon.jsx` were removed entirely. `Login.jsx` still checks the flag to block
  non-admin login.)
- `/create` — Admin-only. Creates additional copies of the landing card at `olik.app/<slug>`,
  each with a 5-digit edit code. Lists/deletes existing ones. (`pages/Create.jsx`)
- `/edit` — Hidden (NO link anywhere on the site — reachable only by typing it). A page owner
  enters their 5-digit code to edit their own `olik.app/<slug>` card. (`pages/Edit.jsx`)
- `/<slug>` — Public per-user card (`pages/UserPage.jsx`), catch-all route (declared last).
  Unknown slugs fall back to rendering the owner's main `/` card.
- `/god` — Admin panel (admin only). Logging in (and signup/verify) redirects straight here;
  `AdminRoute` bounces non-admins to `/`.
- `/inbox` — Email inbox (admin only)
- `/verify` — Email verification
- `/forgot-password` + `/reset-password` — Password reset

## Admin
- Email `oliverk5578@gmail.com` auto-gets `is_admin=1` + `email_verified=1` on server start
- Invite keys required for all other signups
- Telegram bot in `server/bot.js` (same process as the server, started after `db.init()`):
  - `/newpage` — conversational wizard that creates an `olik.app/<slug>` card. 6 text steps
    (slug → name → role → status → bio → skills; the optional ones take `/skip`), then an inline
    keyboard to fill in any of the 10 social links + toggle the verified badge, then "Create page"
    replies with the URL and 5-digit edit code. `/cancel` aborts. Wizard state is an in-memory
    `Map` keyed by chatId, so it resets on redeploy — fine, it's a <1min flow.
  - `/pages` (list slugs + codes + views), `/genkey` (inline duration buttons), `/keys`, `/stats`
  - Gotcha: `bot.on('message')` fires for EVERY message, so both the `/genkey` custom-days handler
    and the wizard handler must guard on their own state. The wizard also ignores anything
    starting with `/` (except `/skip`) so other commands aren't swallowed as answers.
- Page-creation logic (slug rules, RESERVED list, unique 5-digit code, neutral `blankConfig`)
  lives in `server/landingPages.js` and is imported by BOTH `routes/pages.js` and `bot.js` — put
  new validation there, not in one caller, or the web and bot paths drift.

## Notable features
- GIF banners, video backgrounds, card glow, Spotify embed on profiles
- Verified badge (purple checkmark) on admin profiles
- Landing page (`client/src/pages/Landing.jsx`): e-z.bio-style profile card (per owner request,
  modeled on e-z.bio/8ball). Fullscreen `#050505` viewport, single centered glass card
  (blur 24px, red glow shadow, cursor-tracked tilt up to ±14° from anywhere on the page, moving
  glare sheen + directional shadow): red-ringed circular avatar (image URL or "o." monogram
  fallback), name + red period + optional verified badge, spaced mono uppercase role, green
  status dot, one-line bio, wrapping mono skills row with red dots, circular social icon
  buttons, optional "Now playing" Spotify row, small ember-burst micro-interaction when a social
  icon is clicked (10 particles radiating out via `bursts` state + `.burst-particle`/`burstFly`
  keyframe — hold full size/opacity while traveling ~80% of the distance, only shrink+fade in the
  final third, or the dots visually vanish before they've traveled far enough to read as a burst).
  Status line can also show a live clock (`timezone` in site config, IANA string, ticks every
  second via `Intl.DateTimeFormat`) next to the badge text. Behind the card: pulsing red halo,
  rising ember particles, film grain (rendered *behind* the card so backdrop-blur softens it —
  grain painted on top of the card reads as an "orange peel" texture on the glare, so don't move
  it back in front). `© year olik.app · N visits` watermark at bottom. No sections/scroll — the
  card IS the page. NOT SaaS-styled.
- Browser tab title rotates o -> l -> i -> k (0.5s each) while the tab is active/visible; pauses
  on a static "OLIK" via the `visibilitychange` event when the tab isn't focused, so switching
  away is what actually shows in the tab strip. Restores the static "Olik — Developer" title on
  unmount.
- Verified badge: blue Instagram-style checkmark next to the name (reuses the exact SVG from
  `ProfileView.jsx`'s admin badge). Toggle: `verified` in site config / "Show verified badge"
  checkbox in `/god`.
- View counter: `page_views` table (single row, `id=1`). `POST /api/view` increments + returns
  count, `GET /api/view` just reads. `Landing.jsx` calls POST once per tab session (guarded by
  `sessionStorage.olik_viewed`) so refreshes/nav don't inflate it, then displays it in the
  watermark.
- Spotify "Now playing": real-time, via Spotify Web API OAuth — NOT the old static embed (that's
  a separate unrelated feature, still on `/u/:username` profiles via `profile.spotify_url`).
  - `server/routes/spotify.js`, mounted at `/api/spotify`. Requires env vars `SPOTIFY_CLIENT_ID`,
    `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` (= `https://olik.app/api/spotify/callback`)
    — set these in Railway; nothing works without them. Spotify app + redirect URI are
    registered at developer.spotify.com/dashboard (owner-only, can't be automated).
  - One-time setup after env vars are set: `/god` → Front Page → Spotify panel → "Connect
    Spotify" → approve on Spotify. Stores a refresh_token in `spotify_auth` table (single row).
    Access tokens are cache in-memory (`~1hr TTL`), refreshed on demand.
  - `GET /api/spotify/now-playing` (public, polled by `Landing.jsx` every 20s) returns
    `{isPlaying:false}` whenever nothing's playing / not connected / not configured — the widget
    renders nothing in all of those cases, only appearing mid-song.
  - `GET /api/spotify/connect` (admin-only; JWT passed as `?token=` query param since it's a
    full-page redirect, not a fetch, so no Authorization header is possible) and
    `GET /api/spotify/status` (admin-only, header auth) are also in that file.
- Package names are `olik-app` / `olik-client` / `olik-server` (renamed from biolink-era names;
  lockfiles kept in sync — if you rename a package, rerun `npm install --package-lock-only`
  there or Railway's `npm ci` fails).
- All card content editable live from `/god` → "Front Page" tab: "Profile Card" panel
  (avatar_url, hero_name, hero_role, verified, timezone, hero_badge (status line), hero_sub
  (bio line), skills, links {email, github, twitter, linkedin, instagram, photography, youtube,
  twitch, discord, website}) and a separate "Spotify" panel (connect/status). Social link fields
  accept either a bare username or a full URL — `resolveSocialUrl()` in `Landing.jsx` prefixes
  bare values with the right domain so they don't resolve as relative `olik.app/...` paths.
  `photography` is a second, distinct Instagram account (camera icon instead of the Instagram
  glyph so it doesn't read as a duplicate) — both instagram links can be filled in and shown at
  once, they're independent fields, not a fallback for each other.
- `site_config` table in DB stores landing page JSON; GET `/api/site-config` (public, consumed
  by `Landing.jsx` on load), PUT `/api/admin/site-config` (admin). Shared defaults live in
  `client/src/utils/siteConfig.js` (`DEFAULT_SITE_CFG`) — imported by both Landing and Admin so
  they never drift.
- Multi-page ("create a page for someone"): the card itself lives in `components/ProfileCard.jsx`,
  a presentational component driven entirely by a `cfg` (same shape as `DEFAULT_SITE_CFG`). Both
  `Landing.jsx` (`/`, owner's page — also polls Spotify + rotates the o/l/i/k title) and
  `UserPage.jsx` (`/<slug>`) render it. Per-user pages are stored in the `landing_pages` table
  {slug, edit_code (5-digit), data (JSON), views}. Routes in `server/routes/pages.js` (mounted
  `/api/pages`): public `GET /:slug`, `POST /:slug/view` (per-slug counter), `POST /edit/verify`
  + `PUT /edit/save` (code-authorized, no login — the code alone identifies the page); admin-only
  (below `router.use(adminAuth)`) `GET /` (list), `POST /` (create, validates slug against a
  RESERVED set + `SLUG_RE`, generates a unique code, seeds neutral content — NOT the owner's), and
  `DELETE /:id`. `UserPage` renders `page.data` verbatim (never merged with the owner's
  `DEFAULT_SITE_CFG`, or an unset field would leak the owner's bio/skills/email). NOTE: 5-digit
  code-only auth is brute-forceable (~90k combos, no rate-limit yet) — fine for vanity cards, but
  don't reuse this pattern for anything sensitive.
- Admin.jsx gotcha: any input-rendering helper component (`SInput`, `Row`) MUST be defined at
  module scope, not inside the `Admin()` function body — defining them inline makes React treat
  them as a new component type on every re-render (every keystroke), which unmounts/remounts the
  `<input>` and kicks focus out. Same applies to any array-backed text field (like Skills): don't
  make the input's `value` a live `array.join(', ')` derived from parsed state, or typing a
  comma/trailing space gets immediately stripped on the next render — keep the raw text in its
  own state (see `skillsText`) decoupled from the parsed array.
- File upload via multer → `/app/data/uploads/`
- Email via Resend from `verify@olik.app`

## Workflow rule
After every site update: update this CLAUDE.md to reflect new features/routes/architecture.

---

## Session Protocol

**Load at session start** (~800 tokens):
- `.claude/COMMON_MISTAKES.md` — read first
- `.claude/QUICK_START.md` — command reference
- `.claude/ARCHITECTURE_MAP.md` — file locations

**At task completion:**
- Create `.claude/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.claude/sessions/archive/` if created

**Never auto-load:**
- `.claude/completions/` — load only when explicitly requested
- `.claude/sessions/` — load only when explicitly requested
- `docs/archive/` — load only when explicitly requested

**Task-specific docs**: see `docs/INDEX.md`
