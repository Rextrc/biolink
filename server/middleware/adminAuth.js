const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin only' });
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};
