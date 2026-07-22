import { useState, useEffect, useRef } from 'react';
import { Github, Linkedin, Twitter, Mail, Instagram, Youtube, Twitch, MessageCircle, Globe } from 'lucide-react';
import { api } from '../utils/api';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";

/* Film-grain overlay, inlined so it costs no request */
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* Base URL each platform is prefixed with when the admin enters a bare
   username instead of a full link (e.g. "olik" -> "https://github.com/olik").
   A value that already looks like a URL (has a scheme) is left untouched. */
const SOCIAL_BASE = {
  github:    'https://github.com/',
  twitter:   'https://twitter.com/',
  linkedin:  'https://linkedin.com/in/',
  instagram: 'https://instagram.com/',
  youtube:   'https://youtube.com/@',
  twitch:    'https://twitch.tv/',
  discord:   'https://discord.gg/',
  website:   'https://',
};

function resolveSocialUrl(platform, raw) {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^@/, '');
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  const base = SOCIAL_BASE[platform];
  return base ? `${base}${v.replace(/^\/+/, '')}` : `https://${v}`;
}

/* Ember particles drifting up behind the card — fixed layout so it never reshuffles */
const EMBERS = [
  { l: 8,  s: 3, d: 0,    t: 13 }, { l: 16, s: 2, d: 4.2, t: 16 },
  { l: 24, s: 2, d: 1.5,  t: 11 }, { l: 33, s: 3, d: 6.1, t: 15 },
  { l: 41, s: 2, d: 2.8,  t: 12 }, { l: 52, s: 3, d: 0.9, t: 17 },
  { l: 60, s: 2, d: 5.3,  t: 10 }, { l: 68, s: 2, d: 3.4, t: 14 },
  { l: 76, s: 3, d: 7.2,  t: 12 }, { l: 84, s: 2, d: 1.1, t: 16 },
  { l: 91, s: 2, d: 4.8,  t: 11 }, { l: 47, s: 2, d: 8.5, t: 18 },
];

