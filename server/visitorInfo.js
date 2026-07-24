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

module.exports = { lookupLocation, parseUserAgent, describeVisitor };
