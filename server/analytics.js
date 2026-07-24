/**
 * Per-page traffic breakdown, read straight off the page_visits log.
 * Shared by the admin API and the Telegram bot so both show the same numbers.
 */
const db = require('./db');

/**
 * @param {string} slug
 * @param {number} days window to report on
 * @returns {{ total:number, window:number, days:number, countries:Array, referrers:Array, daily:Array }}
 */
function pageAnalytics(slug, days = 30) {
  const since = `-${Number(days) || 30} days`;

  const total = db.prepare('SELECT views FROM landing_pages WHERE slug = ?').get(slug)?.views || 0;

  const windowCount = db.prepare(
    `SELECT COUNT(*) AS c FROM page_visits WHERE slug = ? AND ts >= datetime('now', ?)`
  ).get(slug, since)?.c || 0;

  const countries = db.prepare(
    `SELECT country, COUNT(*) AS c FROM page_visits
      WHERE slug = ? AND ts >= datetime('now', ?) AND country IS NOT NULL
      GROUP BY country ORDER BY c DESC LIMIT 8`
  ).all(slug, since);

  const referrers = db.prepare(
    `SELECT referrer, COUNT(*) AS c FROM page_visits
      WHERE slug = ? AND ts >= datetime('now', ?) AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY c DESC LIMIT 8`
  ).all(slug, since);

  const direct = db.prepare(
    `SELECT COUNT(*) AS c FROM page_visits
      WHERE slug = ? AND ts >= datetime('now', ?) AND referrer IS NULL`
  ).get(slug, since)?.c || 0;

  const daily = db.prepare(
    `SELECT date(ts) AS day, COUNT(*) AS c FROM page_visits
      WHERE slug = ? AND ts >= datetime('now', '-14 days')
      GROUP BY day ORDER BY day ASC`
  ).all(slug);

  return { total, window: windowCount, days: Number(days) || 30, countries, referrers, direct, daily };
}

module.exports = { pageAnalytics };
