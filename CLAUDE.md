# olik.app — Bio Link Platform

Invite-only bio link platform. Owner: oli (oliverk5578@gmail.com).

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
- `/` — Landing page
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
- 3D tilt card on landing page hero
- File upload via multer → `/app/data/uploads/`
- Email via Resend from `verify@olik.app`
