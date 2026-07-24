const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { normalizeSlug, slugError, blankConfig, createPage } = require('../landingPages');

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
  const slug = normalizeSlug((req.body && req.body.slug) || '');
  const name = String((req.body && req.body.name) || '').trim();
  const err = slugError(slug);
  if (err) return res.status(err.includes('taken') ? 409 : 400).json({ error: err });
  try {
    res.json(createPage(slug, blankConfig({ hero_name: name || slug })));
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
