import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { api } from '../utils/api';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';

const MONO = "'JetBrains Mono', 'Courier New', monospace";
const DISPLAY = "'Space Grotesk', Inter, sans-serif";

/* Film-grain overlay, inlined so it costs no request */
const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Section({ num, label, children }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(14px)',
      transition: 'opacity 0.9s cubic-bezier(.22,1,.36,1), transform 0.9s cubic-bezier(.22,1,.36,1)',
      padding: '72px 0 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 34 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: 'rgba(255,77,77,0.85)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {num} / {label}
        </span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>
      {children}
    </section>
  );
}

export default function Landing() {
  const [cfg, setCfg] = useState(DEFAULT_SITE_CFG);
  const [ready, setReady] = useState(false);

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

  const skills = cfg.skills?.length ? cfg.skills : DEFAULT_SITE_CFG.skills;
  const links = cfg.links || DEFAULT_SITE_CFG.links;
  const mailHref = links.email ? `mailto:${links.email}` : undefined;

  const socials = [
    { key: 'github',   label: 'GitHub',   href: links.github },
    { key: 'twitter',  label: 'Twitter',  href: links.twitter },
    { key: 'linkedin', label: 'LinkedIn', href: links.linkedin },
  ].filter(s => s.href);

  const rise = (i) => ready ? {
    opacity: 0,
    animation: `rise 0.9s cubic-bezier(.22,1,.36,1) ${0.08 + i * 0.09}s forwards`,
  } : { opacity: 0 };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        html { scroll-behavior: smooth; }
        ::selection { background: #e01212; color: #fff; }

        .lk { color: rgba(255,255,255,0.42); text-decoration: none; position: relative; transition: color 0.25s ease; }
        .lk::after { content: ''; position: absolute; left: 0; bottom: -3px; height: 1px; width: 100%; background: #ff4d4d; transform: scaleX(0); transform-origin: right; transition: transform 0.3s cubic-bezier(.22,1,.36,1); }
        .lk:hover { color: #fff; }
        .lk:hover::after { transform: scaleX(1); transform-origin: left; }

        .mail-cta { display: inline-flex; align-items: baseline; gap: 10px; color: #fff; text-decoration: none; }
        .mail-cta .txt { position: relative; }
        .mail-cta .txt::after { content: ''; position: absolute; left: 0; bottom: -6px; height: 2px; width: 100%; background: rgba(255,255,255,0.18); }
        .mail-cta .txt::before { content: ''; position: absolute; left: 0; bottom: -6px; height: 2px; width: 100%; background: #ff3333; transform: scaleX(0); transform-origin: left; transition: transform 0.45s cubic-bezier(.22,1,.36,1); z-index: 1; }
        .mail-cta:hover .txt::before { transform: scaleX(1); }
        .mail-cta .arr { transition: transform 0.3s cubic-bezier(.22,1,.36,1); color: rgba(255,255,255,0.35); }
        .mail-cta:hover .arr { transform: translate(4px, -4px); color: #ff4d4d; }

        .skill { font-family: ${MONO}; font-size: 13px; color: rgba(255,255,255,0.5); padding: 9px 15px; border: 1px solid rgba(255,255,255,0.09); border-radius: 7px; transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease; cursor: default; }
        .skill:hover { border-color: rgba(255,60,60,0.45); color: rgba(255,255,255,0.92); background: rgba(255,40,40,0.05); }

        a:focus-visible { outline: 2px solid #ff3333; outline-offset: 4px; border-radius: 2px; }
      `}</style>

      {/* Grain + single faint halo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none', backgroundImage: NOISE, opacity: 0.028 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(560px 380px at 72% -8%, rgba(255,30,30,0.075), transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 660, margin: '0 auto', padding: '0 28px' }}>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '30px 0', ...rise(0) }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            {(cfg.hero_name || 'Olik').toLowerCase()}<span style={{ color: '#ff3333' }}>.</span>
          </span>
          {mailHref && (
            <a href={mailHref} className="lk" style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em' }}>
              {links.email}
            </a>
          )}
        </header>

        {/* Hero */}
        <main style={{ padding: '96px 0 20px' }}>
          {cfg.hero_badge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 36, ...rise(1) }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2fd575', boxShadow: '0 0 10px rgba(47,213,117,0.55)', animation: 'breathe 2.6s ease-in-out infinite' }} />
              <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.38)', textTransform: 'lowercase' }}>
                {cfg.hero_badge}
              </span>
            </div>
          )}

          <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(52px, 11vw, 92px)', lineHeight: 1.02, letterSpacing: '-0.045em', margin: 0, ...rise(2) }}>
            {cfg.hero_name}<span style={{ color: '#ff3333' }}>.</span>
            <span style={{ display: 'block', color: 'rgba(255,255,255,0.22)' }}>{cfg.hero_role}.</span>
          </h1>

          <p style={{ fontSize: 16.5, color: 'rgba(255,255,255,0.52)', lineHeight: 1.85, maxWidth: '46ch', margin: '34px 0 0', ...rise(3) }}>
            {cfg.hero_sub}
          </p>

          {(mailHref || socials.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 44, flexWrap: 'wrap', ...rise(4) }}>
              {mailHref && (
                <a href={mailHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#fff', color: '#0a0a0a', textDecoration: 'none',
                  fontWeight: 600, fontSize: 14, padding: '13px 24px', borderRadius: 100,
                  transition: 'transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease',
                  boxShadow: '0 0 0 0 rgba(255,255,255,0)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px -12px rgba(255,255,255,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 0 0 rgba(255,255,255,0)'; }}>
                  Get in touch <ArrowUpRight size={15} strokeWidth={2.2} />
                </a>
              )}
              {socials.map(s => (
                <a key={s.key} href={s.href} target="_blank" rel="noreferrer" className="lk" style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.04em' }}>
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </main>

        {/* About */}
        <Section num="01" label="about">
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.58)', lineHeight: 1.95, maxWidth: '56ch', margin: 0 }}>
            {cfg.about_bio}
          </p>
        </Section>

        {/* Stack */}
        <Section num="02" label="stack">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {skills.map(s => <span key={s} className="skill">{s}</span>)}
          </div>
        </Section>

        {/* Contact */}
        <Section num="03" label="contact">
          {cfg.contact_line && (
            <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.85, maxWidth: '48ch', margin: '0 0 30px' }}>
              {cfg.contact_line}
            </p>
          )}
          {mailHref && (
            <a href={mailHref} className="mail-cta">
              <span className="txt" style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 'clamp(21px, 4.6vw, 32px)', letterSpacing: '-0.02em', wordBreak: 'break-all' }}>
                {links.email}
              </span>
              <ArrowUpRight className="arr" size={22} strokeWidth={2} />
            </a>
          )}
        </Section>

        {/* Footer */}
        <footer style={{ marginTop: 96, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '26px 0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.24)' }}>
            © {new Date().getFullYear()} {cfg.hero_name || 'Olik'} — built from scratch
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            {socials.map(s => (
              <a key={s.key} href={s.href} target="_blank" rel="noreferrer" className="lk" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em' }}>
                {s.label.toLowerCase()}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
