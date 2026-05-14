import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getAuth } from '../utils/auth';
import { Users, Trash2, Shield, ShieldOff, KeyRound, ExternalLink, BarChart2, Zap } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const auth = getAuth();
    if (!auth) return navigate('/login');
    load();
  }, []);

  async function load() {
    try {
      const [s, u] = await Promise.all([api.admin.stats(), api.admin.users()]);
      setStats(s);
      setUsers(u);
    } catch { navigate('/dashboard'); }
  }

  async function openUser(id) {
    setSelected(id);
    setPwInput('');
    setMsg('');
    const d = await api.admin.user(id);
    setDetail(d);
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user and all their data? This cannot be undone.')) return;
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

  const stat = (label, val, icon) => (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{val ?? '—'}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Zap size={18} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 16 }}>olik</span>
        <span style={{ color: '#444', margin: '0 6px' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>God Mode</span>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #222', color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
            Dashboard
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {stat('Total Users', stats?.total_users)}
          {stat('Total Links', stats?.total_links)}
          {stat('New Today', stats?.new_today)}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* User list */}
          <div style={{ flex: 1, background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} color="#6366f1" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>All Users</span>
              <span style={{ marginLeft: 'auto', background: '#1e1e2e', color: '#6366f1', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{users.length}</span>
            </div>
            {users.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No users yet</div>
            )}
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => openUser(u.id)}
                style={{
                  padding: '12px 18px', borderBottom: '1px solid #161616', cursor: 'pointer',
                  background: selected === u.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s'
                }}
              >
                {u.avatar_url
                  ? <img src={u.avatar_url} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#6366f1', flexShrink: 0 }}>
                      {u.username[0].toUpperCase()}
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.username}
                    {u.is_admin ? <Shield size={11} color="#6366f1" /> : null}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flexShrink: 0 }}>{u.link_count} links</div>
              </div>
            ))}
          </div>

          {/* User detail panel */}
          {detail && (
            <div style={{ width: 340, background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>@{detail.username}</span>
                <a href={`/${detail.username}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }}><ExternalLink size={13} /></a>
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Info */}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>ID: {detail.id}</div>
                  <div>Email: {detail.email}</div>
                  <div>Joined: {new Date(detail.created_at).toLocaleDateString()}</div>
                  <div>Links: {detail.links?.length ?? 0}</div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e' }} />

                {/* Reset Password */}
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Reset Password</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={pwInput}
                      onChange={e => setPwInput(e.target.value)}
                      placeholder="New password"
                      style={{ flex: 1, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 12, outline: 'none' }}
                    />
                    <button onClick={() => resetPw(detail.id)} style={{ background: '#1e1e2e', border: '1px solid #2a2a2a', color: '#6366f1', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                      <KeyRound size={13} />
                    </button>
                  </div>
                  {msg && <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>{msg}</div>}
                </div>

                {/* Links */}
                {detail.links?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Links</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                      {detail.links.map(l => (
                        <div key={l.id} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: '#161616', borderRadius: 6, padding: '5px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.title || l.url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e' }} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => toggleAdmin(detail.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1e1e2e', border: '1px solid #2a2a3e', color: '#6366f1', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}
                  >
                    {detail.is_admin ? <><ShieldOff size={13} /> Remove Admin</> : <><Shield size={13} /> Make Admin</>}
                  </button>
                  <button
                    onClick={() => deleteUser(detail.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
