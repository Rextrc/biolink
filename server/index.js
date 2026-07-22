require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const compression = require('compression');
const app         = express();

app.use(compression());

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://olik.app',
  'https://www.olik.app',
].filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json());

// API routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/design',  require('./routes/design'));
app.use('/api/links',   require('./routes/links'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/inbox',   require('./routes/inbox'));
app.use('/api/upload',  require('./routes/upload'));
app.use('/api/spotify', require('./routes/spotify'));

// Coming soon mode flag
app.get('/api/mode', (req, res) => {
  res.json({ comingSoon: process.env.COMING_SOON === 'true' });
});

// Waitlist signup
app.post('/api/waitlist', (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  try {
    const db = require('./db');
    db.prepare('INSERT INTO waitlist (email) VALUES (?)').run(email);
    const { notify } = require('./bot');
    notify(`📬 <b>Waitlist signup</b>\n${email}`);
    res.json({ ok: true });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Already on the list' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Public site config (landing page copy)
app.get('/api/site-config', (req, res) => {
  try {
    const db = require('./db');
    const row = db.prepare('SELECT data FROM site_config WHERE id=1').get();
    res.json(row ? JSON.parse(row.data) : {});
  } catch { res.json({}); }
});

// Landing page view counter — POST increments, GET just reads
app.post('/api/view', (req, res) => {
  try {
    const db = require('./db');
    db.prepare('UPDATE page_views SET count = count + 1 WHERE id = 1').run();
    const row = db.prepare('SELECT count FROM page_views WHERE id = 1').get();
    res.json({ count: row?.count ?? 0 });
  } catch { res.json({ count: 0 }); }
});
app.get('/api/view', (req, res) => {
  try {
    const db = require('./db');
    const row = db.prepare('SELECT count FROM page_views WHERE id = 1').get();
    res.json({ count: row?.count ?? 0 });
  } catch { res.json({ count: 0 }); }
});

// Serve uploaded images
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/data/uploads';
app.use('/uploads', require('express').static(UPLOAD_DIR));

// Serve the built Vite client in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
// SPA fallback — all non-API routes return index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;

// Initialise the database before accepting connections
require('./db').init().then(() => {
  require('./bot').startBot();
  app.listen(PORT, () => {
    console.log(`✅  Server running on http://localhost:${PORT}`);
    console.log(`   Dev client : http://localhost:5173  (run: npm run dev:client)`);
    console.log(`   Prod bundle: http://localhost:${PORT}  (run: npm run build in /client first)`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