export default function Landing() {
  const [cfg, setCfg] = useState(DEFAULT_SITE_CFG);
  const [ready, setReady] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

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

  useEffect(() => {
    const onMove = (e) => {
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Normalize against half the viewport so the tilt stays gentle even
      // when the cursor is far from the card, then clamp to a sane max.
      const x = (e.clientX - cx) / (window.innerWidth / 2);
      const y = (e.clientY - cy) / (window.innerHeight / 2);
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      setTilt({ x: clamp(y) * -14, y: clamp(x) * 14 });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const skills = cfg.skills?.length ? cfg.skills : DEFAULT_SITE_CFG.skills;
  const links = cfg.links || DEFAULT_SITE_CFG.links;
  const mailHref = links.email ? `mailto:${links.email}` : undefined;

  const socials = [
    { key: 'github',    label: 'GitHub',    href: resolveSocialUrl('github', links.github),       Icon: Github },
    { key: 'twitter',   label: 'Twitter',   href: resolveSocialUrl('twitter', links.twitter),     Icon: Twitter },
    { key: 'linkedin',  label: 'LinkedIn',  href: resolveSocialUrl('linkedin', links.linkedin),   Icon: Linkedin },
    { key: 'instagram', label: 'Instagram', href: resolveSocialUrl('instagram', links.instagram), Icon: Instagram },
    { key: 'youtube',   label: 'YouTube',   href: resolveSocialUrl('youtube', links.youtube),     Icon: Youtube },
    { key: 'twitch',    label: 'Twitch',    href: resolveSocialUrl('twitch', links.twitch),       Icon: Twitch },
    { key: 'discord',   label: 'Discord',   href: resolveSocialUrl('discord', links.discord),     Icon: MessageCircle },
    { key: 'website',   label: 'Website',   href: resolveSocialUrl('website', links.website),     Icon: Globe },
    { key: 'email',     label: 'Email',     href: mailHref,                                       Icon: Mail },
  ].filter(s => s.href);

  return (
    <div style={{
      minHeight: '100dvh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '32px 18px',
    }}>
      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes haloPulse { 0%, 100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.12); } }
        @keyframes ember {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          8%   { opacity: 0.65; }
          60%  { opacity: 0.35; }
          100% { transform: translateY(-108vh) translateX(14px); opacity: 0; }
        }
        ::selection { background: #e01212; color: #fff; }

        .icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6); text-decoration: none;
          transition: transform 0.22s cubic-bezier(.22,1,.36,1), border-color 0.22s ease, color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }
        .icon-btn:hover {
          transform: translateY(-4px); color: #fff;
          border-color: rgba(255,51,51,0.65); background: rgba(255,40,40,0.08);
          box-shadow: 0 8px 24px -8px rgba(255,30,30,0.45);
        }
        a:focus-visible { outline: 2px solid #ff3333; outline-offset: 3px; border-radius: 50%; }
      `}</style>

      {/* Halo behind the card */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', width: 640, height: 640, zIndex: 0,
        transform: 'translate(-50%,-50%)', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,26,26,0.1) 0%, transparent 62%)',
        animation: 'haloPulse 9s ease-in-out infinite',
      }} />

      {/* Embers */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {EMBERS.map((p, i) => (
          <span key={i} style={{
            position: 'absolute', bottom: -12, left: `${p.l}%`, width: p.s, height: p.s,
            borderRadius: '50%', background: 'rgba(255,70,70,0.55)',
            boxShadow: `0 0 ${p.s * 3}px rgba(255,40,40,0.5)`,
            animation: `ember ${p.t}s linear ${p.d}s infinite`,
            opacity: 0,
          }} />
        ))}
      </div>

      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none', backgroundImage: NOISE, opacity: 0.03 }} />

      {/* Profile card */}
      <div
        ref={cardRef}
        style={{
          position: 'relative', zIndex: 2,
          width: 'min(100%, 400px)',
          background: 'rgba(13,13,15,0.6)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24,
          padding: '44px 34px 38px',
          textAlign: 'center',
          boxShadow: `0 30px 90px -20px rgba(0,0,0,0.85), 0 0 70px -28px rgba(255,30,30,0.4), inset 0 1px 0 rgba(255,255,255,0.06), ${tilt.y * 1.4}px ${-tilt.x * 1.4}px 40px -18px rgba(255,30,30,0.35)`,
          transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
          animation: ready ? 'cardIn 0.8s cubic-bezier(.22,1,.36,1) both' : 'none',
          opacity: ready ? undefined : 0,
        }}>

        {/* Sheen — a light source that moves opposite the tilt, like glare on glass */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none', zIndex: 1,
          background: `radial-gradient(480px circle at ${50 - tilt.y * 3.2}% ${50 + tilt.x * 3.2}%, rgba(255,255,255,0.09), transparent 55%)`,
          transition: 'background 0.15s ease-out',
        }} />

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid rgba(255,51,51,0.75)',
            boxShadow: '0 0 28px -4px rgba(255,30,30,0.55)',
            background: '#0b0b0d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {cfg.avatar_url ? (
              <img src={cfg.avatar_url} alt={cfg.hero_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, lineHeight: 1, color: '#fff', letterSpacing: '-0.03em' }}>
                {(cfg.hero_name || 'O')[0].toLowerCase()}<span style={{ color: '#ff3333' }}>.</span>
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 style={{
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, letterSpacing: '-0.03em',
          margin: 0, lineHeight: 1.1, textShadow: '0 0 26px rgba(255,255,255,0.22)',
        }}>
          {cfg.hero_name}<span style={{ color: '#ff3333' }}>.</span>
        </h1>

        {/* Role */}
        <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
          {cfg.hero_role}
        </div>

        {/* Status */}
        {cfg.hero_badge && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2fd575', boxShadow: '0 0 9px rgba(47,213,117,0.6)', animation: 'breathe 2.6s ease-in-out infinite' }} />
            <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.42)' }}>{cfg.hero_badge}</span>
          </div>
        )}

        {/* Bio */}
        {cfg.hero_sub && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, margin: '20px auto 0', maxWidth: '30ch' }}>
            {cfg.hero_sub}
          </p>
        )}

        {/* Divider */}
        <div style={{ height: 1, margin: '26px 10px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 8, rowGap: 6, fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.34)', letterSpacing: '0.03em', padding: '0 4px' }}>
            {skills.map((s, i) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {s}
                {i < skills.length - 1 && <span style={{ color: 'rgba(255,60,60,0.55)' }}>·</span>}
              </span>
            ))}
          </div>
        )}

        {/* Socials */}
        {socials.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 26 }}>
            {socials.map(({ key, label, href, Icon }) => (
              <a key={key} href={href} className="icon-btn" aria-label={label} title={label}
                target={key === 'email' ? undefined : '_blank'} rel="noreferrer">
                <Icon size={18} strokeWidth={1.8} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Watermark */}
      <div style={{
        position: 'fixed', bottom: 16, left: 0, right: 0, zIndex: 2, textAlign: 'center',
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.18)',
        pointerEvents: 'none',
      }}>
        © {new Date().getFullYear()} {(cfg.hero_name || 'olik').toLowerCase()}.app
      </div>
    </div>
  );
}
