const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/:username', (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
  const design = db.prepare('SELECT * FROM design WHERE user_id = ?').get(user.id);
  const links = db.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY position ASC').all(user.id);
  res.json({ username: user.username, profile, design, links });
});

router.put('/', authMiddleware, (req, res) => {
  const { display_name, bio, avatar_url, banner_url } = req.body;
  db.prepare('UPDATE profiles SET display_name = ?, bio = ?, avatar_url = ?, banner_url = ? WHERE user_id = ?')
    .run(display_name, bio, avatar_url, banner_url ?? null, req.userId);
  res.json({ success: true });
});

module.exports = router;
