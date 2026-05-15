import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getAuth } from '../utils/auth';
import { Users, Trash2, Shield, ShieldOff, KeyRound, ExternalLink, Zap, Copy, Plus } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [msg, setMsg] = useState('');
  const [keys, setKeys] = useState([]);
  const [tab, setTab] = useState('users');
  const [genDuration, setGenDuration] = useState('');
  const [genCustom, setGenCustom] = useState('');
  const [expiryInput, setExpiryInput] = useState('');

  useEffect(() => {
    const auth = getAuth();
    if (!auth) return navigate('/login');
    load();
  }, []);

  async function load() {
    try {
      const [s, u, k] = await Promise.all([api.admin.stats(), api.admin.users(), api.admin.keys()]);
      setStats(s);
      setUsers(u);
      setKeys(k);
    } catch { navigate('/dashboard'); }
  }

  async function genKey() {
    const dur = genDuration === 'custom' ? (genCustom ? Number(genCustom) : null) : (genDuration !== '' ? Number(genDuration) : null);
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
    setSelected(id);
    setPwInput('');
    setMsg('');
    const d = await api.admin.user(id);
    setDetail(d);
    setExpiryInput(d.key_expires_at ? d.key_expires_at.slice(0, 10) : '');
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user and all their data? Cannot be undone.')) return;
    await api.admin.deleteUser(id);
    setSelected(null);
    setDetail(null);
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
    setMsg('Password reset!');
    setPwInput('');
  }

  const Row = ({ label, value, mono }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#fff', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Zap size={16} color="#6366f1" />
        <span style={{ fontWeight: 700 }}>olik</span>
        <span style={{ color: '#333', margin: '0 4px' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>God Mode</span>
        <button onClick={() => navigate('/dashboard')} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid #222', color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
          Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['users', 'Users'], ['keys', 'Invite Keys']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 18px', borderRadius: 8, border: `1px solid ${tab === id ? '#6366f1' : '#222'}`, background: tab === id ? 'rgba(99,102,241,0.12)' : 'transparent', color: tab === id ? '#818cf8' : 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[['Total Users', stats?.total_users], ['Total Links', stats?.total_links], ['New Today', stats?.new_today]].map(([label, val]) => (
            <div key={label} style={{ flex: 1, minWidth: 100, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{val ?? '—'}</div>
            </div>
          ))}
        </div>

        {/* Keys tab */}
        {tab === 'keys' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={14} color="#6366f1" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Invite Keys</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {[['', '∞'], ['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1yr'], ['custom', '…']].map(([val, label]) => (
                  <button key={val} onClick={() => setGenDuration(val)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${genDuration === val ? '#6366f1' : '#2a2a3e'}`, background: genDuration === val ? 'rgba(99,102,241,0.2)' : '#1a1a2e', color: genDuration === val ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {label}
                  </button>
                ))}
                {genDuration === 'custom' && (
                  <input value={genCustom} onChange={e => setGenCustom(e.target.value.replace(/\D/g, ''))} placeholder="days" style={{ width: 52, background: '#111', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                )}
                <button onClick={genKey} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={12} /> Generate
                </button>
              </div>
            </div>
            {keys.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No keys yet</div>}
            {keys.map(k => (
              <div key={k.id} style={{ padding: '12px 18px', borderBottom: '1px solid #161616', display: 'flex', alignItems: 'center', gap: 12 }}>
                <code style={{ flex: 1, fontSize: 13, color: k.used_by ? 'rgba(255,255,255,0.2)' : '#a5b4fc', letterSpacing: 2, textDecoration: k.used_by ? 'line-through' : 'none' }}>{k.key}</code>
                {!k.used_by ? (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[['', '∞'], ['7', '7d'], ['30', '30d'], ['90', '90d'], ['365', '1yr']].map(([val, label]) => (
                      <button key={val} onClick={() => updateKeyDuration(k.id, val)}
                        style={{ padding: '3px 7px', borderRadius: 5, border: `1px solid ${String(k.duration_days ?? '') === val ? '#6366f1' : '#222'}`, background: String(k.duration_days ?? '') === val ? 'rgba(99,102,241,0.2)' : 'transparent', color: String(k.duration_days ?? '') === val ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{k.duration_days ? `${k.duration_days}d` : '∞'}</span>
                )}
                {k.used_by && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>@{k.used_by}</span>}
                {!k.used_by && (
                  <button onClick={() => navigator.clipboard?.writeText(k.key)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}><Copy size={12} /></button>
                )}
                <button onClick={() => deleteKey(k.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* User list */}
          <div style={{ flex: 1, minWidth: 280, background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={14} color="#6366f1" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>All Users</span>
              <span style={{ marginLeft: 'auto', background: '#1a1a2e', color: '#6366f1', borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>{users.length}</span>
            </div>
            {users.map(u => (
              <div key={u.id} onClick={() => openUser(u.id)} style={{ padding: '10px 16px', borderBottom: '1px solid #161616', cursor: 'pointer', background: selected === u.id ? 'rgba(99,102,241,0.07)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {u.username}
                    {u.is_admin ? <Shield size={10} color="#6366f1" /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{u.link_count}L</div>
              </div>
            ))}
            {users.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No users</div>}
          </div>

          {/* Detail panel */}
          {detail && (
            <div style={{ width: 320, background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
              {/* Top bar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>@{detail.username}</span>
                <a href={`https://olik.app/${detail.username}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)' }}><ExternalLink size={13} /></a>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Info rows */}
                <Row label="Email" value={detail.email} />
                <Row label="Profile URL" value={`olik.app/${detail.username}`} mono />
                <Row label="Signup IP" value={detail.signup_ip} mono />
                <Row label="Last Login IP" value={detail.last_ip} mono />
                <Row label="Joined" value={detail.created_at ? new Date(detail.created_at).toLocaleString() : null} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Key Expires</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="date" value={expiryInput} onChange={e => setExpiryInput(e.target.value)} style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '5px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
                    <button onClick={() => saveExpiry(detail.id)} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#6366f1', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>Save</button>
                  </div>
                  {!expiryInput && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Lifetime (clear to remove expiry)</span>}
                </div>
                <Row label="Links" value={detail.links?.length ?? 0} />

                {/* Links list */}
                {detail.links?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>All Links</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
                      {detail.links.map(l => (
                        <div key={l.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: '#161616', borderRadius: 6, padding: '4px 8px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title || l.url}</span>
                          <a href={l.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', flexShrink: 0 }}><ExternalLink size={10} /></a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e' }} />

                {/* Reset password */}
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Reset Password</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="New password" style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                    <button onClick={() => resetPw(detail.id)} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#6366f1', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
                      <KeyRound size={13} />
                    </button>
                  </div>
                  {msg && <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>{msg}</div>}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e' }} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleAdmin(detail.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#6366f1', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
                    {detail.is_admin ? <><ShieldOff size={12} /> Remove Admin</> : <><Shield size={12} /> Make Admin</>}
                  </button>
                  <button onClick={() => deleteUser(detail.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
