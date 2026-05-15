const crypto = require('crypto');
const db = require('./db');

function generateKey(note = '') {
  const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
  const key = `OLIK-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
  db.prepare('INSERT INTO invite_keys (key, note) VALUES (?, ?)').run(key, note);
  return key;
}

function validateKey(key) {
  const row = db.prepare('SELECT * FROM invite_keys WHERE key = ?').get(key);
  if (!row) return { valid: false, reason: 'Invalid key' };
  if (row.used_by) return { valid: false, reason: 'Key already used' };
  return { valid: true, row };
}

function useKey(key, username) {
  db.prepare('UPDATE invite_keys SET used_by=?, used_at=CURRENT_TIMESTAMP WHERE key=?').run(username, key);
}

module.exports = { generateKey, validateKey, useKey };
