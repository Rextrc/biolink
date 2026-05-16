const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const design = db.prepare('SELECT * FROM design WHERE user_id = ?').get(req.userId);
  res.json(design);
});

router.put('/', authMiddleware, (req, res) => {
  const fields = [
    'bg_type','bg_color','bg_gradient_start','bg_gradient_end','bg_gradient_dir','bg_image_url','bg_animated',
    'text_color','bio_color','btn_bg','btn_text','btn_border','btn_shape','btn_style','btn_hover',
    'font_heading','font_body','font_size','avatar_shape','avatar_border_color','avatar_border_size',
    'avatar_glow','avatar_glow_color','layout_avatar','layout_bio_align','link_spacing','preset_name',
    'social_icon_color', 'card_glow', 'card_glow_color', 'bg_video_url', 'bg_video_blur',
    'card_transparent'
  ];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.json({ success: true });
  const set = updates.map(f => `${f} = ?`).join(', ');
  const vals = updates.map(f => req.body[f]);
  db.prepare(`UPDATE design SET ${set} WHERE user_id = ?`).run(...vals, req.userId);
  res.json({ success: true });
});

module.exports = router;
