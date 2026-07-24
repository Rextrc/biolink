import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import ProfileCard from '../components/ProfileCard';
import Landing from './Landing';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";

function SuspendedCard({ slug }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 18px', textAlign: 'center',
    }}>
      <div style={{
        width: 'min(100%, 400px)', background: 'rgba(13,13,15,0.6)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: '44px 34px',
        boxShadow: '0 30px 90px -20px rgba(0,0,0,0.85)',
      }}>
        <div style={{ fontSize: 34, marginBottom: 14 }}>⛔</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
          Temporarily unavailable
        </div>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, margin: '12px auto 0', maxWidth: '30ch' }}>
          This page has been suspended. If it's yours, get in touch with the site owner.
        </p>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)', marginTop: 22 }}>
          olik.app/{slug}
        </div>
      </div>
    </div>
  );
}

export default function UserPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading'); // loading | found | notfound | suspended
  const [cfg, setCfg] = useState(null);
  const [viewCount, setViewCount] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setReady(false);
    api.getPage(slug)
      .then(page => {
        if (cancelled) return;
        // Use the page's own data verbatim — never merge the owner's personal
        // DEFAULT_SITE_CFG, or an unset field would leak the owner's content.
        // ProfileCard already handles any missing keys gracefully.
        setCfg(page.data || {});
        setStatus('found');
        setReady(true);

        const key = `olik_viewed_${slug}`;
        if (sessionStorage.getItem(key)) {
          setViewCount(page.views ?? 0);
        } else {
          sessionStorage.setItem(key, '1');
          api.recordPageView(slug).then(d => { if (!cancelled) setViewCount(d.count); })
            .catch(() => { if (!cancelled) setViewCount(page.views ?? 0); });
        }
      })
      .catch(err => {
        if (cancelled) return;
        // The API reports suspension explicitly so we can show the right card
        // rather than silently falling back to the owner's page.
        setStatus(/suspended/i.test(err?.message || '') ? 'suspended' : 'notfound');
      });
    return () => { cancelled = true; };
  }, [slug]);

  // Static tab title = the page owner's name.
  useEffect(() => {
    if (status !== 'found' || !cfg) return;
    const original = document.title;
    document.title = `${cfg.hero_name || slug} — olik.app`;
    return () => { document.title = original; };
  }, [status, cfg, slug]);

  if (status === 'loading') return <div style={{ minHeight: '100dvh', background: '#050505' }} />;
  if (status === 'suspended') return <SuspendedCard slug={slug} />;
  if (status === 'notfound') return <Landing />; // unknown slug → owner's main page
  return <ProfileCard cfg={cfg} ready={ready} viewCount={viewCount} brand={`olik.app/${slug}`} />;
}
