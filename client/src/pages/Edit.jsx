import { useState } from 'react';
import { api } from '../utils/api';
import PageEditor from '../components/PageEditor';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";
const PANEL = '#111114';
const BORD = 'rgba(255,255,255,0.1)';
const FIELD = '#17171a';

const WRAP = {
  minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif',
  display: 'flex', justifyContent: 'center', padding: '48px 18px',
};

export default function Edit() {
  const [code, setCode] = useState('');
  const [page, setPage] = useState(null); // { slug, data } once unlocked
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitCode(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.verifyPageCode(code.trim().toUpperCase());
      setPage(res);
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally { setLoading(false); }
  }

  if (page) {
    return (
      <div style={{ ...WRAP, alignItems: 'flex-start' }}>
        <PageEditor slug={page.slug} initialData={page.data} code={code.trim().toUpperCase()} />
      </div>
    );
  }

  return (
    <div style={{ ...WRAP, alignItems: 'center' }}>
      <form onSubmit={submitCode} style={{ width: 'min(100%, 380px)', background: PANEL, border: `1px solid ${BORD}`, borderRadius: 18, padding: 30, textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', marginBottom: 6 }}>
          edit<span style={{ color: '#ff3333' }}>.</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 22px' }}>
          Enter the edit code for your page.
        </p>
        <input
          value={code}
          // Accept both the current 8-char codes and older 5-digit ones.
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="••••••••" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          style={{
            width: '100%', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10,
            padding: '14px', color: '#fff', fontSize: 22, letterSpacing: '0.3em', textAlign: 'center',
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
