const TelegramBot = require('node-telegram-bot-api');
const { generateKey } = require('./keys');
const db = require('./db');

function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return console.log('No TELEGRAM_BOT_TOKEN set, bot disabled');

  const adminId = process.env.TELEGRAM_ADMIN_ID;
  const bot = new TelegramBot(token, { polling: true });

  const isAdmin = (msg) => !adminId || String(msg.from.id) === String(adminId);

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `👋 olik bot\n\n/genkey — generate invite key\n/keys — list unused keys\n/stats — platform stats`);
  });

  bot.onText(/\/genkey(.*)/, (msg, match) => {
    if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const note = match[1].trim() || '';
    const key = generateKey(note);
    bot.sendMessage(msg.chat.id, `✅ New invite key:\n\n<code>${key}</code>`, { parse_mode: 'HTML' });
  });

  bot.onText(/\/keys/, (msg) => {
    if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const keys = db.prepare("SELECT * FROM invite_keys WHERE used_by IS NULL ORDER BY created_at DESC LIMIT 20").all();
    if (!keys.length) return bot.sendMessage(msg.chat.id, 'No unused keys.');
    const list = keys.map(k => `<code>${k.key}</code>${k.note ? ` — ${k.note}` : ''}`).join('\n');
    bot.sendMessage(msg.chat.id, `🔑 Unused keys:\n\n${list}`, { parse_mode: 'HTML' });
  });

  bot.onText(/\/stats/, (msg) => {
    if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
    const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const links = db.prepare('SELECT COUNT(*) as c FROM links').get().c;
    const keys_used = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NOT NULL").get().c;
    const keys_left = db.prepare("SELECT COUNT(*) as c FROM invite_keys WHERE used_by IS NULL").get().c;
    bot.sendMessage(msg.chat.id, `📊 olik stats\n\n👤 Users: ${users}\n🔗 Links: ${links}\n🔑 Keys used: ${keys_used}\n🎟 Keys left: ${keys_left}`);
  });

  console.log('✅ Telegram bot started');
}

module.exports = { startBot };
