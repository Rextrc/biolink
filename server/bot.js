const TelegramBot = require('node-telegram-bot-api');
const { generateKey } = require('./keys');
const db = require('./db');
const { LINK_KEYS, normalizeSlug, slugError, blankConfig, createPage } = require('./landingPages');
const { pageAnalytics } = require('./analytics');

const SITE_URL = (process.env.PUBLIC_BASE_URL || 'https://olik.app').replace(/\/+$/, '');

let _bot = null;

// Send a message to the admin without needing the bot listener running
function notify(text) {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  if (!token || !adminId || !_bot) return;
  _bot.sendMessage(adminId, text, { parse_mode: 'HTML' }).catch(() => {});
}

/**
 * Send a photo by URL with a caption. Telegram fetches the URL itself, so this
 * costs the server nothing — no headless browser in the container.
 * Falls back to a plain text message if Telegram can't fetch the image
 * (rendering service down, page slow, rate-limited…).
 */
function notifyPhoto(photoUrl, caption) {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  if (!token || !adminId || !_bot) return;
  _bot.sendPhoto(adminId, photoUrl, { caption, parse_mode: 'HTML' })
    .catch(() => notify(caption));
}

/* ── /newpage wizard config ──────────────────────────────────────────── */

// Escape anything the admin types before echoing it back into HTML messages.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LINK_LABELS = {
  email: '📧 Email',        github: '🐙 GitHub',      twitter: '🐦 Twitter',
  linkedin: '💼 LinkedIn',  instagram: '📸 Instagram', photography: '📷 Photography',
  youtube: '▶️ YouTube',    twitch: '🎮 Twitch',      discord: '💬 Discord',
  website: '🌐 Website',
};

const LINK_PROMPTS = {
  email:       'the email address',
  github:      'the GitHub username (or full URL)',
  twitter:     'the Twitter username (or full URL)',
  linkedin:    'the LinkedIn username (or full URL)',
  instagram:   'the Instagram username (or full URL)',
  photography: 'the photography Instagram username (or full URL)',
  youtube:     'the YouTube handle (or full URL)',
  twitch:      'the Twitch username (or full URL)',
  discord:     'the Discord invite code (or full URL)',
  website:     'the website domain (or full URL)',
};

// Fields exposed by the /editpage keyboard, in display order.
const EDIT_FIELDS = [
  { key: 'hero_name',  label: 'Name',    prompt: 'the display name' },
  { key: 'hero_role',  label: 'Role',    prompt: 'the role / title' },
  { key: 'hero_badge', label: 'Status',  prompt: 'the status line (next to the green dot)' },
  { key: 'hero_sub',   label: 'Bio',     prompt: 'the bio line' },
  { key: 'skills',     label: 'Skills',  prompt: 'the skills, comma separated' },
  { key: 'avatar_url', label: 'Avatar',  prompt: 'the avatar image URL' },
  { key: 'accent',     label: 'Accent',  prompt: 'the accent colour as a hex code, e.g. #ff3333' },
  { key: 'timezone',   label: 'Timezone', prompt: 'the IANA timezone, e.g. America/New_York' },
];

// Ordered questions asked before the links step.
const STEPS = [
  { key: 'slug',       q: "What should the URL be?\n\nolik.app/<b>___</b>\n\nLowercase letters, numbers and hyphens." },
  { key: 'hero_name',  q: 'Display name?\n\n<i>Shown big on the card, e.g. Jane</i>' },
  { key: 'hero_role',  q: 'Role / title?\n\n<i>Shown under the name, e.g. Designer</i>', optional: true, fallback: 'Developer' },
  { key: 'hero_badge', q: 'Status line?\n\n<i>Text next to the green dot, e.g. available for work</i>', optional: true, fallback: '' },
  { key: 'hero_sub',   q: 'Short bio line?\n\n<i>One sentence under the status</i>', optional: true, fallback: '' },
  { key: 'skills',     q: 'Skills?\n\n<i>Comma separated, e.g. Figma, CSS, React</i>', optional: true, fallback: [] },
];

function stepText(i) {
  const s = STEPS[i];
  const skip = s.optional ? '\n\nSend /skip to leave it blank.' : '';
  return `<b>Step ${i + 1}/${STEPS.length}</b> — ${s.q}${skip}\n\n<i>/cancel to abort</i>`;
}

