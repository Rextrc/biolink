import { useState } from 'react';
import { api } from '../utils/api';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";
const PANEL = '#111114';
const BORD = 'rgba(255,255,255,0.1)';
const FIELD = '#17171a';

/* Module-scope so React keeps input identity across renders (avoids the
   focus-loss bug where inline components remount the <input> per keystroke). */
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: FIELD, border: `1px solid ${BORD}`, borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
    </label>
  );
}
function Area({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ background: FIELD, border: `1px solid ${BORD}`, borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
    </label>
  );
}

const LINK_FIELDS = [
  ['email', 'Email', 'you@example.com'],
  ['github', 'GitHub', 'username or full URL'],
  ['twitter', 'Twitter', 'username or full URL'],
  ['linkedin', 'LinkedIn', 'username or full URL'],
  ['instagram', 'Instagram', 'username or full URL'],
  ['photography', 'Photography (IG)', 'username or full URL'],
  ['youtube', 'YouTube', 'handle or full URL'],
  ['twitch', 'Twitch', 'username or full URL'],
  ['discord', 'Discord', 'invite code or full URL'],
  ['website', 'Website', 'yourdomain.com'],
];

export default function Edit() {
  const [step, setStep] = useState('code'); // code | editing
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [slug, setSlug] = useState('');
  const [cfg, setCfg] = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [saved, setSaved] = useState(false);

  async function submitCode(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.verifyPageCode(code.trim());
      setSlug(res.slug);
      const data = res.data || {};
      setCfg(data);
      setSkillsText((data.skills || []).join(', '));
      setStep('editing');
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally { setLoading(false); }
  }

  async function save() {
    setLoading(true); setError('');
    try {
      await api.savePageByCode(code.trim(), cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally { setLoading(false); }
  }

  const wrap = {
    minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 18px',
  };

  if (step === 'code') {
    return (
      <div style={{ ...wrap, alignItems: 'center' }}>
        <form onSubmit={submitCode} style={{ width: 'min(100%, 360px)', background: PANEL, border: `1px solid ${BORD}`, borderRadius: 18, padding: 30, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', marginBottom: 6 }}>
            edit<span style={{ color: '#ff3333' }}>.</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 22px' }}>
            Enter the 5-digit code you were given to edit your page.
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            inputMode="numeric" placeholder="•••••" autoFocus
            style={{
              width: '100%', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10,
              padding: '14px', color: '#fff', fontSize: 26, letterSpacing: '0.5em', textAlign: 'center',
              outline: 'none', fontFamily: MONO, marginBottom: 16,
            }} />
          {error && <div style={{ fontSize: 12, color: '#ff6666', marginBottom: 14 }}>{error}</div>}
          <button type="submit" disabled={loading || code.length < 5}
            style={{
              width: '100%', background: code.length < 5 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#cc0000,#ff2222)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700,
              cursor: code.length < 5 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  const setField = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const setLink = (k, v) => setCfg(c => ({ ...c, links: { ...(c.links || {}), [k]: v } }));

  return (
    <div style={wrap}>
      <div style={{ width: 'min(100%, 560px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
            editing <span style={{ color: '#ff3333' }}>olik.app/{slug}</span>
          </div>
          <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>view live ↗</a>
        </div>

        <div style={{ background: PANEL, border: `1px solid ${BORD}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Avatar image URL (blank = monogram)" value={cfg.avatar_url || ''} onChange={v => setField('avatar_url', v)} placeholder="https://…" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Name" value={cfg.hero_name || ''} onChange={v => setField('hero_name', v)} />
            <Field label="Role" value={cfg.hero_role || ''} onChange={v => setField('hero_role', v)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={!!cfg.verified} onChange={e => setField('verified', e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#ff2222', cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Show verified badge next to name</span>
          </label>
          <Field label="Status line (green dot)" value={cfg.hero_badge || ''} onChange={v => setField('hero_badge', v)} />
          <Field label="Timezone (IANA, drives the live clock)" value={cfg.timezone || ''} onChange={v => setField('timezone', v)} placeholder="America/New_York" />
          <Area label="Bio line" value={cfg.hero_sub || ''} onChange={v => setField('hero_sub', v)} />
          <Field label="Skills (comma separated)" value={skillsText}
            onChange={v => { setSkillsText(v); setField('skills', v.split(',').map(s => s.trim()).filter(Boolean)); }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {LINK_FIELDS.map(([k, label, ph]) => (
              <Field key={k} label={label} value={cfg.links?.[k] || ''} onChange={v => setLink(k, v)} placeholder={ph} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Leave any link blank to hide that icon. Username or full URL both work.
          </span>
        </div>

        {error && <div style={{ fontSize: 13, color: '#ff6666' }}>{error}</div>}
        <button onClick={save} disabled={loading}
          style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
            background: saved ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,#cc0000,#ff2222)',
            border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none', color: saved ? '#34d399' : '#fff',
            borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
          }}>
          {saved ? '✓ Saved' : loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
