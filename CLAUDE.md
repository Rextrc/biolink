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
  (blur 24px, red glow shadow, gentle mouse tilt ±5°): red-ringed circular avatar (image URL or
  "o." monogram fallback), name + red period, spaced mono uppercase role, green status dot,
  one-line bio, wrapping mono skills row with red dots, circular social icon buttons. Behind it:
  pulsing red halo, rising ember particles, film grain. `© year olik.app` watermark at bottom.
  No sections/scroll — the card IS the page. NOT SaaS-styled.
- Package names are `olik-app` / `olik-client` / `olik-server` (renamed from biolink-era names;
  lockfiles kept in sync — if you rename a package, rerun `npm install --package-lock-only`
  there or Railway's `npm ci` fails).
- All card content editable live from `/god` → "Front Page" tab (single "Profile Card" panel):
  avatar_url, hero_name, hero_role, hero_badge (status line), hero_sub (bio line), skills,
  links {email, github, linkedin, twitter}
- `site_config` table in DB stores landing page JSON; GET `/api/site-config` (public, consumed
  by `Landing.jsx` on load), PUT `/api/admin/site-config` (admin). Shared defaults live in
  `client/src/utils/siteConfig.js` (`DEFAULT_SITE_CFG`) — imported by both Landing and Admin so
  they never drift.
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
