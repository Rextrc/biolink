const TelegramBot = require('node-telegram-bot-api');
const { generateKey } = require('./keys');
const db = require('./db');

function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return console.log('No TELEGRAM_BOT_TOKEN set, bot disabled');

  const adminId = process.env.TELEGRAM_ADMIN_ID;
  const bot = new TelegramBot(token, { polling: true });

  const isAdmin = (from) => !adminId || String(from.id) === String(adminId);

  // Track users waiting for custom day input
  const awaitingCustom = new Set();

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `👋 <b>olik bot</b>\n\n/genkey — generate invite key\n/keys — list unused keys\n/stats — platform stats`,
      { parse_mode: 'HTML' }
    );
  });

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
    const links    = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
    const used     = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NOT NULL").get().c;
    const left     = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NULL").get().c;
    bot.sendMessage(msg.chat.id,
      `📊 <b>olik stats</b>\n\n👤 Users: ${users}\n🔗 Links: ${links}\n🔑 Keys used: ${used}\n🎟 Keys left: ${left}`,
      { parse_mode: 'HTML' }
    );
  });

  console.log('✅ Telegram bot started');
}

module.exports = { startBot };
