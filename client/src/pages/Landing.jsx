import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Zap, Palette, Link2, Star, Check, Shield, Cpu, Globe } from 'lucide-react';
import { getAuth } from '../utils/auth';

/* ── Scroll reveal hook ─────────────────────────────────────── */
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

/* ── Count-up number ────────────────────────────────────────── */
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

/* ── Scan reveal card ───────────────────────────────────────── */
function ScanCard({ children, delay = 0, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      position: 'relative', overflow: 'hidden',
    }}>
      {children}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
        opacity: visible ? 0 : 1,
        animation: visible ? 'scanDown 0.8s ease forwards' : 'none',
        animationDelay: `${delay}s`,
      }} />
    </div>
  );
}

/* ── Terminal line ──────────────────────────────────────────── */
function TermLine({ text, delay, visible }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setShown(text.slice(0, ++i));
        if (i >= text.length) clearInterval(iv);
      }, 22);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [visible]);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(165,180,252,0.8)', lineHeight: 1.8 }}>
      <span style={{ color: '#6366f1', marginRight: 8 }}>›</span>{shown}
      {shown.length < text.length && visible && <span style={{ animation: 'blink 1s infinite', opacity: 1 }}>_</span>}
    </div>
  );
}

/* ── 3D Tilt Card ───────────────────────────────────────────── */
function TiltCard() {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top)  / r.height;
    setTilt({ x: (y - 0.5) * -22, y: (x - 0.5) * 22 });
    setGlowPos({ x: x * 100, y: y * 100 });
  };

  const onLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      style={{ perspective: 1000, cursor: 'default', flexShrink: 0 }}
    >
      <div style={{
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.03 : 1})`,
        transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
        transformStyle: 'preserve-3d',
        position: 'relative',
        width: 280,
        borderRadius: 24,
        background: 'rgba(10,10,18,0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05)`,
        overflow: 'hidden',
      }}>
        {/* Dynamic glow follows mouse */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(99,102,241,0.18) 0%, transparent 65%)`,
        }} />
        {/* Edge shimmer */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', borderRadius: 24,
          background: `linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(99,102,241,0.06) 100%)`,
        }} />

        {/* Banner */}
        <div style={{ height: 90, background: 'linear-gradient(135deg, #1e1040, #0d0221)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #4f46e5aa, #7c3aedaa)', opacity: 0.4 }} />
          <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 2 }}>BANNER</div>
        </div>

        {/* Avatar */}
        <div style={{ position: 'relative', paddingTop: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="https://scontent-mia3-2.cdninstagram.com/v/t51.82787-19/639778373_18035639270717019_8788809374271189271_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-mia3-2.cdninstagram.com&_nc_cat=103&_nc_oc=Q6cZ2gEtpjIAJUNHKbnhUWPnyDm2rwQMZZXlYXy2TifJl4r1TbxeNyb7y_aeNTaKeOFW_iM&_nc_ohc=OP5lpxWlBLEQ7kNvwHqtXhA&_nc_gid=M404KjCehi0EM04C8aJlYg&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_Af6YjllZeME6Q2D1wJBIfBoiWAZjlor2hSOn7I4g5eDZLA&oe=6A0C1DCA&_nc_sid=7d3ac5"
            alt=""
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #050508', marginTop: -32, position: 'relative', zIndex: 2, boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}
          />
          <div style={{ marginTop: 8, textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              @olik
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#6366f1"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', marginTop: 2 }}>Creator · Designer ✨</div>
          </div>

          {/* Links */}
          <div style={{ width: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {['My Portfolio', 'Latest Project', 'Contact'].map((t, i) => (
              <div key={t} style={{ width: '100%', textAlign: 'center', fontSize: 11, padding: '8px 0', borderRadius: 99, fontWeight: 600, background: i === 0 ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.06)', color: '#fff', border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>{t}</div>
            ))}
          </div>

          {/* Spotify bar */}
          <div style={{ margin: '0 16px 16px', width: 'calc(100% - 32px)', background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.15)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(30,215,96,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1ed760"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#1ed760', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Now Playing</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Spotify track</div>
            </div>
          </div>
        </div>

        {/* Floating badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 10,
          background: 'rgba(99,102,241,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
          padding: '4px 8px', fontSize: 9, color: '#a5b4fc', fontFamily: 'monospace',
          transform: 'translateZ(20px)',
        }}>
          LIVE PREVIEW
        </div>
      </div>
    </div>
  );
}

/* ── Glitch word transition ─────────────────────────────────── */
const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01';
function GlitchWord({ from, to }) {
  const [text, setText] = useState(from);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const start = setTimeout(() => {
      setGlitching(true);
      let iter = 0;
      const interval = setInterval(() => {
        setText(to.split('').map((char, i) => {
          if (char === ' ') return ' ';
          if (i < iter) return to[i];
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }).join(''));
        if (iter >= to.length) {
          setText(to);
          setGlitching(false);
          clearInterval(interval);
        }
        iter += 0.4;
      }, 40);
      return () => clearInterval(interval);
    }, 1400);
    return () => clearTimeout(start);
  }, []);

  return (
    <span style={{ display: 'block', marginBottom: 8, fontFamily: glitching ? 'monospace' : 'inherit', letterSpacing: glitching ? '-0.02em' : '-0.05em', transition: 'letter-spacing 0.4s', color: glitching ? '#a5b4fc' : '#fff' }}>
      {text}
    </span>
  );
}

export default function Landing() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const { isLoggedIn } = getAuth();
  const [scrollY, setScrollY] = useState(0);

  const [heroRef, heroVisible] = useInView(0.1);
  const [featRef, featVisible] = useInView(0.1);
  const [statsRef, statsVisible] = useInView(0.3);
  const [termRef, termVisible] = useInView(0.2);
  const [ctaRef, ctaVisible] = useInView(0.2);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleClaim = (e) => {
    e.preventDefault();
    if (username.trim()) navigate(`/signup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
  };

  const gridOpacity = Math.max(0, Math.min(1, scrollY / 300));

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes scanDown { from { top: 0; opacity: 1; } to { top: 100%; opacity: 0; } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes gridFloat { 0%,100% { background-position: 0 0; } 100% { background-position: 0 40px; } }
        @keyframes glitch {
          0%,95%,100% { transform: translate(0); clip-path: none; }
          96% { transform: translate(-3px,1px); clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%); color: #f0abfc; }
          97% { transform: translate(3px,-1px); clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%); color: #7dd3fc; }
          98% { transform: translate(-1px,2px); clip-path: none; }
        }
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes slideRight { from { width: 0; } to { width: 100%; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .glitch-text { animation: glitch 5s infinite; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(99,102,241,0.25); }
        .cta-glow { transition: box-shadow 0.2s, transform 0.2s; }
        .cta-glow:hover { box-shadow: 0 0 40px rgba(99,102,241,0.6); transform: scale(1.04); }
      `}</style>

      {/* ── Perspective grid BG (appears on scroll) ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        opacity: Math.min(gridOpacity, 0.6),
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.12) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        maskImage: 'radial-gradient(ellipse at center, transparent 20%, black 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 20%, black 80%)',
      }} />

      {/* ── Ambient glow ── */}
      <div style={{ position: 'fixed', top: -200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Nav ── */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} color="#6366f1" />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>olik</span>
          <span style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, padding: '2px 6px', marginLeft: 4, fontFamily: 'monospace' }}>v1.0</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite', boxShadow: '0 0 8px #34d399' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>LIVE</span>
          {isLoggedIn ? (
            <Link to="/dashboard" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', marginLeft: 8 }}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Log in</Link>
              <Link to="/signup" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '60px 32px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ flex: 1, minWidth: 300, textAlign: 'left', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(.22,.68,0,1.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 11, color: '#a5b4fc', marginBottom: 32, fontFamily: 'monospace', letterSpacing: 2 }}>
            <span style={{ color: '#34d399' }}>■</span> SYSTEM ONLINE · OLIK.APP
          </div>

          <h1 style={{ fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
            <GlitchWord from="OLIK" to="One link." />
            <span style={{ display: 'block', background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Infinite reach.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 48px' }}>
            The sleekest link-in-bio platform. Invite only. Built for creators who don't settle.
          </p>

          <form onSubmit={handleClaim} style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '14px 20px', minWidth: 280 }}>
              <span style={{ color: 'rgba(165,180,252,0.5)', fontSize: 14, marginRight: 4, fontFamily: 'monospace' }}>olik.app/</span>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <button type="submit" className="cta-glow" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Claim yours <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {['Invite only', 'Free forever', 'No credit card'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                <Check size={11} color="#34d399" /> {t}
              </div>
            ))}
          </div>
        </div>

        </div>

        {/* 3D Tilt Card */}
        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(32px)', transition: 'all 1s cubic-bezier(.22,.68,0,1.2) 0.2s' }}>
          <TiltCard />
        </div>

        </div>{/* end flex row */}

        {/* Scroll indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.4, animation: 'float 2s infinite', marginTop: 48 }}>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(99,102,241,0.8), transparent)' }} />
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, color: '#818cf8' }}>SCROLL</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div ref={statsRef} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 80px', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(99,102,241,0.15)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)' }}>
          {[
            { val: 10, suffix: '+', label: 'THEMES' },
            { val: 100, suffix: '%', label: 'CUSTOMIZABLE' },
            { val: 0, suffix: 'ms', label: 'SETUP TIME' },
          ].map((s, i) => (
            <div key={s.label} style={{ background: '#050508', padding: '32px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #6366f1, transparent)', opacity: statsVisible ? 1 : 0, transition: `opacity 0.3s ease ${i * 0.15}s` }} />
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'monospace', background: 'linear-gradient(135deg, #a5b4fc, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                <CountUp target={s.val} suffix={s.suffix} active={statsVisible} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(165,180,252,0.5)', fontFamily: 'monospace', letterSpacing: 3, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div ref={featRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4))' }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, color: '#6366f1' }}>FEATURES</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { icon: <Palette size={18} color="#c084fc" />, title: 'Full Design Control', desc: '10+ preset themes. Custom colors, fonts, button shapes, layouts. Every pixel yours.', accent: '#a855f7', delay: 0 },
            { icon: <Link2 size={18} color="#60a5fa" />, title: 'Unlimited Links', desc: 'Custom links, 50+ social platforms, reorderable. No limits, no paywalls.', accent: '#3b82f6', delay: 0.1 },
            { icon: <Shield size={18} color="#34d399" />, title: 'Invite Only', desc: 'Exclusive access keeps quality high. Get your key from a friend or the Telegram bot.', accent: '#10b981', delay: 0.2 },
            { icon: <Cpu size={18} color="#f59e0b" />, title: 'Instant Preview', desc: 'See changes live as you type. No reload, no waiting. Just pure real-time editing.', accent: '#f59e0b', delay: 0.3 },
            { icon: <Globe size={18} color="#f472b6" />, title: 'Custom Domain Ready', desc: 'Your profile lives at olik.app/you — or bring your own domain.', accent: '#ec4899', delay: 0.4 },
            { icon: <Zap size={18} color="#818cf8" />, title: 'Lightning Fast', desc: 'Optimized builds, gzip compression, CDN-ready. Loads in milliseconds anywhere.', accent: '#6366f1', delay: 0.5 },
          ].map(f => (
            <ScanCard key={f.title} delay={f.delay} visible={featVisible}>
              <div className="hover-lift" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${f.accent}60, transparent)` }} />
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${f.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, letterSpacing: '-0.02em' }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            </ScanCard>
          ))}
        </div>
      </div>

      {/* ── Terminal section ── */}
      <div ref={termRef} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{ background: '#0a0a0f', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
          {/* Terminal top bar */}
          <div style={{ background: '#111118', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginLeft: 8 }}>olik — setup</span>
          </div>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TermLine text="Initializing olik profile..." delay={0.1} visible={termVisible} />
            <TermLine text="Connecting to olik.app..." delay={0.8} visible={termVisible} />
            <TermLine text="Loading customization engine... OK" delay={1.6} visible={termVisible} />
            <TermLine text="Importing 10 preset themes... done" delay={2.3} visible={termVisible} />
            <TermLine text="Setting up invite key system... active" delay={3.0} visible={termVisible} />
            <TermLine text="Profile ready → olik.app/yourname ✓" delay={3.7} visible={termVisible} />
            <div style={{ marginTop: 16, height: 1, background: 'rgba(99,102,241,0.2)' }} />
            <div style={{ marginTop: 12, fontSize: 11, color: '#34d399', fontFamily: 'monospace' }}>
              {termVisible && '> All systems operational. Welcome to olik. _'}
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div ref={ctaRef} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '0 32px 120px', textAlign: 'center' }}>
        <div style={{
          opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? 'none' : 'translateY(32px)',
          transition: 'all 0.8s ease',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 24, padding: '64px 40px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)' }} />
          <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, color: '#6366f1', marginBottom: 20 }}>ACCESS REQUIRED</div>
          <h2 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>Ready to join?</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
            olik is invite only. Get your key from someone who's already in, or request access.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="cta-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Enter invite key <ArrowRight size={15} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '14px 28px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
