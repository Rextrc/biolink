const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

// Slugs that would collide with real client routes / server paths.
const RESERVED = new Set([
  'login', 'signup', 'verify', 'forgot-password', 'reset-password',
  'dashboard', 'god', 'inbox', 'create', 'edit', 'api', 'uploads', 'u',
  'assets', 'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30})$/;

function genCode() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5 digits
}
function uniqueCode() {
  for (let i = 0; i < 60; i++) {
    const c = genCode();
    if (!db.prepare('SELECT 1 FROM landing_pages WHERE edit_code = ?').get(c)) return c;
  }
  return genCode(); // extremely unlikely fallback
}

// Starter config for a freshly-created page — same shape as site_config,
// but neutral so a new page isn't pre-filled with the owner's details.
function seedConfig(name, slug) {
  return {
    avatar_url: '', verified: false, timezone: 'America/New_York',
    hero_badge: 'available for work', hero_name: name || slug, hero_role: 'Developer',
    hero_sub: '', skills: [],
    links: { github: '', twitter: '', linkedin: '', instagram: '', photography: '',
             youtube: '', twitch: '', discord: '', website: '', email: '' },
  };
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

// Verify a 5-digit edit code and return the page for editing.
router.post('/edit/verify', (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT slug, data FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
  let data = {};
  try { data = JSON.parse(row.data); } catch {}
  res.json({ slug: row.slug, data });
});

// Save a page's content, authorized by its edit code.
router.put('/edit/save', (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const data = (req.body && req.body.data) || {};
  if (!code) return res.status(400).json({ error: 'Code required' });
  const row = db.prepare('SELECT id, slug FROM landing_pages WHERE edit_code = ?').get(code);
  if (!row) return res.status(401).json({ error: 'Invalid code' });
  db.prepare('UPDATE landing_pages SET data = ? WHERE id = ?').run(JSON.stringify(data), row.id);
  res.json({ ok: true, slug: row.slug });
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
  const slug = String((req.body && req.body.slug) || '').trim().toLowerCase();
  const name = String((req.body && req.body.name) || '').trim();
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Slug must be 1–31 chars: lowercase letters, numbers, hyphens; starting with a letter or number.' });
  }
  if (RESERVED.has(slug)) return res.status(400).json({ error: 'That slug is reserved.' });
  if (db.prepare('SELECT 1 FROM landing_pages WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'That slug is already taken.' });
  }
  const code = uniqueCode();
  db.prepare('INSERT INTO landing_pages (slug, edit_code, data) VALUES (?, ?, ?)')
    .run(slug, code, JSON.stringify(seedConfig(name, slug)));
  const row = db.prepare('SELECT id, slug, edit_code, views, created_at FROM landing_pages WHERE slug = ?').get(slug);
  res.json(row);
});

// Delete a page.
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
