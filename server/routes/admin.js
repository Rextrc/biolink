const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { generateKey } = require('../keys');

router.use(adminAuth);

// List all users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.is_admin, u.created_at, u.signup_ip, u.last_ip,
           p.display_name, p.avatar_url, p.bio,
           (SELECT COUNT(*) FROM links WHERE user_id = u.id) AS link_count
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

// Get single user detail
router.get('/users/:id', (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.is_admin, u.created_at, u.signup_ip, u.last_ip,
           u.key_expires_at, p.display_name, p.avatar_url, p.bio, p.banner_url
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY position').all(req.params.id);
  res.json({ ...user, links });
});

// Set user key expiry directly
router.put('/users/:id/expiry', (req, res) => {
  const { key_expires_at } = req.body;
  db.prepare('UPDATE users SET key_expires_at=? WHERE id=?').run(key_expires_at || null, req.params.id);
  res.json({ ok: true });
});

// Update any user's profile
router.put('/users/:id/profile', (req, res) => {
  const { display_name, bio, avatar_url, banner_url } = req.body;
  db.prepare('UPDATE profiles SET display_name=?, bio=?, avatar_url=?, banner_url=? WHERE user_id=?')
    .run(display_name, bio, avatar_url, banner_url, req.params.id);
  res.json({ ok: true });
});

// Reset any user's password
router.put('/users/:id/password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
  res.json({ ok: true });
});

// Toggle admin
router.put('/users/:id/admin', (req, res) => {
  const user = db.prepare('SELECT is_admin FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE users SET is_admin=? WHERE id=?').run(user.is_admin ? 0 : 1, req.params.id);
  res.json({ is_admin: !user.is_admin });
});

// Delete user and all their data
router.delete('/users/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM links WHERE user_id=?').run(id);
  db.prepare('DELETE FROM design WHERE user_id=?').run(id);
  db.prepare('DELETE FROM profiles WHERE user_id=?').run(id);
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.json({ ok: true });
});

// Keys
router.get('/keys', (req, res) => {
  res.json(db.prepare('SELECT * FROM invite_keys ORDER BY created_at DESC').all());
});
router.post('/keys', (req, res) => {
  const { note, duration_days } = req.body;
  const dur = duration_days != null && duration_days !== '' ? Number(duration_days) : null;
  const key = generateKey(note || '', dur);
  res.json({ key });
});
router.put('/keys/:id', (req, res) => {
  const { duration_days } = req.body;
  const dur = duration_days != null && duration_days !== '' ? Number(duration_days) : null;
  const row = db.prepare('SELECT * FROM invite_keys WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE invite_keys SET duration_days=? WHERE id=?').run(dur, req.params.id);
  if (row.used_by) {
    if (dur != null) {
      const expiresAt = new Date(new Date(row.used_at).getTime() + dur * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET key_expires_at=? WHERE username=?').run(expiresAt, row.used_by);
    } else {
      db.prepare('UPDATE users SET key_expires_at=NULL WHERE username=?').run(row.used_by);
    }
  }
  res.json({ ok: true });
});
router.delete('/keys/:id', (req, res) => {
  db.prepare('DELETE FROM invite_keys WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Site config (front page content)
router.get('/site-config', (req, res) => {
  const row = db.prepare('SELECT data FROM site_config WHERE id=1').get();
  res.json(row ? JSON.parse(row.data) : {});
});
router.put('/site-config', (req, res) => {
  const data = JSON.stringify(req.body);
  db.prepare('UPDATE site_config SET data=? WHERE id=1').run(data);
  res.json({ ok: true });
});

// Waitlist
router.get('/waitlist', (req, res) => {
  res.json(db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all());
});
router.delete('/waitlist/all', (req, res) => {
  db.prepare('DELETE FROM waitlist').run();
  res.json({ ok: true });
});
router.delete('/waitlist/:id', (req, res) => {
  db.prepare('DELETE FROM waitlist WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Stats overview
router.get('/stats', (req, res) => {
  const total_users    = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const total_links    = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
  const new_today      = db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").get().c;
  const waitlist_count = db.prepare('SELECT COUNT(*) as c FROM waitlist').get().c;
  const waitlist_today = db.prepare("SELECT COUNT(*) as c FROM waitlist WHERE date(created_at) = date('now')").get().c;
  res.json({ total_users, total_links, new_today, waitlist_count, waitlist_today });
});

module.exports = router;
