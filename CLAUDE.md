# olik.app — Personal Dev Landing Page + Bio Link Platform

`/` is Olik's personal developer landing page (hero, skills, about me, contact). The invite-only
bio link/dashboard platform (auth, `/dashboard`, `/god`, invite keys) still runs underneath —
only the public landing page content changed. Owner: oli (oliverk5578@gmail.com).

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
- `/dashboard` — User dashboard (mobile bottom nav on iPhone)
- `/god` — Admin panel (admin only)
- `/inbox` — Email inbox (admin only)
- `/verify` — Email verification
- `/forgot-password` + `/reset-password` — Password reset

## Admin
- Email `oliverk5578@gmail.com` auto-gets `is_admin=1` + `email_verified=1` on server start
- Invite keys required for all other signups
- Telegram bot in `server/bot.js` — `/genkey` with inline duration buttons

## Notable features
- GIF banners, video backgrounds, card glow, Spotify embed on profiles
- Verified badge (purple checkmark) on admin profiles
- Landing page (`client/src/pages/Landing.jsx`): e-z.bio-style profile card (per owner request,
  modeled on e-z.bio/8ball). Fullscreen `#050505` viewport, single centered glass card
  (blur 24px, red glow shadow, cursor-tracked tilt up to ±14° from anywhere on the page, moving
  glare sheen + directional shadow): red-ringed circular avatar (image URL or "o." monogram
  fallback), name + red period + optional verified badge, spaced mono uppercase role, green
  status dot, one-line bio, wrapping mono skills row with red dots, circular social icon
  buttons, optional "Now playing" Spotify row. Behind the card: pulsing red halo, rising ember
  particles, film grain (rendered *behind* the card so backdrop-blur softens it — grain painted
  on top of the card reads as an "orange peel" texture on the glare, so don't move it back
  in front). `© year olik.app · N visits` watermark at bottom. No sections/scroll — the card IS
  the page. NOT SaaS-styled.
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
  (avatar_url, hero_name, hero_role, verified, hero_badge (status line), hero_sub (bio line),
  skills, links {email, github, twitter, linkedin, instagram, youtube, twitch, discord,
  website}) and a separate "Spotify" panel (connect/status). Social link fields accept either a
  bare username or a full URL — `resolveSocialUrl()` in `Landing.jsx` prefixes bare values with
  the right domain so they don't resolve as relative `olik.app/...` paths.
- `site_config` table in DB stores landing page JSON; GET `/api/site-config` (public, consumed
  by `Landing.jsx` on load), PUT `/api/admin/site-config` (admin). Shared defaults live in
  `client/src/utils/siteConfig.js` (`DEFAULT_SITE_CFG`) — imported by both Landing and Admin so
  they never drift.
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
