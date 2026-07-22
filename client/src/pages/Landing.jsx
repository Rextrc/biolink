import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Terminal, Code2, Server, Database, Cloud, Palette, GitBranch, Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { getAuth } from '../utils/auth';
import { api } from '../utils/api';
import { DEFAULT_SITE_CFG } from '../utils/siteConfig';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function CountUp({ target, suffix = '', active }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / 60;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [active, target]);
  return <>{val.toLocaleString()}{suffix}</>;
}

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01';
function GlitchWord({ from, to }) {
  const [text, setText] = useState(from);
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    setText(from);
    const start = setTimeout(() => {
      setGlitching(true);
      let iter = 0;
      const interval = setInterval(() => {
        setText(to.split('').map((char, i) => {
          if (char === ' ') return ' ';
          if (i < iter) return to[i];
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }).join(''));
        if (iter >= to.length) { setText(to); setGlitching(false); clearInterval(interval); }
        iter += 0.4;
      }, 40);
      return () => clearInterval(interval);
    }, 1400);
    return () => clearTimeout(start);
  }, [from, to]);
  return (
    <span style={{ display: 'block', marginBottom: 8, fontFamily: glitching ? 'monospace' : 'inherit', letterSpacing: glitching ? '-0.02em' : '-0.05em', transition: 'letter-spacing 0.4s', color: glitching ? '#fca5a5' : '#fff' }}>
      {text}
    </span>
  );
}

function MagneticButton({ children, style, ...props }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setOffset({ x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.28 });
  };
  const onLeave = () => setOffset({ x: 0, y: 0 });
  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ ...style, transform: `translate(${offset.x}px, ${offset.y}px)`, transition: offset.x === 0 && offset.y === 0 ? 'transform 0.5s cubic-bezier(.22,.68,0,1.2)' : 'transform 0.08s ease-out' }}
      {...props}>
      {children}
    </button>
  );
}

