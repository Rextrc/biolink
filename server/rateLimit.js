/**
 * Tiny in-memory rate limiter. Enough for this single-instance server — it
 * exists to stop someone scripting their way through edit codes, not to be a
 * distributed quota system. Counters reset on redeploy, which is fine.
 */
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

function rateLimit({ windowMs, max, message = 'Too many attempts. Try again later.' }) {
  const hits = new Map(); // ip -> { count, resetAt }

  return function limiter(req, res, next) {
    const now = Date.now();
    const ip = clientIp(req);
    let rec = hits.get(ip);

    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;

    // Opportunistic cleanup so the map can't grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }

    if (rec.count > max) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { rateLimit, clientIp };
