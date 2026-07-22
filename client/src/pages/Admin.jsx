import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getAuth } from '../utils/auth';
import { Users, Trash2, Shield, ShieldOff, KeyRound, ExternalLink, Radio, Copy, Plus, Save, Check, Mail, Download, Search, X, User, Music2 } from 'lucide-react';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';

/* ── Landing page defaults (kept in sync with Landing.jsx / utils/siteConfig.js) ── */
const DEFAULT_CFG = DEFAULT_SITE_CFG;

/* ── Theme tokens ──────────────────────────────────────────────────────── */
const ACCENT       = '#ff2222';
const ACCENT_SOFT  = '#ff6666';
const ACCENT_GLOW  = 'rgba(255,34,34,0.15)';
const ACCENT_FILL  = 'rgba(255,34,34,0.08)';
const ACCENT_BORD  = 'rgba(255,34,34,0.25)';

/* Module-scope (not defined inside Admin()) so React keeps the same component
   identity across renders — defining these inline in the render body made
   React remount the <input>/<textarea> on every keystroke, kicking focus out. */
const SInput = ({ label, value, onChange, rows, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    {rows ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
    )}
  </div>
);

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    <span style={{ fontSize: 12, color: '#fff', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</span>
  </div>
);

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [msg, setMsg]         = useState('');
  const [keys, setKeys]       = useState([]);
  const [tab, setTab]         = useState('users');
  const [genDuration, setGenDuration] = useState('');
  const [genCustom, setGenCustom]     = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [siteCfg, setSiteCfg]         = useState(DEFAULT_CFG);
  const [skillsText, setSkillsText]   = useState((DEFAULT_CFG.skills || []).join(', '));
  const [cfgSaved, setCfgSaved]       = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState(null);
  const [spotifyMsg, setSpotifyMsg]       = useState('');
  const [waitlist, setWaitlist]       = useState([]);
  const [wlSearch, setWlSearch]       = useState('');
  const [wlSort, setWlSort]           = useState('newest');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) return navigate('/login');
    load();
    loadSpotifyStatus();

    const params = new URLSearchParams(window.location.search);
    const spotify = params.get('spotify');
    if (spotify === 'connected') setSpotifyMsg('Spotify connected.');
    else if (spotify === 'error') setSpotifyMsg('Spotify connection failed — check server env vars and try again.');
    if (spotify) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function loadSpotifyStatus() {
    try { setSpotifyStatus(await api.admin.spotifyStatus()); } catch { setSpotifyStatus(null); }
  }

  async function load() {
    try {
      const [s, u, k, cfg, wl] = await Promise.all([
        api.admin.stats(), api.admin.users(), api.admin.keys(), api.admin.getSiteConfig(), api.admin.waitlist(),
      ]);
      setStats(s);
      setUsers(u);
      setKeys(k);
      setWaitlist(wl);
      if (cfg && Object.keys(cfg).length > 0) {
        const merged = { ...DEFAULT_CFG, ...cfg, links: { ...DEFAULT_CFG.links, ...(cfg.links || {}) } };
        setSiteCfg(merged);
        setSkillsText((merged.skills || []).join(', '));
      }
    } catch { navigate('/dashboard'); }
  }

  async function genKey() {
    const dur = genDuration === 'custom'
      ? (genCustom ? Number(genCustom) : null)
      : (genDuration !== '' ? Number(genDuration) : null);
    const { key } = await api.admin.genKey('', dur);
    setKeys(k => [{ key, id: Date.now(), used_by: null, created_at: new Date().toISOString(), duration_days: dur }, ...k]);
  }

  async function updateKeyDuration(id, val) {
    const duration_days = val === '' ? null : Number(val);
    await api.admin.updateKey(id, duration_days);
    setKeys(k => k.map(x => x.id === id ? { ...x, duration_days } : x));
  }

  async function saveExpiry(userId) {
    const val = expiryInput ? new Date(expiryInput).toISOString() : null;
    await api.admin.updateUserExpiry(userId, val);
    setDetail(d => ({ ...d, key_expires_at: val }));
  }

  async function deleteKey(id) {
    await api.admin.deleteKey(id);
    setKeys(k => k.filter(x => x.id !== id));
  }

  async function openUser(id) {
    setSelected(id); setPwInput(''); setMsg('');
    const d = await api.admin.user(id);
    setDetail(d);
    setExpiryInput(d.key_expires_at ? d.key_expires_at.slice(0, 10) : '');
  }

  async function deleteUser(id) {
    if (!confirm('Delete this operator and revoke their access? Cannot be undone.')) return;
    await api.admin.deleteUser(id);
    setSelected(null); setDetail(null);
    load();
  }

  async function toggleAdmin(id) {
    const res = await api.admin.toggleAdmin(id);
    setUsers(u => u.map(x => x.id === id ? { ...x, is_admin: res.is_admin ? 1 : 0 } : x));
    if (detail?.id === id) setDetail(d => ({ ...d, is_admin: res.is_admin ? 1 : 0 }));
  }

  async function resetPw(id) {
    if (!pwInput || pwInput.length < 6) return setMsg('Min 6 characters');
    await api.admin.resetPassword(id, pwInput);
    setMsg('Password reset.');
    setPwInput('');
  }

  async function saveSiteCfg() {
    await api.admin.saveSiteConfig(siteCfg);
    setCfgSaved(true);
    setTimeout(() => setCfgSaved(false), 2000);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0606', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${ACCENT_BORD}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Radio size={16} color={ACCENT} />
        <span style={{ fontWeight: 800, letterSpacing: '0.1em' }}>OLIK</span>
        <span style={{ color: '#333', margin: '0 4px' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: '0.08em' }}>God Mode</span>
        <button onClick={() => navigate('/dashboard')}
          style={{ marginLeft: 'auto', background: ACCENT_FILL, border: `1px solid ${ACCENT_BORD}`, color: ACCENT_SOFT, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Open HUD
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[['users', 'Operators'], ['keys', 'Invite Keys'], ['waitlist', 'Waitlist'], ['frontpage', 'Front Page']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                padding: '7px 18px', borderRadius: 8,
                border: `1px solid ${tab === id ? ACCENT : '#222'}`,
                background: tab === id ? ACCENT_FILL : 'transparent',
                color: tab === id ? ACCENT_SOFT : 'rgba(255,255,255,0.4)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            ['Total Operators', stats?.total_users],
            ['New Today',       stats?.new_today],
            ['Active Keys',     keys.filter(k => !k.used_by).length],
            ['Waitlist',        stats?.waitlist_count],
          ].map(([label, val]) => (
            <div key={label}
              style={{ flex: 1, minWidth: 100, background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{val ?? '—'}</div>
            </div>
          ))}
        </div>

        {/* Keys tab */}
        {tab === 'keys' && (
          <div style={{ background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={14} color={ACCENT} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Invite Keys</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {[['', '∞'], ['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1yr'], ['custom', '…']].map(([val, label]) => (
                  <button key={val} onClick={() => setGenDuration(val)}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: `1px solid ${genDuration === val ? ACCENT : '#2a2a2a'}`,
                      background: genDuration === val ? ACCENT_FILL : '#1a1a1a',
                      color: genDuration === val ? ACCENT_SOFT : 'rgba(255,255,255,0.4)',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {label}
                  </button>
                ))}
                {genDuration === 'custom' && (
                  <input value={genCustom} onChange={e => setGenCustom(e.target.value.replace(/\D/g, ''))} placeholder="days"
                    style={{ width: 52, background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                )}
                <button onClick={genKey}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_SOFT})`, border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  <Plus size={12} /> Generate
                </button>
              </div>
            </div>
            {keys.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No keys yet</div>}
            {keys.map(k => (
              <div key={k.id} style={{ padding: '12px 18px', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center', gap: 12 }}>
                <code style={{ flex: 1, fontSize: 13, color: k.used_by ? 'rgba(255,255,255,0.2)' : ACCENT_SOFT, letterSpacing: 2, textDecoration: k.used_by ? 'line-through' : 'none' }}>{k.key}</code>
                {!k.used_by ? (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[['', '∞'], ['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1yr']].map(([val, label]) => (
                      <button key={val} onClick={() => updateKeyDuration(k.id, val)}
                        style={{
                          padding: '3px 7px', borderRadius: 5,
                          border: `1px solid ${String(k.duration_days ?? '') === val ? ACCENT : '#222'}`,
                          background: String(k.duration_days ?? '') === val ? ACCENT_FILL : 'transparent',
                          color: String(k.duration_days ?? '') === val ? ACCENT_SOFT : 'rgba(255,255,255,0.3)',
                          fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{k.duration_days ? `${k.duration_days}d` : '∞'}</span>
                )}
                {k.used_by && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>@{k.used_by}</span>}
                {!k.used_by && (
                  <button onClick={() => navigator.clipboard?.writeText(k.key)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}>
                    <Copy size={12} />
                  </button>
                )}
                <button onClick={() => deleteKey(k.id)}
                  style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Front Page editor */}
        {tab === 'frontpage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
            <div style={{ background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} color={ACCENT} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Profile Card</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <SInput label="Avatar image URL (blank = monogram)" value={siteCfg.avatar_url || ''} onChange={v => setSiteCfg(c => ({ ...c, avatar_url: v }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <SInput label="Name" value={siteCfg.hero_name} onChange={v => setSiteCfg(c => ({ ...c, hero_name: v }))} />
                  <SInput label="Role" value={siteCfg.hero_role} onChange={v => setSiteCfg(c => ({ ...c, hero_role: v }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={!!siteCfg.verified}
                    onChange={e => setSiteCfg(c => ({ ...c, verified: e.target.checked }))}
                    style={{ width: 15, height: 15, accentColor: ACCENT, cursor: 'pointer' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Show verified badge next to name</span>
                </label>
                <SInput label="Status line (green dot)" value={siteCfg.hero_badge} onChange={v => setSiteCfg(c => ({ ...c, hero_badge: v }))} />
                <SInput label="Bio line" value={siteCfg.hero_sub} onChange={v => setSiteCfg(c => ({ ...c, hero_sub: v }))} rows={2} />
                <SInput label="Skills (comma separated)"
                  value={skillsText}
                  onChange={v => {
                    setSkillsText(v);
                    setSiteCfg(c => ({ ...c, skills: v.split(',').map(s => s.trim()).filter(Boolean) }));
                  }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    ['email',     'Email',     'you@example.com'],
                    ['github',    'GitHub',    'username or full URL'],
                    ['twitter',   'Twitter',   'username or full URL'],
                    ['linkedin',  'LinkedIn',  'username or full URL'],
                    ['instagram',   'Instagram',        'username or full URL'],
                    ['photography', 'Photography (IG)', 'username or full URL'],
                    ['youtube',   'YouTube',   'handle or full URL'],
                    ['twitch',    'Twitch',    'username or full URL'],
                    ['discord',   'Discord',   'invite code or full URL'],
                    ['website',   'Website',   'yourdomain.com'],
                  ].map(([key, label, placeholder]) => (
                    <SInput key={key} label={label} value={siteCfg.links?.[key] || ''} placeholder={placeholder}
                      onChange={v => setSiteCfg(c => ({ ...c, links: { ...c.links, [key]: v } }))} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  Leave any field blank to hide that icon on the card. For each field you can paste just your username/handle
                  (e.g. "olik") or a full URL — either works, the site fills in the right domain automatically.
                </span>
              </div>
            </div>

            <div style={{ background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music2 size={14} color={ACCENT} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Spotify</span>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  When connected, the card shows a "Now playing" row with live album art whenever you're actively
                  playing something on Spotify — it disappears automatically when you stop.
                </span>
                {spotifyMsg && (
                  <span style={{ fontSize: 12, color: spotifyMsg.includes('failed') ? '#ff6666' : '#34d399' }}>{spotifyMsg}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {spotifyStatus?.connected ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#34d399' }}>
                      <Check size={14} /> Connected
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Not connected</span>
                  )}
                  <a href={`/api/spotify/connect?token=${encodeURIComponent(getAuth().token || '')}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff',
                      background: '#1DB954', borderRadius: 9, padding: '8px 16px', textDecoration: 'none',
                    }}>
                    <Music2 size={13} /> {spotifyStatus?.connected ? 'Reconnect' : 'Connect Spotify'}
                  </a>
                </div>
                {spotifyStatus && !spotifyStatus.configured && (
                  <span style={{ fontSize: 11, color: 'rgba(255,180,60,0.85)' }}>
                    Server is missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REDIRECT_URI env vars — set
                    those in Railway before connecting.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={saveSiteCfg}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: cfgSaved ? 'rgba(52,211,153,0.15)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_SOFT})`,
                  border: cfgSaved ? '1px solid rgba(52,211,153,0.4)' : 'none',
                  color: cfgSaved ? '#34d399' : '#fff',
                  borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                {cfgSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
              </button>
              <a href="/" target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} /> Preview live site
              </a>
            </div>
          </div>
        )}

        {/* Waitlist tab */}
        {tab === 'waitlist' && (() => {
          const filtered = waitlist
            .filter(e => e.email.toLowerCase().includes(wlSearch.toLowerCase()))
            .sort((a, b) => wlSort === 'newest'
              ? new Date(b.created_at) - new Date(a.created_at)
              : new Date(a.created_at) - new Date(b.created_at));

          function copyAll() {
            navigator.clipboard?.writeText(filtered.map(e => e.email).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }

          function exportCsv() {
            const rows = [['id', 'email', 'signed_up_at'], ...filtered.map(e => [e.id, e.email, e.created_at])];
            const csv = rows.map(r => r.join(',')).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = `waitlist_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
          }

          async function deleteEntry(id) {
            await api.admin.deleteWaitlistEntry(id);
            setWaitlist(w => w.filter(e => e.id !== id));
            setStats(s => s ? { ...s, waitlist_count: Math.max(0, (s.waitlist_count || 1) - 1) } : s);
          }

          async function clearAll() {
            if (!confirm(`Delete all ${waitlist.length} waitlist entries? This cannot be undone.`)) return;
            await api.admin.clearWaitlist();
            setWaitlist([]);
            setStats(s => s ? { ...s, waitlist_count: 0, waitlist_today: 0 } : s);
          }

          return (
            <div style={{ maxWidth: 720 }}>
              <div style={{ background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Mail size={14} color={ACCENT} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Waitlist</span>
                  <span style={{ background: ACCENT_FILL, color: ACCENT_SOFT, borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>{waitlist.length}</span>
                  {stats?.waitlist_today > 0 && (
                    <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>+{stats.waitlist_today} today</span>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {/* Sort */}
                    {['newest', 'oldest'].map(s => (
                      <button key={s} onClick={() => setWlSort(s)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${wlSort === s ? ACCENT : '#2a2a2a'}`, background: wlSort === s ? ACCENT_FILL : '#1a1a1a', color: wlSort === s ? ACCENT_SOFT : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                        {s}
                      </button>
                    ))}
                    {/* Copy all */}
                    <button onClick={copyAll} disabled={filtered.length === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : '#2a2a2a'}`, background: copied ? 'rgba(52,211,153,0.1)' : '#1a1a1a', color: copied ? '#34d399' : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    {/* Export CSV */}
                    <button onClick={exportCsv} disabled={filtered.length === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#1a1a1a', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Download size={11} /> Export CSV
                    </button>
                    {/* Clear all */}
                    {waitlist.length > 0 && (
                      <button onClick={clearAll}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#f87171', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Trash2 size={11} /> Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div style={{ padding: '10px 16px', borderBottom: `1px solid #161616` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 12px' }}>
                    <Search size={12} color="rgba(255,255,255,0.3)" />
                    <input
                      value={wlSearch}
                      onChange={e => setWlSearch(e.target.value)}
                      placeholder="Search emails..."
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: 'inherit' }}
                    />
                    {wlSearch && (
                      <button onClick={() => setWlSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                    {wlSearch ? 'No matches' : 'No signups yet'}
                  </div>
                ) : (
                  filtered.map((e, i) => (
                    <div key={e.id} style={{ padding: '10px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #161616' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: ACCENT_FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ACCENT_SOFT, flexShrink: 0 }}>
                        {e.email[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                          {new Date(e.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button onClick={() => navigator.clipboard?.writeText(e.email)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                        <Copy size={12} />
                      </button>
                      <button onClick={() => deleteEntry(e.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* Users tab */}
        {tab === 'users' && (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* User list */}
            <div style={{ flex: 1, minWidth: 280, background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color={ACCENT} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>All Operators</span>
                <span style={{ marginLeft: 'auto', background: ACCENT_FILL, color: ACCENT_SOFT, borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>{users.length}</span>
              </div>
              {users.map(u => (
                <div key={u.id} onClick={() => openUser(u.id)}
                  style={{
                    padding: '10px 16px', borderBottom: '1px solid #161616', cursor: 'pointer',
                    background: selected === u.id ? ACCENT_FILL : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT_FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ACCENT_SOFT, flexShrink: 0 }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {u.username}
                      {u.is_admin ? <Shield size={10} color={ACCENT} /> : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No operators yet</div>}
            </div>

            {/* Detail panel */}
            {detail && (
              <div style={{ width: 320, background: '#111', border: `1px solid ${ACCENT_BORD}`, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ACCENT_BORD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>@{detail.username}</span>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Row label="Email"         value={detail.email} />
                  <Row label="Signup IP"     value={detail.signup_ip} mono />
                  <Row label="Last Login IP" value={detail.last_ip}   mono />
                  <Row label="Joined"        value={detail.created_at ? new Date(detail.created_at).toLocaleString() : null} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Access Expires</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="date" value={expiryInput} onChange={e => setExpiryInput(e.target.value)}
                        style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '5px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
                      <button onClick={() => saveExpiry(detail.id)}
                        style={{ background: ACCENT_FILL, border: `1px solid ${ACCENT_BORD}`, color: ACCENT_SOFT, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>
                        Save
                      </button>
                    </div>
                    {!expiryInput && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Lifetime (clear to remove expiry)</span>}
                  </div>

                  <hr style={{ border: 'none', borderTop: `1px solid ${ACCENT_BORD}` }} />

                  {/* Reset password */}
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Reset Password</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="New password"
                        style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                      <button onClick={() => resetPw(detail.id)}
                        style={{ background: ACCENT_FILL, border: `1px solid ${ACCENT_BORD}`, color: ACCENT_SOFT, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
                        <KeyRound size={13} />
                      </button>
                    </div>
                    {msg && <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>{msg}</div>}
                  </div>

                  <hr style={{ border: 'none', borderTop: `1px solid ${ACCENT_BORD}` }} />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleAdmin(detail.id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: ACCENT_FILL, border: `1px solid ${ACCENT_BORD}`, color: ACCENT_SOFT, borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                      {detail.is_admin ? <><ShieldOff size={12} /> Remove Admin</> : <><Shield size={12} /> Make Admin</>}
                    </button>
                    <button onClick={() => deleteUser(detail.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
