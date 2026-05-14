const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const RESERVED = ['dashboard', 'login', 'signup', 'api', 'admin', 'settings'];

router.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-20 chars, lowercase alphanumeric + underscores' });
  if (RESERVED.includes(username.toLowerCase())) return res.status(400).json({ error: 'Username is reserved' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const result = stmt.run(username.toLowerCase(), email.toLowerCase(), hash);
    db.prepare('INSERT INTO profiles (user_id, display_name) VALUES (?, ?)').run(result.lastInsertRowid, username);
    db.prepare('INSERT INTO design (user_id) VALUES (?)').run(result.lastInsertRowid);
    const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: username.toLowerCase() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

module.exports = router;
