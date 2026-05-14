const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendVerificationEmail, sendWelcomeEmail } = require('../email');

const RESERVED = ['dashboard', 'login', 'signup', 'api', 'admin', 'settings', 'god'];

function getIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-20 chars, lowercase alphanumeric + underscores' });
  if (RESERVED.includes(username.toLowerCase())) return res.status(400).json({ error: 'Username is reserved' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hash = bcrypt.hashSync(password, 10);
  const isAdmin = email.toLowerCase() === 'oliverk5578@gmail.com' ? 1 : 0;
  const ip = getIp(req);
  const code = makeCode();
  const expires = Date.now() + 15 * 60 * 1000;

  try {
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash, is_admin, signup_ip, last_ip, verify_code, verify_expires, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(username.toLowerCase(), email.toLowerCase(), hash, isAdmin, ip, ip, code, expires, isAdmin);
    db.prepare('INSERT INTO profiles (user_id, display_name) VALUES (?, ?)').run(result.lastInsertRowid, username);
    db.prepare('INSERT INTO design (user_id) VALUES (?)').run(result.lastInsertRowid);

    // Send verification email (skip for admin)
    if (!isAdmin) {
      await sendVerificationEmail(email, username, code).catch(() => {});
    }

    res.json({ needsVerification: !isAdmin, username: username.toLowerCase() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', (req, res) => {
  const { username, code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.status(400).json({ error: 'Already verified' });
  if (user.verify_code !== code) return res.status(400).json({ error: 'Invalid code' });
  if (Date.now() > user.verify_expires) return res.status(400).json({ error: 'Code expired — please sign up again' });

  db.prepare('UPDATE users SET email_verified=1, verify_code=NULL, verify_expires=NULL WHERE id=?').run(user.id);

  // Send welcome email
  sendWelcomeEmail(user.email, user.username).catch(() => {});

  const token = jwt.sign({ userId: user.id, isAdmin: !!user.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, isAdmin: !!user.is_admin });
});

router.post('/resend-code', async (req, res) => {
  const { username } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.toLowerCase());
  if (!user || user.email_verified) return res.status(400).json({ error: 'Invalid request' });
  const code = makeCode();
  const expires = Date.now() + 15 * 60 * 1000;
  db.prepare('UPDATE users SET verify_code=?, verify_expires=? WHERE id=?').run(code, expires, user.id);
  await sendVerificationEmail(user.email, user.username, code).catch(() => {});
  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email first', needsVerification: true, username: user.username });
  const ip = getIp(req);
  db.prepare('UPDATE users SET last_ip=? WHERE id=?').run(ip, user.id);
  const token = jwt.sign({ userId: user.id, isAdmin: !!user.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, isAdmin: !!user.is_admin });
});

module.exports = router;
