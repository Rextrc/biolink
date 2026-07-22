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
- `/` — Landing page (always public; the old `VITE_COMING_SOON` radar coming-soon gate was
  removed from `App.jsx`, so `pages/ComingSoon.jsx` is now unused. `Login.jsx` still checks the
  flag to block non-admin login.)
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
- Landing page (`client/src/pages/Landing.jsx`): minimal personal dev page — single-column
  hero (name + gradient role, static, no animation), short intro, contact/social buttons,
  "About" section (bio + skill chips), and a small "Say hello" contact block + footer. Calm
  dark/red aesthetic: two soft parallax orbs, subtle fade-up entrance, hover lift on buttons.
  Deliberately NOT SaaS-styled — no stats bar, no feature grid, no scramble/rotating effects.
- Landing page copy (hero badge/name/role/subtext, about bio, skills, social links [email,
  GitHub, LinkedIn, Twitter], contact line) editable live from `/god` → "Front Page" tab
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