/* Fake code editor preview card — dev-flavored replacement for the old HUD map card */
function CodeCard({ name, role }) {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 600);
    return () => clearInterval(t);
  }, []);

  const stack = ['React', 'Node', 'Postgres'];

  return (
    <div style={{
      width: 280, borderRadius: 12, background: 'rgba(8,0,0,0.97)',
      border: '1px solid rgba(255,26,26,0.4)',
      boxShadow: '0 0 40px rgba(255,26,26,0.15), 0 20px 60px rgba(0,0,0,0.8)',
      fontFamily: "'Courier New', monospace", overflow: 'hidden',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid rgba(255,26,26,0.2)', background: 'linear-gradient(135deg, #0a0000 0%, #110000 100%)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#27c93f' }} />
        <span style={{ marginLeft: 6, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>olik.dev</span>
      </div>

      {/* Code body */}
      <div style={{ padding: '14px 16px', fontSize: 11, lineHeight: 1.85 }}>
        <div><span style={{ color: '#ff6666' }}>const</span> <span style={{ color: '#7dd3fc' }}>dev</span> <span style={{ color: 'rgba(255,255,255,0.5)' }}>=</span> <span style={{ color: 'rgba(255,255,255,0.5)' }}>{'{'}</span></div>
        <div style={{ paddingLeft: 16 }}><span style={{ color: '#ffaaaa' }}>name</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span> <span style={{ color: '#a3e635' }}>"{name}"</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>,</span></div>
        <div style={{ paddingLeft: 16 }}><span style={{ color: '#ffaaaa' }}>role</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span> <span style={{ color: '#a3e635' }}>"{role}"</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>,</span></div>
        <div style={{ paddingLeft: 16 }}><span style={{ color: '#ffaaaa' }}>stack</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span> <span style={{ color: 'rgba(255,255,255,0.5)' }}>[</span><span style={{ color: '#a3e635' }}>{stack.map(s => `"${s}"`).join(', ')}</span><span style={{ color: 'rgba(255,255,255,0.5)' }}>]</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>,</span></div>
        <div style={{ paddingLeft: 16 }}><span style={{ color: '#ffaaaa' }}>status</span><span style={{ color: 'rgba(255,255,255,0.4)' }}>:</span> <span style={{ color: '#a3e635' }}>"shipping"</span><span style={{ opacity: blink ? 1 : 0, color: '#ff4444' }}>▍</span></div>
        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>{'};'}</span></div>
      </div>

      {/* Footer status bar */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,26,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#34d399', letterSpacing: '0.1em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
          AVAILABLE FOR WORK
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>v1.0</span>
      </div>
    </div>
  );
}

function Feature3D({ icon, title, desc, accent, delay, visible }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ x: (y - 0.5) * -10, y: (x - 0.5) * 10 });
    setGlow({ x: x * 100, y: y * 100 });
  };
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(32px)', transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`, perspective: 700 }}>
      <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.02 : 1})`,
          transition: hovered ? 'transform 0.08s ease-out, box-shadow 0.3s' : 'transform 0.5s ease-out, box-shadow 0.3s',
          transformStyle: 'preserve-3d',
          background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,${hovered ? 0.1 : 0.06})`,
          borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden', cursor: 'default',
          boxShadow: hovered ? `0 24px 48px rgba(0,0,0,0.45), 0 0 0 1px ${accent}25` : '0 4px 20px rgba(0,0,0,0.2)',
        }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${accent}1a, transparent 65%)` }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, opacity: hovered ? 1 : 0.25, transition: 'opacity 0.3s' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{icon}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: '-0.02em' }}>{title}</div>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.72 }}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

const SKILL_AREAS = [
  { key: 'frontend', icon: <Code2 size={18} color="#ff4444" />,     title: 'Frontend Engineering', desc: 'React, TypeScript, and pixel-tight UI — built to feel fast and hold up under real use.', accent: '#ff2222' },
  { key: 'backend',  icon: <Server size={18} color="#1a8cff" />,    title: 'Backend & APIs',       desc: 'Node and Python services, REST and realtime, designed to scale without falling over.', accent: '#1a8cff' },
  { key: 'data',     icon: <Database size={18} color="#ff8800" />,  title: 'Databases',            desc: 'Schema design, query tuning, and data models that stay sane as the product grows.', accent: '#ff8800' },
  { key: 'cloud',    icon: <Cloud size={18} color="#34d399" />,     title: 'Cloud & DevOps',        desc: 'CI/CD, containers, and deploys that just work — from a single VM to autoscaling infra.', accent: '#10b981' },
  { key: 'design',   icon: <Palette size={18} color="#ff6666" />,   title: 'UI/UX & Design',        desc: 'Interfaces that look considered — motion, spacing, and detail treated as first-class.', accent: '#ff4444' },
  { key: 'oss',      icon: <GitBranch size={18} color="#a78bfa" />, title: 'Open Source',            desc: 'I ship in the open when I can, and read other people\'s code even when I don\'t have to.', accent: '#8b5cf6' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isLoggedIn } = getAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cfg, setCfg] = useState(DEFAULT_SITE_CFG);

  const [heroRef,  heroVisible]  = useInView(0.1);
  const [featRef,  featVisible]  = useInView(0.1);
  const [statsRef, statsVisible] = useInView(0.3);
  const [aboutRef, aboutVisible] = useInView(0.2);
  const [ctaRef,   ctaVisible]   = useInView(0.2);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse  = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMouse); };
  }, []);

  useEffect(() => {
    api.getSiteConfig().then(data => {
      if (data && Object.keys(data).length > 0) {
        setCfg(c => ({ ...c, ...data, links: { ...c.links, ...(data.links || {}) } }));
      }
    }).catch(() => {});
  }, []);

  const skills = cfg.skills?.length ? cfg.skills : DEFAULT_SITE_CFG.skills;
  const stats  = cfg.stats?.length  ? cfg.stats  : DEFAULT_SITE_CFG.stats;
  const links  = cfg.links || DEFAULT_SITE_CFG.links;
  const mailHref = links.email ? `mailto:${links.email}` : undefined;

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatA { 0%,100% { transform: translateY(0px) rotate(0deg); } 33% { transform: translateY(-14px) rotate(1.5deg); } 66% { transform: translateY(-7px) rotate(-1deg); } }
        @keyframes floatB { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-22px); } }
        @keyframes spinRing { from { transform: rotateX(72deg) rotate(0deg); } to { transform: rotateX(72deg) rotate(360deg); } }
        @keyframes spinRingB { from { transform: rotateX(60deg) rotateY(30deg) rotate(0deg); } to { transform: rotateX(60deg) rotateY(30deg) rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .feat-ring  { animation: spinRing  12s linear infinite; }
        .feat-ring-b{ animation: spinRingB 18s linear infinite; }
      `}</style>

      {/* Parallax orb background — red toned */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,0,0,0.1) 0%, transparent 70%)', top: -200, left: -200, transform: `translate(${mousePos.x * -45}px, ${mousePos.y * -35 + scrollY * 0.07}px)`, transition: 'transform 0.18s ease-out' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,30,30,0.07) 0%, transparent 70%)', top: '15%', right: -100, transform: `translate(${mousePos.x * 35}px, ${mousePos.y * 28 - scrollY * 0.1}px)`, transition: 'transform 0.18s ease-out', filter: 'blur(10px)' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,140,255,0.06) 0%, transparent 70%)', top: '55%', left: '15%', transform: `translate(${mousePos.x * -22}px, ${mousePos.y * -18 - scrollY * 0.05}px)`, transition: 'transform 0.22s ease-out', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,0,0,0.08) 0%, transparent 70%)', bottom: -80, right: '5%', transform: `translate(${mousePos.x * 28}px, ${mousePos.y * 22 - scrollY * 0.06}px)`, transition: 'transform 0.18s ease-out' }} />
      </div>

      {/* Floating particles */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {[{x:'12%',y:'22%',s:3,d:0,dur:4.2},{x:'78%',y:'12%',s:2,d:1.1,dur:5.3},{x:'88%',y:'58%',s:4,d:2,dur:6.1},{x:'22%',y:'72%',s:2,d:0.5,dur:4.8},{x:'55%',y:'88%',s:3,d:1.7,dur:5.6},{x:'42%',y:'38%',s:2,d:3.1,dur:7},{x:'65%',y:'45%',s:2,d:0.8,dur:4.5}].map((p,i) => (
          <div key={i} style={{ position:'absolute', left:p.x, top:p.y, width:p.s, height:p.s, borderRadius:'50%', background:'rgba(255,80,80,0.4)', animation:`floatB ${p.dur}s ease-in-out ${p.d}s infinite`, boxShadow:`0 0 ${p.s*4}px rgba(255,50,50,0.6)` }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #cc0000, #ff2222)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(200,0,0,0.5)' }}>
            <Terminal size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>{cfg.hero_name || 'olik'}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="#work" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>Work</a>
          <a href="#about" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>About</a>
          {isLoggedIn ? (
            <Link to="/dashboard" style={{ background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 16px rgba(200,0,0,0.4)' }}>Dashboard</Link>
          ) : (
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'none' }}>Sign in</Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '56px 32px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 300, textAlign: 'left', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(.22,.68,0,1.2)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.25)', borderRadius: 100, padding: '6px 16px', fontSize: 12, color: 'rgba(255,160,160,0.8)', marginBottom: 36 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2222', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {cfg.hero_badge}
            </div>
            <h1 style={{ fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
              <GlitchWord from={cfg.hero_name} to={cfg.hero_role} />
              <span style={{ display: 'block', background: 'linear-gradient(135deg, #ff4444 0%, #ff8888 40%, #ffaaaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {cfg.hero_tagline}
              </span>
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.38)', lineHeight: 1.78, maxWidth: 460, marginBottom: 44 }}>
              {cfg.hero_sub}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <MagneticButton onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#cc0000,#ff2222)', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(200,0,0,0.4)' }}>
                View my work <ArrowRight size={15} />
              </MagneticButton>
              <a href={mailHref}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '14px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
                Get in touch
              </a>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['Available now', 'Remote-friendly', 'Full-stack'].map(t => (
                <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#ff4444' }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Code preview card */}
          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(32px)', transition: 'all 1s cubic-bezier(.22,.68,0,1.2) 0.2s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: heroVisible ? 'floatA 7s ease-in-out infinite' : 'none' }}>
            <div style={{ position: 'absolute', width: 360, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div className="feat-ring"   style={{ width: 340, height: 340, borderRadius: '50%', border: '1px solid rgba(200,0,0,0.2)', boxShadow: '0 0 40px rgba(200,0,0,0.06) inset', position: 'absolute' }} />
              <div className="feat-ring-b" style={{ width: 300, height: 300, borderRadius: '50%', border: '1px dashed rgba(255,50,50,0.12)', position: 'absolute' }} />
              {[0,60,120,180,240,300].map(deg => (
                <div key={deg} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,26,26,0.5)', boxShadow: '0 0 8px rgba(255,26,26,0.6)', transform: `rotate(${deg}deg) translateX(170px)` }} />
              ))}
            </div>
            <CodeCard name={cfg.hero_name} role={cfg.hero_role} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.28, marginTop: 64, animation: 'floatB 2.5s ease-in-out infinite' }}>
          <div style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, rgba(200,0,0,0.8), transparent)' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, color: '#ff4444' }}>scroll</span>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: 'rgba(200,0,0,0.1)', borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(200,0,0,0.15)' }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#050508', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #ff4444, #ff9999)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                <CountUp target={s.val} suffix={s.suffix} active={statsVisible} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills / Work */}
      <div id="work" ref={featRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto 110px', padding: '0 32px', scrollMarginTop: 90 }}>
        <div style={{ textAlign: 'center', marginBottom: 64, opacity: featVisible ? 1 : 0, transform: featVisible ? 'none' : 'translateY(20px)', transition: 'all 0.7s ease' }}>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 14 }}>
            What I do.{' '}
            <span style={{ background: 'linear-gradient(135deg, #ff4444, #ff9999)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>End to end.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>From first sketch to production deploy — I cover the whole stack.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {SKILL_AREAS.map((f, i) => <Feature3D key={f.key} {...f} delay={i * 0.08} visible={featVisible} />)}
        </div>
      </div>

      {/* About */}
      <div id="about" ref={aboutRef} style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 110px', padding: '0 32px', scrollMarginTop: 90 }}>
        <div style={{
          opacity: aboutVisible ? 1 : 0, transform: aboutVisible ? 'none' : 'translateY(24px)', transition: 'all 0.7s ease',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '48px 40px',
          backdropFilter: 'blur(14px) saturate(1.4)', WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
        }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 18 }}>About me</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.85, marginBottom: 28, maxWidth: 620 }}>
            {cfg.about_bio}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
            {skills.map(s => (
              <span key={s} style={{ fontSize: 12, color: 'rgba(255,160,160,0.85)', background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.25)', borderRadius: 100, padding: '6px 14px' }}>{s}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {links.github && (
              <a href={links.github} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}>
                <Github size={14} /> GitHub
              </a>
            )}
            {links.linkedin && (
              <a href={links.linkedin} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}>
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
            {links.twitter && (
              <a href={links.twitter} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}>
                <Twitter size={14} /> Twitter
              </a>
            )}
            {links.email && (
              <a href={mailHref} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 16px', fontSize: 13, textDecoration: 'none' }}>
                <Mail size={14} /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div ref={ctaRef} style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 32px 130px', textAlign: 'center' }}>
        <div style={{
          opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? 'none' : 'translateY(32px)', transition: 'all 0.8s ease',
          background: 'rgba(200,0,0,0.04)', border: '1px solid rgba(200,0,0,0.15)',
          borderRadius: 28, padding: '80px 40px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(200,0,0,0.12), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,0,0,0.5), transparent)' }} />
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>{cfg.cta_title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, margin: '0 auto 44px', maxWidth: 380, lineHeight: 1.7 }}>
            {cfg.cta_sub}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={mailHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '16px 36px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 32px rgba(200,0,0,0.35)' }}>
              Say hi <ArrowRight size={16} />
            </a>
            {links.github && (
              <a href={links.github} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', padding: '16px 28px', borderRadius: 14, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                <Github size={16} /> GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
