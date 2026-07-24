import { useState } from 'react';
import { api } from '../utils/api';
import PageEditor from '../components/PageEditor';
import { Check, Copy } from 'lucide-react';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";
const PANEL = '#111114';
const BORD = 'rgba(255,255,255,0.1)';
const FIELD = '#17171a';

const WRAP = {
  minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif',
  display: 'flex', justifyContent: 'center', padding: '48px 18px',
};

const btn = (enabled, loading) => ({
  width: '100%',
  background: enabled ? 'linear-gradient(135deg,#cc0000,#ff2222)' : 'rgba(255,255,255,0.08)',
  color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
});

export default function Claim() {
  const [step, setStep] = useState('key'); // key | slug | done
  const [inviteKey, setInviteKey] = useState('');
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(null); // { slug, edit_code, data }
  const [copied, setCopied] = useState(false);

  async function checkKey(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.checkInviteKey(inviteKey.trim().toUpperCase());
      setStep('slug');
    } catch (err) {
      setError(err.message || 'Invalid key');
    } finally { setLoading(false); }
  }

  async function claim(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.claimPage({ invite_key: inviteKey.trim().toUpperCase(), slug: slug.trim(), name: name.trim() });
      setPage(res);
      setStep('done');
    } catch (err) {
      setError(err.message || 'Could not create your page');
    } finally { setLoading(false); }
  }

  function copyCode() {
    navigator.clipboard?.writeText(page.edit_code)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })
      .catch(() => {});
  }

  /* ── Step 1: invite key ─────────────────────────────────────────── */
  if (step === 'key') {
    return (
      <div style={{ ...WRAP, alignItems: 'center' }}>
        <form onSubmit={checkKey} style={{ width: 'min(100%, 400px)', background: PANEL, border: `1px solid ${BORD}`, borderRadius: 18, padding: 30, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', marginBottom: 6 }}>
            claim<span style={{ color: '#ff3333' }}>.</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: '0 0 22px' }}>
            Got an invite key? Redeem it for your own page at <span style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.7)' }}>olik.app/you</span>.
          </p>
          <input
            value={inviteKey}
            onChange={e => setInviteKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            placeholder="OLIK-XXXX-XXXX-XXXX" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            style={{
              width: '100%', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10,
              padding: '13px', color: '#fff', fontSize: 14, letterSpacing: '0.08em', textAlign: 'center',
              outline: 'none', fontFamily: MONO, marginBottom: 16,
            }} />
          {error && <div style={{ fontSize: 12, color: '#ff6666', marginBottom: 14 }}>{error}</div>}
          <button type="submit" disabled={loading || inviteKey.length < 6} style={btn(inviteKey.length >= 6, loading)}>
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  /* ── Step 2: pick the URL ───────────────────────────────────────── */
  if (step === 'slug') {
    return (
      <div style={{ ...WRAP, alignItems: 'center' }}>
        <form onSubmit={claim} style={{ width: 'min(100%, 400px)', background: PANEL, border: `1px solid ${BORD}`, borderRadius: 18, padding: 30 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6, textAlign: 'center' }}>
            Pick your link
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: '0 0 20px', textAlign: 'center' }}>
            This is permanent — choose carefully.
          </p>

          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Your URL</span>
          <div style={{ display: 'flex', alignItems: 'center', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10, padding: '0 12px', margin: '5px 0 14px' }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>olik.app/</span>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 31))}
              placeholder="yourname" autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: '12px 4px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: MONO }} />
          </div>

          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Display name</span>
          <input
            value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            style={{ width: '100%', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', margin: '5px 0 18px' }} />

          {error && <div style={{ fontSize: 12, color: '#ff6666', marginBottom: 14 }}>{error}</div>}
          <button type="submit" disabled={loading || !slug} style={btn(!!slug, loading)}>
            {loading ? 'Creating…' : 'Create my page'}
          </button>
        </form>
      </div>
    );
  }

  /* ── Step 3: created — show the code, then the editor inline ────── */
  return (
    <div style={{ ...WRAP, alignItems: 'flex-start' }}>
      <div style={{ width: 'min(100%, 560px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 16, padding: 22 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            🎉 Your page is live
          </div>
          <a href={`/${page.slug}`} target="_blank" rel="noreferrer"
            style={{ fontFamily: MONO, fontSize: 15, color: '#fff', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
            olik.app/{page.slug} ↗
          </a>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 10 }}>
            <b style={{ color: '#fff' }}>Save this edit code.</b> It's the only way back into your
            page — go to <span style={{ fontFamily: MONO }}>olik.app/edit</span> and enter it any time you
            want to make changes. We can't recover it for you.
          </div>

          <button onClick={copyCode}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: FIELD, border: `1px solid ${BORD}`, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', color: '#fff' }}>
            <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.22em', fontWeight: 700 }}>{page.edit_code}</span>
            {copied ? <Check size={15} color="#34d399" /> : <Copy size={15} style={{ opacity: 0.6 }} />}
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Fill it in below — you're already signed in with your code.
        </div>

        <PageEditor slug={page.slug} initialData={page.data} code={page.edit_code} />
      </div>
    </div>
  );
}
