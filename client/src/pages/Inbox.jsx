import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { Zap, Inbox, Send, Trash2, Pencil, X, ArrowLeft, RefreshCw } from 'lucide-react';

const BG = '#0a0a0a';
const CARD = '#111';
const BORDER = 'rgba(255,255,255,0.07)';
const ACCENT = '#6366f1';

export default function InboxPage() {
  const navigate = useNavigate();
  const [dir, setDir] = useState('in');
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [dir]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch(`/inbox?dir=${dir}`);
      setEmails(data);
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  }

  async function open(email) {
    const data = await apiFetch(`/inbox/${email.id}`);
    setSelected(data);
    setEmails(e => e.map(x => x.id === email.id ? { ...x, is_read: 1 } : x));
  }

  async function del(id) {
    await apiFetch(`/inbox/${id}`, { method: 'DELETE' });
    setEmails(e => e.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function sendEmail() {
    if (!compose.to || !compose.subject || !compose.body) return setMsg('Fill all fields');
    setSending(true); setMsg('');
    try {
      await apiFetch('/inbox/send', { method: 'POST', body: JSON.stringify(compose) });
      setComposing(false);
      setCompose({ to: '', subject: '', body: '' });
      setMsg('Sent!');
      if (dir === 'sent') load();
    } catch (e) { setMsg(e.message); }
    finally { setSending(false); }
  }

  function reply(email) {
    setCompose({ to: email.from_email, subject: `Re: ${email.subject}`, body: `\n\n--- Original ---\n${email.body_text}` });
    setComposing(true);
  }

  const unread = emails.filter(e => e.direction === 'in' && !e.is_read).length;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zap size={16} color={ACCENT} />
        <span style={{ fontWeight: 700 }}>olik</span>
        <span style={{ color: '#333' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>olik@olik.app</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><RefreshCw size={13} /></button>
          <button onClick={() => setComposing(true)} style={{ background: ACCENT, border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Pencil size={13} /> Compose</button>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Dashboard</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 180, borderRight: `1px solid ${BORDER}`, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {[
            { id: 'in',   icon: Inbox,  label: 'Inbox', badge: unread },
            { id: 'sent', icon: Send,   label: 'Sent'  },
          ].map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => { setDir(id); setSelected(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: 'none', background: dir === id ? 'rgba(99,102,241,0.12)' : 'transparent', color: dir === id ? '#818cf8' : 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
              <Icon size={14} />
              {label}
              {badge > 0 && <span style={{ marginLeft: 'auto', background: ACCENT, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div style={{ width: 300, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', flexShrink: 0 }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Loading…</div>}
          {!loading && emails.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No emails</div>}
          {emails.map(e => (
            <div key={e.id} onClick={() => open(e)}
              style={{ padding: '14px 16px', borderBottom: `1px solid #161616`, cursor: 'pointer', background: selected?.id === e.id ? 'rgba(99,102,241,0.07)' : 'transparent', borderLeft: `3px solid ${!e.is_read && e.direction === 'in' ? ACCENT : 'transparent'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: e.is_read ? 400 : 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {e.direction === 'in' ? (e.from_name || e.from_email) : e.to_email}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: 8 }}>
                  {new Date(e.received_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: e.is_read ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{e.body_text?.slice(0, 60)}</div>
            </div>
          ))}
        </div>

        {/* Email detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: selected ? '24px 28px' : 0 }}>
          {!selected && !composing && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>
              Select an email to read
            </div>
          )}
          {selected && !composing && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selected.subject}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {selected.direction === 'in' ? `From: ${selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}` : `To: ${selected.to_email}`}
                    <span style={{ marginLeft: 16 }}>{new Date(selected.received_at).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selected.direction === 'in' && (
                    <button onClick={() => reply(selected)} style={{ background: 'rgba(99,102,241,0.1)', border: `1px solid rgba(99,102,241,0.3)`, color: '#818cf8', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Reply</button>
                  )}
                  <button onClick={() => del(selected.id)} style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, color: '#f87171', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, marginBottom: 20 }} />
              {selected.body_html ? (
                <iframe srcDoc={selected.body_html} style={{ width: '100%', border: 'none', minHeight: 400, background: '#fff', borderRadius: 10 }} title="email" />
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap' }}>{selected.body_text}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 24, zIndex: 100 }}>
          <div style={{ background: '#161616', border: `1px solid ${BORDER}`, borderRadius: 16, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>New Message</span>
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['To', 'to', 'email'], ['Subject', 'subject', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                  <input type={type} value={compose[key]} onChange={e => setCompose(c => ({ ...c, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#111', border: `1px solid #222`, borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Message</div>
                <textarea value={compose.body} onChange={e => setCompose(c => ({ ...c, body: e.target.value }))} rows={8}
                  style={{ width: '100%', background: '#111', border: `1px solid #222`, borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>
              {msg && <div style={{ fontSize: 12, color: msg === 'Sent!' ? '#6ee7b7' : '#f87171' }}>{msg}</div>}
              <button onClick={sendEmail} disabled={sending}
                style={{ background: ACCENT, border: 'none', color: '#fff', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1, fontFamily: 'inherit' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
