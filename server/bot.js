const TelegramBot = require('node-telegram-bot-api');
const { generateKey } = require('./keys');
const db = require('./db');
const { LINK_KEYS, normalizeSlug, slugError, blankConfig, createPage } = require('./landingPages');

let _bot = null;

// Send a message to the admin without needing the bot listener running
function notify(text) {
  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  if (!token || !adminId || !_bot) return;
  _bot.sendMessage(adminId, text, { parse_mode: 'HTML' }).catch(() => {});
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
      `/newpage — create an olik.app/&lt;slug&gt; page\n` +
      `/pages — list pages + edit codes\n` +
      `/genkey — generate invite key\n` +
      `/keys — list unused keys\n` +
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

  bot.onText(/\/pages/, (msg) => {
    if (!isAdmin(msg.from)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const rows = db.prepare('SELECT slug, edit_code, views FROM landing_pages ORDER BY created_at DESC LIMIT 30').all();
    if (!rows.length) return bot.sendMessage(msg.chat.id, 'No pages yet. Use /newpage to make one.');
    const list = rows.map(r => `<b>olik.app/${esc(r.slug)}</b>\n  🔑 <code>${r.edit_code}</code> · ${r.views || 0} visits`).join('\n\n');
    bot.sendMessage(msg.chat.id, `📄 <b>Pages</b>\n\n${list}`, { parse_mode: 'HTML' });
  });

  bot.onText(/\/cancel/, (msg) => {
    if (wizards.delete(msg.chat.id)) bot.sendMessage(msg.chat.id, '🚫 Cancelled.');
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
        `✅ <b>New invite key</b> (${label}):\n\n<code>${key}</code>`,
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
      `✅ <b>New invite key</b> (${days} days):\n\n<code>${key}</code>`,
      { parse_mode: 'HTML' }
    );
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

module.exports = { startBot, notify };
