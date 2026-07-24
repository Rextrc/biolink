import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Trash2, Copy, Check, ExternalLink, Ban, RotateCcw, BarChart3 } from 'lucide-react';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";
const PANEL = '#111114';
const BORD = 'rgba(255,255,255,0.1)';
const FIELD = '#17171a';
const ACCENT = '#ff2222';
const ACCENT_FILL = 'rgba(255,34,34,0.12)';

/* Module scope so it isn't remounted on every Create() render. */
function Bars({ rows, empty }) {
  if (!rows?.length) return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{empty}</div>;
  const max = Math.max(...rows.map(r => r.c)) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)', width: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(r.c / max) * 100}%`, height: '100%', background: ACCENT, opacity: 0.75, borderRadius: 3 }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 34, textAlign: 'right' }}>{r.c}</span>
        </div>
      ))}
    </div>
  );
}

function Stats({ data }) {
  if (!data) return <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingTop: 14 }}>Loading…</div>;
  if (data.error) return <div style={{ fontSize: 12, color: '#ff6666', paddingTop: 14 }}>Couldn't load traffic.</div>;

  const countries = (data.countries || []).map(r => ({ label: r.country, c: r.c }));
  const referrers = [
    ...(data.referrers || []).map(r => ({ label: r.referrer, c: r.c })),
    ...(data.direct ? [{ label: 'direct / none', c: data.direct }] : []),
  ].sort((a, b) => b.c - a.c);

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORD}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
        {data.window.toLocaleString()} visits in the last {data.days} days · {data.total.toLocaleString()} all time
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 7 }}>Countries</div>
        <Bars rows={countries} empty="No country data yet." />
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 7 }}>Referrers</div>
        <Bars rows={referrers} empty="No visits yet." />
      </div>
    </div>
  );
}

export default function Create() {
  const [pages, setPages] = useState([]);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [openStats, setOpenStats] = useState(null);
  const [stats, setStats] = useState({});

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

  async function toggleSuspend(page) {
    const next = page.suspended ? 0 : 1;
    if (next && !window.confirm(`Suspend olik.app/${page.slug}? It'll show an "unavailable" card and its owner won't be able to edit it.`)) return;
    try {
      await api.admin.setPageSuspended(page.id, !!next);
      setPages(p => p.map(x => x.id === page.id ? { ...x, suspended: next } : x));
    } catch {}
  }

  async function toggleStats(slug) {
    if (openStats === slug) { setOpenStats(null); return; }
    setOpenStats(slug);
    if (!stats[slug]) {
      try {
        const data = await api.admin.pageAnalytics(slug);
        setStats(s => ({ ...s, [slug]: data }));
      } catch {
        setStats(s => ({ ...s, [slug]: { error: true } }));
      }
    }
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
            <div key={page.id} style={{ background: PANEL, border: `1px solid ${page.suspended ? 'rgba(255,140,60,0.35)' : BORD}`, borderRadius: 12, padding: '13px 15px', opacity: page.suspended ? 0.75 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <a href={`/${page.slug}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 14, color: '#fff', textDecoration: 'none' }}>
                    olik.app/{page.slug} <ExternalLink size={12} style={{ opacity: 0.5 }} />
                  </a>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                    {(page.views || 0).toLocaleString()} visits
                    {page.suspended ? <span style={{ color: 'rgba(255,150,70,0.9)' }}> · suspended</span> : null}
                  </div>
                </div>
                <button onClick={() => toggleStats(page.slug)} title="Traffic"
                  style={{ background: openStats === page.slug ? ACCENT_FILL : 'transparent', border: `1px solid ${BORD}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex' }}>
                  <BarChart3 size={15} />
                </button>
                <button onClick={() => copyCode(page)} title="Copy edit code"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: FIELD, border: `1px solid ${BORD}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', color: '#fff' }}>
                  <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', fontWeight: 600 }}>{page.edit_code}</span>
                  {copiedId === page.id ? <Check size={13} color="#34d399" /> : <Copy size={13} style={{ opacity: 0.6 }} />}
                </button>
                <button onClick={() => toggleSuspend(page)} title={page.suspended ? 'Restore' : 'Suspend'}
                  style={{ background: 'transparent', border: `1px solid ${BORD}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: page.suspended ? '#34d399' : 'rgba(255,170,80,0.85)', display: 'flex' }}>
                  {page.suspended ? <RotateCcw size={15} /> : <Ban size={15} />}
                </button>
                <button onClick={() => remove(page.id, page.slug)} title="Delete"
                  style={{ background: 'transparent', border: `1px solid ${BORD}`, borderRadius: 9, padding: 8, cursor: 'pointer', color: 'rgba(255,120,120,0.8)', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>

              {openStats === page.slug && <Stats data={stats[page.slug]} />}
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
