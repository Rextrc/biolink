const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, (req, res) => {
  const { type, platform, title, url, position } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const result = db.prepare('INSERT INTO links (user_id, type, platform, title, url, position) VALUES (?, ?, ?, ?, ?, ?)').run(req.userId, type || 'custom', platform || null, title || '', url, position || 0);
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
  res.json(link);
});

router.put('/reorder', authMiddleware, (req, res) => {
  const { order } = req.body;
  const update = db.prepare('UPDATE links SET position = ? WHERE id = ? AND user_id = ?');
  const transaction = db.transaction((items) => {
    items.forEach(({ id, position }) => update.run(position, id, req.userId));
  });
  transaction(order);
  res.json({ success: true });
});

router.put('/:id', authMiddleware, (req, res) => {
  const { title, url, visible, platform, position } = req.body;
  const link = db.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!link) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE links SET title = ?, url = ?, visible = ?, platform = ?, position = ? WHERE id = ?')
    .run(title ?? link.title, url ?? link.url, visible ?? link.visible, platform ?? link.platform, position ?? link.position, link.id);
  res.json(db.prepare('SELECT * FROM links WHERE id = ?').get(link.id));
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
