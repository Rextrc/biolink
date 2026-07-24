const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { normalizeSlug, slugError, blankConfig, createPage } = require('../landingPages');
const { validateKey, useKey } = require('../keys');
const { rateLimit } = require('../rateLimit');
const { notify } = require('../bot');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  notify(`✏️ <b>Page edited</b>\n\nolik.app/${esc(slug)}${cfg?.hero_name ? `\n${esc(cfg.hero_name)}` : ''}`);
}

/* ── Public ─────────────────────────────────────────────────────────── */

// Fetch a page's public content by slug (no view increment).
router.get('/:slug', (req, res) => {
  const row = db.prepare('SELECT slug, data, views FROM landing_pages WHERE slug = ?').get(String(req.params.slug).toLowerCase());
  if (!row) return res.status(404).json({ error: 'Not found' });
  let data = {};
  try { data = JSON.parse(row.data); } catch {}
  res.json({ slug: row.slug, data, views: row.views || 0 });
});

// Increment + return a page's view count.
router.post('/:slug/view', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const row = db.prepare('SELECT id FROM landing_pages WHERE slug = ?').get(slug);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE landing_pages SET views = views + 1 WHERE id = ?').run(row.id);
  const r = db.prepare('SELECT views FROM landing_pages WHERE id = ?').get(row.id);
  res.json({ count: r?.views || 0 });
});

// Verify an edit code and return the page for editing.
router.post('/edit/verify', codeLimiter, (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT slug, data FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
  let data = {};
  try { data = JSON.parse(row.data); } catch {}
  res.json({ slug: row.slug, data });
});

// Save a page's content, authorized by its edit code.
router.put('/edit/save', codeLimiter, (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  const data = (req.body && req.body.data) || {};
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT id, slug FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
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

  notify(`🎉 <b>Page claimed</b>\n\nolik.app/${esc(page.slug)}\n🔑 <code>${page.edit_code}</code>\nvia key <code>${esc(key)}</code>`);

  let data = {};
  try { data = JSON.parse(db.prepare('SELECT data FROM landing_pages WHERE id = ?').get(page.id).data); } catch {}
  res.json({ slug: page.slug, edit_code: page.edit_code, data });
});

/* ── Admin (everything below requires admin auth) ───────────────────── */
router.use(adminAuth);

// List every page with its edit code + views.
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, slug, edit_code, views, created_at FROM landing_pages ORDER BY created_at DESC').all();
  res.json(rows);
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
