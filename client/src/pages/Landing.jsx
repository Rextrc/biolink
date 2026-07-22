import { useState, useEffect } from 'react';
import { ArrowRight, Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { api } from '../utils/api';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cfg, setCfg] = useState(DEFAULT_SITE_CFG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onMouse = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('mousemove', onMouse);
    return () => window.removeEventListener('mousemove', onMouse);
  }, []);

  useEffect(() => {
    api.getSiteConfig()
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setCfg(c => ({ ...c, ...data, links: { ...c.links, ...(data.links || {}) } }));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const skills = cfg.skills?.length ? cfg.skills : DEFAULT_SITE_CFG.skills;
  const links  = cfg.links || DEFAULT_SITE_CFG.links;
  const mailHref = links.email ? `mailto:${links.email}` : undefined;

  const socials = [
    { key: 'github',   href: links.github,   icon: Github,   label: 'GitHub' },
    { key: 'linkedin', href: links.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { key: 'twitter',  href: links.twitter,  icon: Twitter,  label: 'Twitter' },
    { key: 'email',    href: mailHref,       icon: Mail,     label: 'Email' },
  ].filter(s => s.href);

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes softPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        .rise { opacity: 0; animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1.2) forwards; }
        .btn { transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease; }
        .btn:hover { transform: translateY(-2px); }
        .chip { transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease; }
        .chip:hover { border-color: rgba(255,60,60,0.5); color: #fff; }
        .iconlink { transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease; }
        .iconlink:hover { transform: translateY(-2px); border-color: rgba(255,60,60,0.45); color: #fff; }
      `}</style>

      {/* Calm background — two soft orbs + a few drifting particles */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,0,0,0.09) 0%, transparent 70%)', top: -220, left: -180, transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -24}px)`, transition: 'transform 0.25s ease-out' }} />
        <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,0,0,0.07) 0%, transparent 70%)', bottom: -160, right: -120, transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 20}px)`, transition: 'transform 0.25s ease-out' }} />
      </div>

      {/* Nav — just the name */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 32px', maxWidth: 860, margin: '0 auto' }}>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.04em' }}>
          {cfg.hero_name || 'Olik'}<span style={{ color: '#ff3333' }}>.</span>
        </span>
        {mailHref && (
          <a href={mailHref} className="btn" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px' }}>
            Contact
          </a>
        )}
      </nav>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '70px 32px 40px' }}>
        {cfg.hero_badge && (
          <div className={loaded ? 'rise' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,0,0,0.08)', border: '1px solid rgba(200,0,0,0.22)', borderRadius: 100, padding: '6px 15px', fontSize: 12, color: 'rgba(255,160,160,0.85)', marginBottom: 30 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#33d17a', display: 'inline-block', animation: 'softPulse 2.4s infinite' }} />
            {cfg.hero_badge}
          </div>
        )}

        <h1 className={loaded ? 'rise' : ''} style={{ fontSize: 'clamp(44px,9vw,80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.05em', margin: 0, animationDelay: '0.05s' }}>
          <span style={{ display: 'block' }}>{cfg.hero_name}</span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg, #ff4444 0%, #ff8888 55%, #ffbbbb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {cfg.hero_role}
          </span>
        </h1>

        <p className={loaded ? 'rise' : ''} style={{ fontSize: 17, color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, maxWidth: 520, marginTop: 26, animationDelay: '0.1s' }}>
          {cfg.hero_sub}
        </p>

        {socials.length > 0 && (
          <div className={loaded ? 'rise' : ''} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 34, animationDelay: '0.15s' }}>
            {mailHref && (
              <a href={mailHref} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '13px 26px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(200,0,0,0.35)' }}>
                Get in touch <ArrowRight size={15} />
              </a>
            )}
            {socials.filter(s => s.key !== 'email').map(({ key, href, icon: Icon, label }) => (
              <a key={key} href={href} target="_blank" rel="noreferrer" className="iconlink" aria-label={label} title={label}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                <Icon size={17} />
              </a>
            ))}
          </div>
        )}
      </main>

      {/* Divider */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,60,60,0.25), transparent)' }} />
      </div>

      {/* About */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '56px 32px 40px' }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ff5555', marginBottom: 22 }}>About</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.9, maxWidth: 560, margin: 0 }}>
          {cfg.about_bio}
        </p>
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 30 }}>
            {skills.map(s => (
              <span key={s} className="chip" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 13px' }}>{s}</span>
            ))}
          </div>
        )}
      </section>

      {/* Contact */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '20px 32px 90px' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,60,60,0.25), transparent)', marginBottom: 40 }} />
        <h2 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0 }}>
          Say hello<span style={{ color: '#ff3333' }}>.</span>
        </h2>
        {cfg.contact_line && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 440, marginTop: 14 }}>
            {cfg.contact_line}
          </p>
        )}
        {mailHref && (
          <a href={mailHref} className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(200,0,0,0.35)' }}>
            {links.email} <ArrowRight size={15} />
          </a>
        )}
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '0 32px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} {cfg.hero_name || 'Olik'}</span>
        <div style={{ display: 'flex', gap: 14 }}>
          {socials.map(({ key, href, label }) => (
            <a key={key} href={href} target={key === 'email' ? undefined : '_blank'} rel="noreferrer" className="btn"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
