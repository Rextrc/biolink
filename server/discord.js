const https = require('https');

const TOKEN   = process.env.DISCORD_BOT_TOKEN;
const USER_ID = process.env.DISCORD_ADMIN_ID;

function discordRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method,
      headers: {
        'Authorization': `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sendDM(message) {
  if (!TOKEN || !USER_ID) return;
  try {
    const dm = await discordRequest('POST', '/users/@me/channels', { recipient_id: USER_ID });
    if (!dm.id) return;
    await discordRequest('POST', `/channels/${dm.id}/messages`, { content: message });
  } catch (e) {
    console.error('[discord] DM failed:', e.message);
  }
}

module.exports = { sendDM };
