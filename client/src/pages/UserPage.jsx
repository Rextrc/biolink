import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import ProfileCard from '../components/ProfileCard';
import Landing from './Landing';

export default function UserPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading'); // loading | found | notfound
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
      .catch(() => { if (!cancelled) setStatus('notfound'); });
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
  if (status === 'notfound') return <Landing />; // unknown slug → owner's main page
  return <ProfileCard cfg={cfg} ready={ready} viewCount={viewCount} brand={`olik.app/${slug}`} />;
}
