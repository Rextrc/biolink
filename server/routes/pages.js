const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { normalizeSlug, slugError, blankConfig, createPage } = require('../landingPages');
const { validateKey, useKey } = require('../keys');
const { rateLimit, clientIp } = require('../rateLimit');
const { notify, notifyPhoto } = require('../bot');
const { describeVisitor, lookupCountry, referrerHost } = require('../visitorInfo');
const { pageAnalytics } = require('../analytics');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SITE_URL = (process.env.PUBLIC_BASE_URL || 'https://olik.app').replace(/\/+$/, '');
// Telegram fetches this URL itself, so screenshots cost the server nothing.
// Override with SCREENSHOT_TEMPLATE ({url} is substituted) to swap providers.
const SHOT_TEMPLATE = process.env.SCREENSHOT_TEMPLATE
  || 'https://image.thum.io/get/width/900/crop/1200/noanimate/wait/4/{url}';
const shotUrl = (pageUrl) => SHOT_TEMPLATE.replace('{url}', pageUrl);

// Guessing an 8-char code is hopeless at 20 tries per 10 min; this is what
// makes code-only auth acceptable.
const codeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many attempts. Wait a few minutes and try again.' });
// Invite keys are long and random, but no reason to allow hammering either.
const claimLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, message: 'Too many attempts. Wait a few minutes and try again.' });

// Saving is an explicit button, but people double-tap — collapse bursts so a
// single editing session doesn't fire a stream of Telegram messages.
const lastEditPing = new Map(); // slug -> timestamp
function pingEdit(slug, cfg) {
  const now = Date.now();
  if (now - (lastEditPing.get(slug) || 0) < 60 * 1000) return;
  lastEditPing.set(slug, now);

  const pageUrl = `${SITE_URL}/${slug}`;
  const caption = `✏️ <b>Page edited</b>\n\n${esc(pageUrl)}${cfg?.hero_name ? `\n${esc(cfg.hero_name)}` : ''}`;
  // Give the save a moment to be readable by the screenshot service before
  // asking it to render the page, so the shot reflects the new content.
  setTimeout(() => notifyPhoto(shotUrl(pageUrl), caption), 1500);
}

/* ── Public ─────────────────────────────────────────────────────────── */

// Fetch a page's public content by slug (no view increment).
router.get('/:slug', (req, res) => {
  const row = db.prepare('SELECT slug, data, views, suspended FROM landing_pages WHERE slug = ?').get(String(req.params.slug).toLowerCase());
  if (!row) return res.status(404).json({ error: 'Not found' });
  // Suspended pages report themselves so the client can show the "unavailable"
  // card, without leaking any of the page's actual content.
  if (row.suspended) return res.status(403).json({ error: 'suspended', suspended: true, slug: row.slug });
  let data = {};
  try { data = JSON.parse(row.data); } catch {}
  res.json({ slug: row.slug, data, views: row.views || 0 });
});

// Increment + return a page's view count, and log the visit for analytics.
router.post('/:slug/view', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const row = db.prepare('SELECT id, suspended FROM landing_pages WHERE slug = ?').get(slug);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.suspended) return res.status(403).json({ error: 'suspended' });
  db.prepare('UPDATE landing_pages SET views = views + 1 WHERE id = ?').run(row.id);
  const r = db.prepare('SELECT views FROM landing_pages WHERE id = ?').get(row.id);

  // Referrer is free; country needs a lookup, so record the row immediately and
  // fill the country in afterwards. Never blocks or fails the response.
  const ref = referrerHost(req.headers.referer || req.headers.referrer, req.headers.host);
  let visitId = null;
  try {
    visitId = db.prepare('INSERT INTO page_visits (slug, referrer) VALUES (?, ?)').run(slug, ref).lastInsertRowid;
  } catch {}
  if (visitId) {
    lookupCountry(clientIp(req))
      .then(code => { if (code) db.prepare('UPDATE page_visits SET country = ? WHERE id = ?').run(code, visitId); })
      .catch(() => {});
  }

  res.json({ count: r?.views || 0 });
});

// Verify an edit code and return the page for editing.
router.post('/edit/verify', codeLimiter, (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT slug, data, suspended FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
  if (row.suspended) return res.status(403).json({ error: 'This page has been suspended. Contact the site owner.' });
  let data = {};
  try { data = JSON.parse(row.data); } catch {}
  res.json({ slug: row.slug, data });
});

