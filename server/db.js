/**
 * db.js — sql.js wrapper that mirrors the better-sqlite3 synchronous API.
 *
 * Routes use the same .prepare().run() / .get() / .all() interface they
 * would use with better-sqlite3.  The wrapper handles persistence: after
 * every write it serialises the in-memory database to disk.
 *
 * Usage in index.js:
 *   await require('./db').init();   // must be called before any request
 *   const db = require('./db');     // then use synchronously everywhere
 */
const path   = require('path');
const fs     = require('fs');

const DB_PATH = path.join(__dirname, 'bio.db');

let _sql  = null;   // raw sql.js Database instance
let _inTx = false;  // suppresses per-statement save() inside transactions

/* ── persistence ─────────────────────────────────────────────── */
function save() {
  if (!_sql) return;
  const data = _sql.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/* ── argument normaliser ──────────────────────────────────────── */
// better-sqlite3 accepts .run(a, b, c) or .run([a, b, c])
function toArray(args) {
  if (!args || args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return Array.from(args);
}

/* ── prepared-statement wrapper ──────────────────────────────── */
function makeStmt(sql) {
  return {
    /** INSERT / UPDATE / DELETE */
    run(...args) {
      const params = toArray(args);
      const stmt = _sql.prepare(sql);
      if (params.length) stmt.bind(params);
      stmt.step();
      stmt.free();
      const lastId = _sql.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
      const changes = _sql.getRowsModified();
      if (!_inTx) save();
      return { lastInsertRowid: lastId, changes };
    },
    /** SELECT → first row (or undefined) */
    get(...args) {
      const params = toArray(args);
      const stmt = _sql.prepare(sql);
      if (params.length) stmt.bind(params);
      let row;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      return row;
    },
    /** SELECT → all rows */
    all(...args) {
      const params = toArray(args);
      const stmt = _sql.prepare(sql);
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
  };
}

/* ── db proxy object ─────────────────────────────────────────── */
const db = {
  prepare(sql) { return makeStmt(sql); },

  /** Multi-statement DDL (schema creation, migrations) */
  exec(sql) {
    _sql.run(sql);   // sql.js db.run handles semicolon-separated statements
    if (!_inTx) save();
  },

  /** Wraps a function in a BEGIN/COMMIT transaction */
  transaction(fn) {
    return function (...args) {
      _sql.run('BEGIN');
      _inTx = true;
      try {
        fn(...args);
        _sql.run('COMMIT');
      } catch (e) {
        _sql.run('ROLLBACK');
        throw e;
      } finally {
        _inTx = false;
        save();
      }
    };
  },
};

/* ── SCHEMA ───────────────────────────────────────────────────── */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER UNIQUE NOT NULL,
    display_name TEXT,
    bio          TEXT,
    avatar_url   TEXT,
    banner_url   TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS design (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER UNIQUE NOT NULL,
    bg_type             TEXT DEFAULT 'solid',
    bg_color            TEXT DEFAULT '#0a0a0a',
    bg_gradient_start   TEXT DEFAULT '#0d0221',
    bg_gradient_end     TEXT DEFAULT '#1a1a2e',
    bg_gradient_dir     TEXT DEFAULT 'top',
    bg_image_url        TEXT,
    bg_animated         INTEGER DEFAULT 0,
    text_color          TEXT DEFAULT '#ffffff',
    bio_color           TEXT DEFAULT '#9999bb',
    btn_bg              TEXT DEFAULT 'rgba(255,255,255,0.08)',
    btn_text            TEXT DEFAULT '#ffffff',
    btn_border          TEXT DEFAULT 'rgba(255,255,255,0.15)',
    btn_shape           TEXT DEFAULT 'pill',
    btn_style           TEXT DEFAULT 'glass',
    btn_hover           TEXT DEFAULT 'lift',
    font_heading        TEXT DEFAULT 'Syne',
    font_body           TEXT DEFAULT 'Inter',
    font_size           TEXT DEFAULT 'normal',
    avatar_shape        TEXT DEFAULT 'circle',
    avatar_border_color TEXT DEFAULT 'rgba(255,255,255,0.3)',
    avatar_border_size  TEXT DEFAULT 'medium',
    avatar_glow         INTEGER DEFAULT 0,
    avatar_glow_color   TEXT DEFAULT '#6366f1',
    layout_avatar       TEXT DEFAULT 'top-center',
    layout_bio_align    TEXT DEFAULT 'center',
    link_spacing        TEXT DEFAULT 'normal',
    preset_name         TEXT,
    social_icon_color   TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS links (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    type       TEXT NOT NULL DEFAULT 'custom',
    platform   TEXT,
    title      TEXT,
    url        TEXT NOT NULL,
    position   INTEGER DEFAULT 0,
    visible    INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

/* ── init (call once before server starts) ───────────────────── */
async function init() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  // Load existing DB from disk (if any)
  let data;
  try { data = fs.readFileSync(DB_PATH); } catch {}
  _sql = data ? new SQL.Database(data) : new SQL.Database();

  // Create tables (split on semicolons to avoid multi-statement issues)
  SCHEMA.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
    try { _sql.run(stmt); } catch (e) { /* already exists etc. */ }
  });

  // Migrations for existing databases
  try { _sql.run('ALTER TABLE design ADD COLUMN social_icon_color TEXT DEFAULT NULL'); } catch {}
  try { _sql.run('ALTER TABLE profiles ADD COLUMN banner_url TEXT DEFAULT NULL'); } catch {}

  save();
  return db;
}

module.exports = db;
module.exports.init = init;
