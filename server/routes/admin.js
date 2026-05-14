const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

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
           p.display_name, p.avatar_url, p.bio, p.banner_url
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY position').all(req.params.id);
  res.json({ ...user, links });
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

// Stats overview
router.get('/stats', (req, res) => {
  const total_users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const total_links = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
  const new_today = db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").get().c;
  res.json({ total_users, total_links, new_today });
});

module.exports = router;
