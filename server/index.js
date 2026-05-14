require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();

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
app.use('/api/upload',  require('./routes/upload'));

// Serve uploaded images
const UPLOAD_DIR = process.env.UPLOAD_DIR || require('path').join(__dirname, 'uploads');
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
  app.listen(PORT, () => {
    console.log(`✅  Server running on http://localhost:${PORT}`);
    console.log(`   Dev client : http://localhost:5173  (run: npm run dev:client)`);
    console.log(`   Prod bundle: http://localhost:${PORT}  (run: npm run build in /client first)`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
