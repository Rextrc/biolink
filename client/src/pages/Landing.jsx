import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';
import ProfileCard from '../components/ProfileCard';

export default function Landing() {
  const [cfg, setCfg] = useState(DEFAULT_SITE_CFG);
  const [ready, setReady] = useState(false);
  const [viewCount, setViewCount] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  useEffect(() => {
    api.getSiteConfig()
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setCfg(c => ({ ...c, ...data, links: { ...c.links, ...(data.links || {}) } }));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Count once per tab session — a refresh or client-side nav back to "/"
  // shouldn't inflate the number, so it reads as visits, not page loads.
  useEffect(() => {
    const already = sessionStorage.getItem('olik_viewed');
    const req = already ? api.getViewCount() : api.recordView();
    req.then(d => setViewCount(d.count)).catch(() => {});
    if (!already) sessionStorage.setItem('olik_viewed', '1');
  }, []);

  // Poll Spotify now-playing (owner's account only). The widget only renders
  // when isPlaying is true, so it silently appears/disappears with the music.
  useEffect(() => {
    let cancelled = false;
    const poll = () => api.getNowPlaying().then(d => { if (!cancelled) setNowPlaying(d); }).catch(() => {});
    poll();
    const t = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Rotating browser-tab title: o -> l -> i -> k -> loop, 0.5s each.
  // Pauses on a static "OLIK" while the tab isn't the active one.
  useEffect(() => {
    const original = document.title;
    const letters = ['o', 'l', 'i', 'k'];
    let i = 0;
    let intervalId = null;

    const start = () => {
      i = 0;
      document.title = letters[0];
      intervalId = setInterval(() => {
        i = (i + 1) % letters.length;
        document.title = letters[i];
      }, 500);
    };
    const stop = () => { clearInterval(intervalId); intervalId = null; };

    const onVisibility = () => {
      if (document.hidden) { stop(); document.title = 'OLIK'; }
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      document.title = original;
    };
  }, []);

  return <ProfileCard cfg={cfg} ready={ready} viewCount={viewCount} nowPlaying={nowPlaying} brand="olik.app" />;
}