function linksKeyboard(cfg) {
  const rows = [];
  for (let i = 0; i < LINK_KEYS.length; i += 2) {
    rows.push(LINK_KEYS.slice(i, i + 2).map(k => ({
      text: `${cfg.links[k] ? '✅ ' : ''}${LINK_LABELS[k]}`,
      callback_data: `np:l:${k}`,
    })));
  }
  rows.push([{ text: `${cfg.verified ? '✅' : '☑️'} Verified badge`, callback_data: 'np:v' }]);
  rows.push([
    { text: '🚀 Create page', callback_data: 'np:done' },
    { text: '🚫 Cancel',      callback_data: 'np:cancel' },
  ]);
  return { inline_keyboard: rows };
}

function editKeyboard(cfg, mode) {
  const rows = [];
  if (mode === 'links') {
    for (let i = 0; i < LINK_KEYS.length; i += 2) {
      rows.push(LINK_KEYS.slice(i, i + 2).map(k => ({
        text: `${cfg.links?.[k] ? '✅ ' : ''}${LINK_LABELS[k]}`,
        callback_data: `ep:l:${k}`,
      })));
    }
    rows.push([{ text: '⬅️ Back', callback_data: 'ep:main' }]);
    return { inline_keyboard: rows };
  }
  for (let i = 0; i < EDIT_FIELDS.length; i += 2) {
    rows.push(EDIT_FIELDS.slice(i, i + 2).map(f => ({ text: `✏️ ${f.label}`, callback_data: `ep:f:${f.key}` })));
  }
  rows.push([
    { text: `${cfg.verified ? '✅' : '☑️'} Verified`, callback_data: 'ep:v' },
    { text: '🔗 Links', callback_data: 'ep:links' },
  ]);
  rows.push([{ text: '✅ Done', callback_data: 'ep:done' }]);
  return { inline_keyboard: rows };
}

function fieldValue(cfg, key) {
  if (key === 'skills') return (cfg.skills || []).join(', ');
  return cfg[key] || '';
}

function editSummary(slug, cfg) {
  const shown = EDIT_FIELDS
    .map(f => `${f.label}: ${fieldValue(cfg, f.key) ? esc(String(fieldValue(cfg, f.key)).slice(0, 40)) : '<i>—</i>'}`)
    .join('\n');
  const linkCount = LINK_KEYS.filter(k => cfg.links?.[k]).length;
  return `<b>olik.app/${esc(slug)}</b>\n\n${shown}\nVerified: ${cfg.verified ? 'yes' : 'no'}\nLinks: ${linkCount}`;
}

function summary(cfg) {
  const filled = LINK_KEYS.filter(k => cfg.links[k]);
  return [
    `<b>${esc(cfg.hero_name)}</b> — ${esc(cfg.hero_role)}`,
    cfg.hero_badge ? `🟢 ${esc(cfg.hero_badge)}` : null,
    cfg.hero_sub ? `<i>${esc(cfg.hero_sub)}</i>` : null,
    cfg.skills.length ? `🛠 ${esc(cfg.skills.join(' · '))}` : null,
    filled.length ? `🔗 ${filled.length} link${filled.length === 1 ? '' : 's'}` : '🔗 no links yet',
  ].filter(Boolean).join('\n');
}

