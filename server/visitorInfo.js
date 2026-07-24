/**
 * Best-effort "who was this" enrichment for admin notifications: geo-locates an
 * IP and summarises the User-Agent. Everything here fails soft — a lookup that
 * errors or times out just yields null, never breaks the request it decorates.
 */

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|169\.254\.|::1|fc|fd|172\.(1[6-9]|2\d|3[01])\.)/i;

/** "Miami, Florida, US · Comcast" — or null if it can't be resolved. */
async function lookupLocation(ip) {
  if (!ip || ip === 'unknown' || PRIVATE_IP.test(ip)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || d.success === false) return null;
    const place = [d.city, d.region, d.country_code || d.country].filter(Boolean).join(', ');
    const isp = d.connection?.isp || d.connection?.org;
    return [place || null, isp || null].filter(Boolean).join(' · ') || null;
  } catch {
    return null;
  }
}

/** "iPhone · Safari" / "Windows · Chrome" — a readable gist, not a full UA parse. */
function parseUserAgent(ua) {
  if (!ua) return null;
  const s = String(ua);

  let device =
    /iPhone/i.test(s) ? 'iPhone' :
    /iPad/i.test(s) ? 'iPad' :
    /Android/i.test(s) ? (/Mobile/i.test(s) ? 'Android phone' : 'Android tablet') :
    /Macintosh|Mac OS X/i.test(s) ? 'Mac' :
    /Windows/i.test(s) ? 'Windows' :
    /CrOS/i.test(s) ? 'ChromeOS' :
    /Linux/i.test(s) ? 'Linux' : null;

  // Order matters — Edge/Opera/Brave all claim to be Chrome, Chrome claims Safari.
  let browser =
    /Edg\//i.test(s) ? 'Edge' :
    /OPR\/|Opera/i.test(s) ? 'Opera' :
    /SamsungBrowser/i.test(s) ? 'Samsung Internet' :
    /Firefox\//i.test(s) ? 'Firefox' :
    /Chrome\//i.test(s) ? 'Chrome' :
    /Safari\//i.test(s) ? 'Safari' : null;

  // In-app webviews are worth calling out — they're a common source of oddities.
  if (/Instagram/i.test(s)) browser = 'Instagram in-app';
  else if (/FBAN|FBAV/i.test(s)) browser = 'Facebook in-app';
  else if (/Telegram/i.test(s)) browser = 'Telegram in-app';

  const out = [device, browser].filter(Boolean).join(' · ');
  return out || null;
}

/** Lines ready to append to a Telegram message. `esc` escapes for HTML. */
async function describeVisitor(req, esc = (x) => x) {
  const { clientIp } = require('./rateLimit');
  const ip = clientIp(req);
  const device = parseUserAgent(req.headers['user-agent']);
  const location = await lookupLocation(ip);
  return [
    `🌐 IP: <code>${esc(ip)}</code>`,
    location ? `📍 ${esc(location)}` : null,
    device ? `📱 ${esc(device)}` : null,
  ].filter(Boolean).join('\n');
}

/* ── Country lookup for per-page analytics ──────────────────────────────
   Cached per IP for a day and globally throttled, so a burst of traffic
   can't hammer the free geo API (or slow anything down — callers
   fire-and-forget this). Unknown just means the country column stays null. */
const countryCache = new Map(); // ip -> { code, expires }
const COUNTRY_TTL = 24 * 60 * 60 * 1000;
let lookupsThisMinute = 0;
let minuteResetAt = 0;

async function lookupCountry(ip) {
  if (!ip || ip === 'unknown' || PRIVATE_IP.test(ip)) return null;

  const hit = countryCache.get(ip);
  if (hit && Date.now() < hit.expires) return hit.code;

  const now = Date.now();
  if (now > minuteResetAt) { minuteResetAt = now + 60_000; lookupsThisMinute = 0; }
  if (lookupsThisMinute >= 30) return null; // stay well under free-tier limits
  lookupsThisMinute += 1;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const d = await res.json();
    const code = (d && d.success !== false && d.country_code) ? String(d.country_code).toUpperCase() : null;
    if (countryCache.size > 10000) countryCache.clear();
    countryCache.set(ip, { code, expires: Date.now() + COUNTRY_TTL });
    return code;
  } catch {
    return null;
  }
}

/** Bare hostname of a referring URL, or null for direct/self traffic. */
function referrerHost(referer, selfHost) {
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.replace(/^www\./, '');
    if (!host || (selfHost && host === String(selfHost).replace(/^www\./, ''))) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

module.exports = { lookupLocation, parseUserAgent, describeVisitor, lookupCountry, referrerHost };