// Save a page's content, authorized by its edit code.
router.put('/edit/save', codeLimiter, (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  const data = (req.body && req.body.data) || {};
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT id, slug, suspended FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
  if (row.suspended) return res.status(403).json({ error: 'This page has been suspended. Contact the site owner.' });
  db.prepare('UPDATE landing_pages SET data = ? WHERE id = ?').run(JSON.stringify(data), row.id);
  pingEdit(row.slug, data);
  res.json({ ok: true, slug: row.slug });
});

/* ── Self-serve claim: invite key -> your own page ───────────────────── */

// Step 1: is this invite key real and unused?
router.post('/claim/check', claimLimiter, (req, res) => {
  const key = String((req.body && req.body.invite_key) || '').trim().toUpperCase();
  if (!key) return res.status(400).json({ error: 'Invite key required' });
  const check = validateKey(key);
  if (!check.valid) return res.status(403).json({ error: check.reason });
  res.json({ ok: true });
});

// Step 2: burn the key and create the page. Returns the edit code so the
// claimer can be dropped straight into the editor.
router.post('/claim', claimLimiter, (req, res) => {
  const key = String((req.body && req.body.invite_key) || '').trim().toUpperCase();
  const slug = normalizeSlug((req.body && req.body.slug) || '');
  const name = String((req.body && req.body.name) || '').trim();

  if (!key) return res.status(400).json({ error: 'Invite key required' });
  const check = validateKey(key);
  if (!check.valid) return res.status(403).json({ error: check.reason });

  const err = slugError(slug);
  if (err) return res.status(err.includes('taken') ? 409 : 400).json({ error: err });

  let page;
  try {
    page = createPage(slug, blankConfig({ hero_name: name || slug }));
  } catch (e) {
    return res.status(e.slugError ? 400 : 500).json({ error: e.slugError ? e.message : 'Server error' });
  }

  // Only burn the key once the page definitely exists, so a failed create
  // can't eat someone's invite. Recorded as `page:<slug>` so /god and /keys
  // show what the key was spent on.
  useKey(key, `page:${slug}`);

  // Who claimed it — geo lookup is async and must never delay the response.
  describeVisitor(req, esc)
    .then(who => notify(
      `🎉 <b>Page claimed</b>\n\n${esc(SITE_URL)}/${esc(page.slug)}\n` +
      `🔑 <code>${page.edit_code}</code>\nvia key <code>${esc(key)}</code>\n\n${who}`
    ))
    .catch(() => notify(`🎉 <b>Page claimed</b>\n\n${esc(SITE_URL)}/${esc(page.slug)}\n🔑 <code>${page.edit_code}</code>`));

  let data = {};
  try { data = JSON.parse(db.prepare('SELECT data FROM landing_pages WHERE id = ?').get(page.id).data); } catch {}
  res.json({ slug: page.slug, edit_code: page.edit_code, data });
});

/* ── Admin (everything below requires admin auth) ───────────────────── */
router.use(adminAuth);

// List every page with its edit code + views.
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, slug, edit_code, views, suspended, created_at FROM landing_pages ORDER BY created_at DESC').all();
  res.json(rows);
});

// Traffic breakdown for one page.
router.get('/:slug/analytics', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  if (!db.prepare('SELECT 1 FROM landing_pages WHERE slug = ?').get(slug)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(pageAnalytics(slug, Number(req.query.days) || 30));
});

// Suspend / unsuspend — hides the page publicly and locks its editor.
router.put('/:id/suspended', (req, res) => {
  const on = (req.body && req.body.suspended) ? 1 : 0;
  const row = db.prepare('SELECT slug FROM landing_pages WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE landing_pages SET suspended = ? WHERE id = ?').run(on, req.params.id);
  notify(`${on ? '⛔ <b>Page suspended</b>' : '✅ <b>Page restored</b>'}\n\n${esc(SITE_URL)}/${esc(row.slug)}`);
  res.json({ ok: true, slug: row.slug, suspended: !!on });
});

// Create a new page.
router.post('/', (req, res) => {
  const slug = normalizeSlug((req.body && req.body.slug) || '');
  const name = String((req.body && req.body.name) || '').trim();
  const err = slugError(slug);
  if (err) return res.status(err.includes('taken') ? 409 : 400).json({ error: err });
  try {
    const page = createPage(slug, blankConfig({ hero_name: name || slug }));
    notify(`🆕 <b>Page created</b> (admin)\n\nolik.app/${esc(page.slug)}\n🔑 <code>${page.edit_code}</code>`);
    res.json(page);
  } catch (e) {
    res.status(e.slugError ? 400 : 500).json({ error: e.slugError ? e.message : 'Server error' });
  }
});

// Delete a page.
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
