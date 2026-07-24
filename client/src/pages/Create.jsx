import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";
const PANEL = '#111114';
const BORD = 'rgba(255,255,255,0.1)';
const FIELD = '#17171a';
const ACCENT = '#ff2222';

export default function Create() {
  const [pages, setPages] = useState([]);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setPages(await api.admin.listPages()); } catch { setPages([]); }
  }

  async function create(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const page = await api.admin.createPage({ slug: slug.trim().toLowerCase(), name: name.trim() });
      setPages(p => [page, ...p]);
      setSlug(''); setName('');
    } catch (err) {
      setError(err.message || 'Could not create page');
    } finally { setLoading(false); }
  }

  async function remove(id, s) {
    if (!window.confirm(`Delete olik.app/${s}? This cannot be undone.`)) return;
    try { await api.admin.deletePage(id); setPages(p => p.filter(x => x.id !== id)); } catch {}
  }

  function copyCode(page) {
    navigator.clipboard?.writeText(page.edit_code).then(() => {
      setCopiedId(page.id);
      setTimeout(() => setCopiedId(null), 1600);
    }).catch(() => {});
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://olik.app';

  return (
    <div style={{ minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '40px 18px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em' }}>
            create<span style={{ color: ACCENT }}>.</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0', lineHeight: 1.6 }}>
            Spin up a page that looks just like yours at <span style={{ fontFamily: MONO }}>olik.app/&lt;slug&gt;</span>.
            Each gets a 5-digit code its owner enters at <span style={{ fontFamily: MONO }}>/edit</span> to fill in their content.
          </p>
        </div>

        {/* Create form */}
        <form onSubmit={create} style={{ background: PANEL, border: `1px solid ${BORD}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Slug (the URL)</span>
              <div style={{ display: 'flex', alignItems: 'center', background: FIELD, border: `1px solid ${BORD}`, borderRadius: 8, padding: '0 11px' }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>olik.app/</span>
                <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="jane" autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '9px 4px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: MONO }} />
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Display name (optional)</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane"
                style={{ background: FIELD, border: `1px solid ${BORD}`, borderRadius: 8, padding: '9px 11px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            </label>
          </div>
          {error && <div style={{ fontSize: 12, color: '#ff6666' }}>{error}</div>}
          <button type="submit" disabled={loading || !slug}
            style={{
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
              background: !slug ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg,#cc0000,${ACCENT})`,
              color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700,
              cursor: !slug ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}>
            <Plus size={15} /> Create page
          </button>
        </form>

        {/* Existing pages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2 }}>
            {pages.length} page{pages.length === 1 ? '' : 's'}
          </span>
          {pages.length === 0 && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', padding: '20px 0' }}>No pages yet.</div>
          )}
          {pages.map(page => (
            <div key={page.id} style={{ background: PANEL, border: `1px solid ${BORD}`, borderRadius: 12, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <a href={`/${page.slug}`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 14, color: '#fff', textDecoration: 'none' }}>
                  olik.app/{page.slug} <ExternalLink size={12} style={{ opacity: 0.5 }} />
                </a>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                  {(page.views || 0).toLocaleString()} visits
                </div>
              </div>
              <button onClick={() => copyCode(page)} title="Copy edit code"
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: FIELD, border: `1px solid ${BORD}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', color: '#fff' }}>
                <span style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.18em', fontWeight: 600 }}>{page.edit_code}</span>
                {copiedId === page.id ? <Check size={13} color="#34d399" /> : <Copy size={13} style={{ opacity: 0.6 }} />}
              </button>
              <button onClick={() => remove(page.id, page.slug)} title="Delete"
                style={{ background: 'transparent', border: `1px solid ${BORD}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: 'rgba(255,120,120,0.8)', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7, fontFamily: MONO }}>
          Give the owner their code + the URL <span style={{ color: 'rgba(255,255,255,0.5)' }}>{origin}/edit</span> — that page
          is hidden (no link anywhere), reachable only by typing it.
        </div>
      </div>
    </div>
  );
}