function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return console.log('No TELEGRAM_BOT_TOKEN set, bot disabled');

  const adminId = process.env.TELEGRAM_ADMIN_ID;
  const bot = new TelegramBot(token, { polling: true });
  _bot = bot;

  const isAdmin = (from) => !adminId || String(from.id) === String(adminId);

  // Track users waiting for custom day input
  const awaitingCustom = new Set();

  // chatId -> { step, cfg, awaitingLink, kbMsgId } for the /newpage wizard
  const wizards = new Map();
  // chatId -> { slug, cfg, awaiting, mode, kbMsgId } for the /editpage editor
  const editors = new Map();

  const askStep = (chatId, i) => {
    const w = wizards.get(chatId);
    if (w) w.step = i;
    bot.sendMessage(chatId, stepText(i), { parse_mode: 'HTML' });
  };

  // Re-post the links keyboard at the bottom of the chat, replacing the old one.
  const showLinks = (chatId) => {
    const w = wizards.get(chatId);
    if (!w) return;
    if (w.kbMsgId) bot.deleteMessage(chatId, w.kbMsgId).catch(() => {});
    bot.sendMessage(chatId,
      `<b>Almost done</b> — olik.app/${esc(w.slug)}\n\n${summary(w.cfg)}\n\nTap a platform to add a link, then hit <b>Create page</b>.`,
      { parse_mode: 'HTML', reply_markup: linksKeyboard(w.cfg) }
    ).then(m => { const cur = wizards.get(chatId); if (cur) cur.kbMsgId = m.message_id; }).catch(() => {});
  };

  const finish = (chatId) => {
    const w = wizards.get(chatId);
    if (!w) return;
    try {
      const page = createPage(w.slug, w.cfg);
      wizards.delete(chatId);
      bot.sendMessage(chatId,
        `✅ <b>Page created</b>\n\n` +
        `🔗 <b>olik.app/${esc(page.slug)}</b>\n` +
        `🔑 Edit code: <code>${page.edit_code}</code>\n\n` +
        `Send them the code plus <b>olik.app/edit</b> — that page is hidden, ` +
        `they just type the URL and enter the code to edit their card.`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      // Slug got taken between asking and finishing — send them back to step 1.
      const w2 = wizards.get(chatId);
      if (w2) w2.step = 0;
      bot.sendMessage(chatId, `❌ ${esc(e.message)}\n\nSend a different slug:`, { parse_mode: 'HTML' });
    }
  };

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `👋 <b>olik bot</b>\n\n` +
      `<b>Pages</b>\n` +
      `/newpage — create an olik.app/&lt;slug&gt; page\n` +
      `/pages — list pages + edit codes\n` +
      `/page &lt;slug&gt; — details + traffic\n` +
      `/editpage &lt;slug&gt; — edit a page\n` +
      `/suspend &lt;slug&gt; · /unsuspend &lt;slug&gt;\n\n` +
      `<b>Invites</b>\n` +
      `/genkey — generate invite key\n` +
      `/keys — list unused keys\n\n` +
      `/stats — platform stats`,
      { parse_mode: 'HTML' }
    );
  });

  /* ── /newpage ──────────────────────────────────────────────────────── */

  bot.onText(/\/newpage/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    wizards.set(msg.chat.id, { step: 0, cfg: blankConfig(), slug: '', awaitingLink: null, kbMsgId: null });
    bot.sendMessage(msg.chat.id, "🆕 <b>New page</b>\n\nI'll ask a few questions, then create it.", { parse_mode: 'HTML' })
      .then(() => askStep(msg.chat.id, 0));
  });

  bot.onText(/^\/pages\b/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const rows = db.prepare('SELECT slug, edit_code, views, suspended FROM landing_pages ORDER BY created_at DESC LIMIT 30').all();
    if (!rows.length) return bot.sendMessage(msg.chat.id, 'No pages yet. Use /newpage to make one.');
    const list = rows.map(r =>
      `<b>olik.app/${esc(r.slug)}</b>${r.suspended ? ' ⛔' : ''}\n  🔑 <code>${r.edit_code}</code> · ${r.views || 0} visits`
    ).join('\n\n');
    bot.sendMessage(msg.chat.id, `📄 <b>Pages</b>\n\n${list}\n\n<i>/page &lt;slug&gt; for details</i>`, { parse_mode: 'HTML' });
  });

  /* ── /page <slug> — details + traffic ──────────────────────────────── */
  bot.onText(/^\/page(?:@\S+)?\s+(\S+)/, (msg, match) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const slug = normalizeSlug(match[1]);
    const row = db.prepare('SELECT slug, edit_code, views, suspended, created_at FROM landing_pages WHERE slug = ?').get(slug);
    if (!row) return bot.sendMessage(msg.chat.id, `❌ No page at olik.app/${esc(slug)}`, { parse_mode: 'HTML' });

    let cfg = {};
    try { cfg = JSON.parse(db.prepare('SELECT data FROM landing_pages WHERE slug = ?').get(slug).data); } catch {}
    const a = pageAnalytics(slug, 30);
    const topCountries = a.countries.length ? a.countries.map(c => `${c.country} ${c.c}`).join(', ') : '—';
    const refs = [...a.referrers.map(r => `${r.referrer} ${r.c}`), ...(a.direct ? [`direct ${a.direct}`] : [])];
    const links = LINK_KEYS.filter(k => cfg.links?.[k]);

    bot.sendMessage(msg.chat.id,
      `📄 <b>olik.app/${esc(row.slug)}</b>${row.suspended ? ' — ⛔ <b>SUSPENDED</b>' : ''}\n` +
      `🔑 <code>${row.edit_code}</code>\n\n` +
      `<b>${esc(cfg.hero_name || row.slug)}</b> — ${esc(cfg.hero_role || '—')}\n` +
      `${cfg.hero_badge ? `🟢 ${esc(cfg.hero_badge)}\n` : ''}` +
      `${cfg.hero_sub ? `<i>${esc(cfg.hero_sub)}</i>\n` : ''}` +
      `${(cfg.skills || []).length ? `🛠 ${esc(cfg.skills.join(' · '))}\n` : ''}` +
      `🔗 ${links.length ? esc(links.join(', ')) : 'none'}\n` +
      `🎨 ${esc(cfg.accent || '#ff3333')}${cfg.verified ? ' · ✅ verified' : ''}\n\n` +
      `<b>Traffic</b> (30d: ${a.window}, all time: ${a.total})\n` +
      `🌍 ${esc(topCountries)}\n` +
      `↗️ ${refs.length ? esc(refs.join(', ')) : '—'}\n\n` +
      `<i>/editpage ${esc(row.slug)} to change it</i>`,
      { parse_mode: 'HTML' }
    );
  });

  /* ── /suspend + /unsuspend ─────────────────────────────────────────── */
  const setSuspended = (msg, slugRaw, on) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const slug = normalizeSlug(slugRaw);
    const row = db.prepare('SELECT id FROM landing_pages WHERE slug = ?').get(slug);
    if (!row) return bot.sendMessage(msg.chat.id, `❌ No page at olik.app/${esc(slug)}`, { parse_mode: 'HTML' });
    db.prepare('UPDATE landing_pages SET suspended = ? WHERE id = ?').run(on ? 1 : 0, row.id);
    bot.sendMessage(msg.chat.id,
      on ? `⛔ <b>Suspended</b> olik.app/${esc(slug)}\n\nIt now shows an "unavailable" card and its owner can't edit it.`
         : `✅ <b>Restored</b> olik.app/${esc(slug)}`,
      { parse_mode: 'HTML' });
  };
  bot.onText(/^\/suspend(?:@\S+)?\s+(\S+)/, (msg, m) => setSuspended(msg, m[1], true));
  bot.onText(/^\/unsuspend(?:@\S+)?\s+(\S+)/, (msg, m) => setSuspended(msg, m[1], false));

  /* ── /editpage <slug> ──────────────────────────────────────────────── */
  const showEditor = (chatId, replaceMsgId) => {
    const e = editors.get(chatId);
    if (!e) return;
    if (replaceMsgId) bot.deleteMessage(chatId, replaceMsgId).catch(() => {});
    else if (e.kbMsgId) bot.deleteMessage(chatId, e.kbMsgId).catch(() => {});
    bot.sendMessage(chatId,
      `${editSummary(e.slug, e.cfg)}\n\n<i>Changes save instantly.</i>`,
      { parse_mode: 'HTML', reply_markup: editKeyboard(e.cfg, e.mode) }
    ).then(m => { const cur = editors.get(chatId); if (cur) cur.kbMsgId = m.message_id; }).catch(() => {});
  };

  const persist = (chatId) => {
    const e = editors.get(chatId);
    if (!e) return;
    db.prepare('UPDATE landing_pages SET data = ? WHERE slug = ?').run(JSON.stringify(e.cfg), e.slug);
  };

  bot.onText(/^\/editpage(?:@\S+)?\s+(\S+)/, (msg, match) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const slug = normalizeSlug(match[1]);
    const row = db.prepare('SELECT slug, data FROM landing_pages WHERE slug = ?').get(slug);
    if (!row) return bot.sendMessage(msg.chat.id, `❌ No page at olik.app/${esc(slug)}`, { parse_mode: 'HTML' });
    let cfg = {};
    try { cfg = JSON.parse(row.data); } catch {}
    if (!cfg.links) cfg.links = {};
    editors.set(msg.chat.id, { slug: row.slug, cfg, awaiting: null, mode: 'main', kbMsgId: null });
    showEditor(msg.chat.id);
  });

  bot.onText(/^\/editpage(?:@\S+)?\s*$/, (msg) => {
    if (!isAdmin(msg.from)) return;
    bot.sendMessage(msg.chat.id, 'Usage: <code>/editpage &lt;slug&gt;</code>\n\n/pages to see them all.', { parse_mode: 'HTML' });
  });

  bot.onText(/\/cancel/, (msg) => {
    const had = wizards.delete(msg.chat.id) | editors.delete(msg.chat.id);
    if (had) bot.sendMessage(msg.chat.id, '🚫 Cancelled.');
  });

  /* ── /genkey ───────────────────────────────────────────────────────── */

  bot.onText(/\/genkey$/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    bot.sendMessage(msg.chat.id, '⏱ Choose key duration:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '∞ Lifetime', callback_data: 'dur:' },
            { text: '7 days',     callback_data: 'dur:7' },
            { text: '30 days',    callback_data: 'dur:30' },
          ],
          [
            { text: '90 days',    callback_data: 'dur:90' },
            { text: '1 year',     callback_data: 'dur:365' },
            { text: '✏️ Custom',  callback_data: 'dur:custom' },
          ],
        ],
      },
    });
  });

  bot.on('callback_query', (query) => {
    if (!isAdmin(query.from)) return bot.answerCallbackQuery(query.id, { text: 'Unauthorized' });
    const chatId = query.message.chat.id;

    /* /newpage links keyboard */
    if (query.data.startsWith('np:')) {
      bot.answerCallbackQuery(query.id);
      const w = wizards.get(chatId);
      if (!w) return bot.sendMessage(chatId, 'That wizard expired. Send /newpage to start again.');

      if (query.data === 'np:cancel') {
        wizards.delete(chatId);
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        return bot.sendMessage(chatId, '🚫 Cancelled.');
      }
      if (query.data === 'np:done') {
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        return finish(chatId);
      }
      if (query.data === 'np:v') {
        w.cfg.verified = !w.cfg.verified;
        return bot.editMessageReplyMarkup(linksKeyboard(w.cfg), {
          chat_id: chatId, message_id: query.message.message_id,
        }).catch(() => {});
      }
      if (query.data.startsWith('np:l:')) {
        const key = query.data.slice(5);
        if (!LINK_KEYS.includes(key)) return;
        w.awaitingLink = key;
        return bot.sendMessage(chatId,
          `${LINK_LABELS[key]} — send ${LINK_PROMPTS[key]}.\n\n<i>/skip to clear it</i>`,
          { parse_mode: 'HTML' }
        );
      }
      return;
    }

    /* /editpage keyboard */
    if (query.data.startsWith('ep:')) {
      bot.answerCallbackQuery(query.id);
      const e = editors.get(chatId);
      if (!e) return bot.sendMessage(chatId, 'That editor expired. Send /editpage <slug> again.');

      if (query.data === 'ep:done') {
        editors.delete(chatId);
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        return bot.sendMessage(chatId, `✅ Saved — ${SITE_URL}/${e.slug}`);
      }
      if (query.data === 'ep:links') { e.mode = 'links'; return showEditor(chatId, query.message.message_id); }
      if (query.data === 'ep:main')  { e.mode = 'main';  return showEditor(chatId, query.message.message_id); }
      if (query.data === 'ep:v') {
        e.cfg.verified = !e.cfg.verified;
        persist(chatId);
        return showEditor(chatId, query.message.message_id);
      }
      if (query.data.startsWith('ep:f:')) {
        const key = query.data.slice(5);
        const field = EDIT_FIELDS.find(f => f.key === key);
        if (!field) return;
        e.awaiting = { kind: 'field', key };
        const cur = fieldValue(e.cfg, key);
        return bot.sendMessage(chatId,
          `✏️ Send ${field.prompt}.${cur ? `\n\nCurrently: <code>${esc(String(cur))}</code>` : ''}\n\n<i>/skip to clear it</i>`,
          { parse_mode: 'HTML' });
      }
      if (query.data.startsWith('ep:l:')) {
        const key = query.data.slice(5);
        if (!LINK_KEYS.includes(key)) return;
        e.awaiting = { kind: 'link', key };
        const cur = e.cfg.links?.[key];
        return bot.sendMessage(chatId,
          `${LINK_LABELS[key]} — send ${LINK_PROMPTS[key]}.${cur ? `\n\nCurrently: <code>${esc(cur)}</code>` : ''}\n\n<i>/skip to clear it</i>`,
          { parse_mode: 'HTML' });
      }
      return;
    }

    /* /genkey durations */
    if (query.data.startsWith('dur:')) {
      const val = query.data.slice(4);
      bot.answerCallbackQuery(query.id);

      if (val === 'custom') {
        awaitingCustom.add(chatId);
        bot.editMessageText('✏️ Send me the number of days:', {
          chat_id: chatId, message_id: query.message.message_id,
        });
        return;
      }

      const dur = val === '' ? null : Number(val);
      const key = generateKey('', dur);
      const label = dur ? `${dur} days` : 'Lifetime';
      bot.editMessageText(
        `✅ <b>New invite key</b> (${label}):\n\n<code>${key}</code>\n\n` +
        `Send it with <b>olik.app/claim</b> — they redeem it there for their own page.`,
        { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'HTML' }
      );
    }
  });

  // Handle custom day input
  bot.on('message', (msg) => {
    if (!awaitingCustom.has(msg.chat.id)) return;
    if (!isAdmin(msg.from)) return;
    const days = parseInt(msg.text);
    if (!days || days < 1) {
      return bot.sendMessage(msg.chat.id, '❌ Enter a valid number of days.');
    }
    awaitingCustom.delete(msg.chat.id);
    const key = generateKey('', days);
    bot.sendMessage(msg.chat.id,
      `✅ <b>New invite key</b> (${days} days):\n\n<code>${key}</code>\n\n` +
      `Send it with <b>olik.app/claim</b> — they redeem it there for their own page.`,
      { parse_mode: 'HTML' }
    );
  });

  // Handle /editpage field input
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const e = editors.get(chatId);
    if (!e || !e.awaiting || !isAdmin(msg.from)) return;

    const text = (msg.text || '').trim();
    if (!text) return;
    const isSkip = text.toLowerCase() === '/skip';
    if (text.startsWith('/') && !isSkip) return; // let other commands through

    const { kind, key } = e.awaiting;
    if (kind === 'link') {
      e.cfg.links[key] = isSkip ? '' : text;
    } else if (key === 'skills') {
      e.cfg.skills = isSkip ? [] : text.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      e.cfg[key] = isSkip ? '' : text;
    }
    e.awaiting = null;
    persist(chatId);
    showEditor(chatId);
  });

  // Handle /newpage wizard answers
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const w = wizards.get(chatId);
    if (!w || !isAdmin(msg.from)) return;

    const text = (msg.text || '').trim();
    if (!text) return;

    const isSkip = text.toLowerCase() === '/skip';
    // Let every other slash-command fall through to its own handler rather
    // than being swallowed as an answer.
    if (text.startsWith('/') && !isSkip) return;

    // Filling in one social link
    if (w.awaitingLink) {
      const key = w.awaitingLink;
      w.cfg.links[key] = isSkip ? '' : text;
      w.awaitingLink = null;
      return showLinks(chatId);
    }

    // Answering a numbered step
    const step = STEPS[w.step];
    if (!step) return showLinks(chatId);

    if (isSkip && !step.optional) {
      return bot.sendMessage(chatId, "❌ That one's required — please send a value.");
    }

    if (step.key === 'slug') {
      const slug = normalizeSlug(text);
      const err = slugError(slug);
      if (err) return bot.sendMessage(chatId, `❌ ${esc(err)}\n\nTry another slug:`, { parse_mode: 'HTML' });
      w.slug = slug;
      w.cfg.hero_name = slug; // sensible default until they answer the name step
    } else if (step.key === 'skills') {
      w.cfg.skills = isSkip ? [] : text.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      w.cfg[step.key] = isSkip ? step.fallback : text;
    }

    const next = w.step + 1;
    if (next < STEPS.length) return askStep(chatId, next);
    w.step = STEPS.length;
    showLinks(chatId);
  });

  bot.onText(/\/keys/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const keys = db.prepare("SELECT * FROM invite_keys WHERE used_by IS NULL ORDER BY created_at DESC LIMIT 20").all();
    if (!keys.length) return bot.sendMessage(msg.chat.id, 'No unused keys.');
    const list = keys.map(k => {
      const dur = k.duration_days ? `${k.duration_days}d` : '∞';
      return `<code>${k.key}</code> <b>[${dur}]</b>${k.note ? ` — ${k.note}` : ''}`;
    }).join('\n');
    bot.sendMessage(msg.chat.id, `🔑 <b>Unused keys:</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  bot.onText(/\/stats/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const users    = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const pages    = db.prepare('SELECT COUNT(*) as c FROM landing_pages').get().c;
    const used     = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NOT NULL").get().c;
    const left     = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NULL").get().c;
    bot.sendMessage(msg.chat.id,
      `📊 <b>olik stats</b>\n\n👤 Users: ${users}\n📄 Pages: ${pages}\n🔑 Keys used: ${used}\n🎟 Keys left: ${left}`,
      { parse_mode: 'HTML' }
    );
  });

  console.log('✅ Telegram bot started');
}

module.exports = { startBot, notify, notifyPhoto };
