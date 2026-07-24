/**
 * Shared logic for the admin-created profile cards that live at olik.app/<slug>.
 * Imported by BOTH the HTTP admin API (routes/pages.js) and the Telegram bot
 * (bot.js), so slug rules / code generation can never drift between the two.
 */
const crypto = require('crypto');
const db = require('./db');

// Slugs that would collide with real client routes or server paths.
const RESERVED = new Set([
  'login', 'signup', 'verify', 'forgot-password', 'reset-password',
  'dashboard', 'god', 'inbox', 'create', 'edit', 'claim', 'api', 'uploads', 'u',
  'assets', 'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30})$/;

// Substrings that can't appear anywhere in a slug. Two groups:
//  - impersonation: names that would let a page pass as official
//  - abuse: slurs / harassment terms we don't want on the domain
// Matched against a de-leeted, separator-stripped form so "0l1k-supp0rt" and
// "s_u_p_p_o_r_t" are caught too.
const BLOCKED_SUBSTRINGS = [
  // impersonation / official-looking
  'admin', 'administrator', 'support', 'official', 'staff', 'moderator', 'billing',
  'security', 'payment', 'helpdesk', 'root', 'sysadmin', 'webmaster', 'noreply',
  'olikapp', 'olikofficial', 'realolik', 'theolik',
  // abuse
  'nigger', 'nigga', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'spic',
  'rapist', 'pedophile', 'childporn',
];

// Short tokens that would false-positive as substrings ("cp" inside "cpu"),
// so they only block when they are the entire slug.
const BLOCKED_EXACT = new Set(['cp', 'pedo', 'mod', 'help', 'team', 'system', 'api', 'www', 'mail']);

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '$': 's', '@': 'a' };

function canonicalise(slug) {
  return String(slug).toLowerCase()
    .replace(/[0134578$@]/g, (c) => LEET[c] || c)
    .replace(/[^a-z]/g, ''); // drop hyphens/digits so separators can't hide a word
}

// Every social field a card can show, in the order they render.
const LINK_KEYS = [
  'email', 'github', 'twitter', 'linkedin', 'instagram',
  'photography', 'youtube', 'twitch', 'discord', 'website',
];

function normalizeSlug(raw) {
  return String(raw || '').trim().toLowerCase().replace(/^\/+/, '');
}

/** Returns a human-readable error string, or null when the slug is valid AND free. */
function slugError(slug) {
  if (!SLUG_RE.test(slug)) {
    return 'Slug must be 1–31 chars: lowercase letters, numbers, hyphens; starting with a letter or number.';
  }
  if (RESERVED.has(slug)) return 'That slug is reserved.';
  if (BLOCKED_EXACT.has(slug)) return 'That slug isn’t available.';
  const canon = canonicalise(slug);
  if (BLOCKED_SUBSTRINGS.some(word => canon.includes(word))) return 'That slug isn’t available.';
  if (db.prepare('SELECT 1 FROM landing_pages WHERE slug = ?').get(slug)) {
    return 'That slug is already taken.';
  }
  return null;
}

// Unambiguous alphabet — no O/0, I/1/L — so codes survive being read aloud or
// copied off a screen. 8 chars over 31 symbols ≈ 8.5e11 combinations, which
// (together with the rate limit on /edit/verify) makes guessing impractical.
// Codes issued before this change were 5 digits; lookups are by exact string,
// so those keep working and are never rewritten.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;

function uniqueCode() {
  const gen = () => Array.from(crypto.randomBytes(CODE_LEN))
    .map(b => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
  for (let i = 0; i < 60; i++) {
    const c = gen();
    if (!db.prepare('SELECT 1 FROM landing_pages WHERE edit_code = ?').get(c)) return c;
  }
  return gen(); // extremely unlikely fallback
}

/**
 * A complete card config with every key present. Neutral by default — never
 * seeded with the owner's own details, or a new page would show Olik's bio.
 */
function blankConfig(overrides = {}) {
  const links = {};
  LINK_KEYS.forEach(k => { links[k] = ''; });
  return {
    avatar_url: '',
    verified: false,
    accent: '#ff3333',
    timezone: 'America/New_York',
    hero_badge: 'available for work',
    hero_name: '',
    hero_role: 'Developer',
    hero_sub: '',
    skills: [],
    ...overrides,
    links: { ...links, ...(overrides.links || {}) },
  };
}

/**
 * Creates the page. Throws an Error with `.slugError = true` when the slug is
 * invalid/taken so callers can show the message directly to the user.
 */
function createPage(rawSlug, data) {
  const slug = normalizeSlug(rawSlug);
  const err = slugError(slug);
  if (err) {
    const e = new Error(err);
    e.slugError = true;
    throw e;
  }
  const code = uniqueCode();
  db.prepare('INSERT INTO landing_pages (slug, edit_code, data) VALUES (?, ?, ?)')
    .run(slug, code, JSON.stringify(data || blankConfig({ hero_name: slug })));
  return db.prepare('SELECT id, slug, edit_code, views, created_at FROM landing_pages WHERE slug = ?').get(slug);
}

module.exports = {
  RESERVED, SLUG_RE, LINK_KEYS, BLOCKED_SUBSTRINGS, BLOCKED_EXACT,
  normalizeSlug, slugError, uniqueCode, blankConfig, createPage, canonicalise,
};
