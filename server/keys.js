const crypto = require('crypto');
const db = require('./db');

function generateKey(note = '', duration_days = null) {
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
  const key = `OLIK-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
  db.prepare('INSERT INTO invite_keys (key, note, duration_days) VALUES (?, ?, ?)').run(key, note, duration_days);
  return key;
}

function validateKey(key) {
  const row = db.prepare('SELECT * FROM invite_keys WHERE key = ?').get(key);
  if (!row) return { valid: false, reason: 'Invalid key' };
  if (row.used_by) return { valid: false, reason: 'Key already used' };
  return { valid: true, row };
}

function useKey(key, username) {
  const row = db.prepare('SELECT duration_days FROM invite_keys WHERE key = ?').get(key);
  db.prepare('UPDATE invite_keys SET used_by=?, used_at=CURRENT_TIMESTAMP WHERE key=?').run(username, key);
  if (row?.duration_days != null) {
    const expiresAt = new Date(Date.now() + row.duration_days * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET key_expires_at=? WHERE username=?').run(expiresAt, username);
  }
}

module.exports = { generateKey, validateKey, useKey };
