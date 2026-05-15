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
      <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '80px 32px 120px', textAlign: 'center' }}>
        <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(.22,.68,0,1.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '6px 14px', fontSize: 11, color: '#a5b4fc', marginBottom: 32, fontFamily: 'monospace', letterSpacing: 2 }}>
            <span style={{ color: '#34d399' }}>■</span> SYSTEM ONLINE · OLIK.APP
          </div>

          <h1 style={{ fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
            <span className="glitch-text" style={{ display: 'block', marginBottom: 8 }}>One link.</span>
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

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.4, animation: 'float 2s infinite' }}>
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
