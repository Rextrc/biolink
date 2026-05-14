const express = require('express');
const router = express.Router();
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Inbound webhook (called by email routing service) ──────────
// Supports Mailgun, Postmark, and generic JSON formats
router.post('/inbound', express.json(), express.urlencoded({ extended: true }), (req, res) => {
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  if (process.env.EMAIL_WEBHOOK_SECRET && secret !== process.env.EMAIL_WEBHOOK_SECRET) {
    return res.status(403).send('Forbidden');
  }

  const b = req.body;

  // Normalize across Mailgun / Postmark / generic
  const from_email = b.sender || b.From || b.from_email || b.from || '';
  const from_name  = b.from_name || b.FromName || '';
  const to_email   = b.recipient || b.To || b.to_email || b.to || 'olik@olik.app';
  const subject    = b.subject || b.Subject || '(no subject)';
  const body_text  = b['body-plain'] || b.TextBody || b.text || b.body_text || '';
  const body_html  = b['body-html']  || b.HtmlBody || b.html || b.body_html || '';

  db.prepare('INSERT INTO emails (direction, from_email, from_name, to_email, subject, body_text, body_html) VALUES (?,?,?,?,?,?,?)')
    .run('in', from_email, from_name, to_email, subject, body_text, body_html);

  res.status(200).send('OK');
});

// ── Auth required for everything below ────────────────────────
router.use(adminAuth);

// List inbox or sent
router.get('/', (req, res) => {
  const dir = req.query.dir === 'sent' ? 'sent' : 'in';
  const emails = db.prepare('SELECT * FROM emails WHERE direction=? ORDER BY received_at DESC').all(dir);
  res.json(emails);
});

// Single email
router.get('/:id', (req, res) => {
  const email = db.prepare('SELECT * FROM emails WHERE id=?').get(req.params.id);
  if (!email) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE emails SET is_read=1 WHERE id=?').run(req.params.id);
  res.json(email);
});

// Send email
router.post('/send', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' });

  await resend.emails.send({
    from: 'olik <olik@olik.app>',
    to,
    subject,
    text: body,
  });

  db.prepare('INSERT INTO emails (direction, from_email, from_name, to_email, subject, body_text) VALUES (?,?,?,?,?,?)')
    .run('sent', 'olik@olik.app', 'olik', to, subject, body);

  res.json({ ok: true });
});

// Delete
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM emails WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Unread count
router.get('/meta/unread', (req, res) => {
  const count = db.prepare("SELECT COUNT(*) as c FROM emails WHERE direction='in' AND is_read=0").get().c;
  res.json({ count });
});

module.exports = router;
