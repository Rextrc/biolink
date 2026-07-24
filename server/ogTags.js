/**
 * Builds the Open Graph / Twitter Card tags injected into index.html for the
 * root page and each olik.app/<slug> card, so links unfurl with the right
 * name, description and a screenshot instead of a bare URL.
 *
 * Crawlers don't execute JavaScript, which is why this happens server-side.
 */
const db = require('./db');

const SITE_URL = (process.env.PUBLIC_BASE_URL || 'https://olik.app').replace(/\/+$/, '');
const SHOT_TEMPLATE = process.env.SCREENSHOT_TEMPLATE
  || 'https://image.thum.io/get/width/1200/crop/630/noanimate/wait/4/{url}';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function tag(attr, key, value) {
  return `    <meta ${attr}="${esc(key)}" content="${esc(value)}">`;
}

function build({ title, description, url, image }) {
  return [
    tag('property', 'og:type', 'profile'),
    tag('property', 'og:site_name', 'olik.app'),
    tag('property', 'og:title', title),
    tag('property', 'og:description', description),
    tag('property', 'og:url', url),
    image ? tag('property', 'og:image', image) : null,
    image ? tag('property', 'og:image:width', '1200') : null,
    image ? tag('property', 'og:image:height', '630') : null,
    tag('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    tag('name', 'twitter:title', title),
    tag('name', 'twitter:description', description),
    image ? tag('name', 'twitter:image', image) : null,
    tag('name', 'description', description),
  ].filter(Boolean).join('\n');
}

/** One-line summary of a card, used as the preview description. */
function describe(cfg, fallback) {
  const bio = (cfg.hero_sub || '').trim();
  if (bio) return bio.slice(0, 200);
  const bits = [cfg.hero_role, (cfg.skills || []).slice(0, 4).join(', ')].filter(Boolean);
  return bits.join(' · ').slice(0, 200) || fallback;
}

/**
 * @returns {string|null} the tag block, or null to serve index.html untouched
 * (unknown slug — the SPA will fall back to the owner's card anyway).
 */
function ogTagsFor(slug, req) {
  const proto = (req?.headers['x-forwarded-proto'] || '').split(',')[0] || 'https';
  const host = req?.headers['host'];
  const base = host ? `${proto}://${host}` : SITE_URL;

  // Root: the owner's own card, from site_config.
  if (!slug) {
    let cfg = {};
    try { cfg = JSON.parse(db.prepare('SELECT data FROM site_config WHERE id=1').get()?.data || '{}'); } catch {}
    const name = cfg.hero_name || 'Olik';
    return build({
      title: `${name} — ${cfg.hero_role || 'Developer'}`,
      description: describe(cfg, 'Personal developer page.'),
      url: `${base}/`,
      image: SHOT_TEMPLATE.replace('{url}', `${SITE_URL}/`),
    });
  }

  const row = db.prepare('SELECT slug, data, suspended FROM landing_pages WHERE slug = ?').get(slug);
  if (!row) return null;

  if (row.suspended) {
    return build({
      title: 'Temporarily unavailable',
      description: 'This page has been suspended.',
      url: `${base}/${row.slug}`,
      image: null, // never leak a screenshot of a suspended page
    });
  }

  let cfg = {};
  try { cfg = JSON.parse(row.data); } catch {}
  const name = cfg.hero_name || row.slug;
  return build({
    title: cfg.hero_role ? `${name} — ${cfg.hero_role}` : name,
    description: describe(cfg, `${name} on olik.app`),
    url: `${base}/${row.slug}`,
    image: SHOT_TEMPLATE.replace('{url}', `${SITE_URL}/${row.slug}`),
  });
}

module.exports = { ogTagsFor };
