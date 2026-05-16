import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Palette, Link2, Shield, Zap, Globe, Cpu } from 'lucide-react';
import { getAuth } from '../utils/auth';
import { api } from '../utils/api';
import { SocialIconSvg } from '../utils/social-icons';

const DEFAULTS = {
  hero_badge: 'invite only — made for creators',
  hero_line1: 'One link.',
  hero_line2: 'Infinite reach.',
  hero_sub: 'The sleekest link-in-bio platform around. Custom everything — themes, colors, fonts, layouts. Built for people who care about the details.',
  stats: [
    { val: 10, suffix: '+', label: 'Themes' },
    { val: 100, suffix: '%', label: 'Customizable' },
    { val: 50, suffix: '+', label: 'Social platforms' },
  ],
  cta_title: 'Ready to jump in?',
  cta_sub: 'olik is invite only. Get your key from someone inside, or request access.',
};

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
  }, [to]);
  return (
    <span style={{ display: 'block', marginBottom: 8, fontFamily: glitching ? 'monospace' : 'inherit', letterSpacing: glitching ? '-0.02em' : '-0.05em', transition: 'letter-spacing 0.4s', color: glitching ? '#a5b4fc' : '#fff' }}>
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

function TermLine({ text, delay, visible }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        setShown(text.slice(0, ++i));
        if (i >= text.length) clearInterval(iv);
      }, 18);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [visible, text, delay]);
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(200,210,255,0.75)', lineHeight: 2, display: 'flex', gap: 8 }}>
      <span style={{ color: '#34d399', userSelect: 'none' }}>$</span>
      <span>{shown}{shown.length < text.length && visible && <span style={{ animation: 'blink 1s infinite', borderLeft: '1px solid rgba(200,210,255,0.7)', marginLeft: 1 }}>&nbsp;</span>}</span>
    </div>
  );
}

function SpotifyBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2, background: '#1ed760',
          animation: `eq${i + 1} ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
        }} />
      ))}
    </div>
  );
}

function TiltCard({ navigate }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);
  const [clickedLink, setClickedLink] = useState(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ x: (y - 0.5) * -22, y: (x - 0.5) * 22 });
    setGlowPos({ x: x * 100, y: y * 100 });
  };

  const handleLinkClick = (label) => {
    setClickedLink(label);
    setTimeout(() => setClickedLink(null), 1800);
  };

  const links = [
    { label: 'Instagram', platform: 'instagram', color: '#E1306C' },
    { label: 'TikTok', platform: 'tiktok', color: '#fff' },
  ];

  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }} style={{ perspective: 1000, cursor: 'default', flexShrink: 0 }}>
      <div style={{
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.04 : 1})`,
        transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
        transformStyle: 'preserve-3d',
        position: 'relative',
        width: 280,
        borderRadius: 24,
        background: 'rgba(10,10,18,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: hovered
          ? '0 60px 120px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.2), 0 0 0 0.5px rgba(255,255,255,0.05)'
          : '0 40px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05)',
        overflow: 'visible',
      }}>
        <div style={{ borderRadius: 24, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(99,102,241,0.22) 0%, transparent 65%)`,
            borderRadius: 24,
          }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', borderRadius: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(99,102,241,0.06) 100%)' }} />

          <div style={{ height: 90, background: 'linear-gradient(135deg, #1e1040, #0d0221)', position: 'relative', overflow: 'hidden' }}>
            <img src="https://olik.app/uploads/1-1778949790369.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="https://olik.app/uploads/1-1778949786754.png"
              alt=""
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #050508', marginTop: -32, position: 'relative', zIndex: 2, boxShadow: '0 0 28px rgba(99,102,241,0.55)', transition: 'box-shadow 0.3s', cursor: 'pointer' }}
              onClick={() => navigate('/signup')}
            />
            <div style={{ marginTop: 8, textAlign: 'center', padding: '0 20px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                @olik
                <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><path d="M20 2.5L24.33 7.13L30.5 5.77L31.87 11.94L37.5 16.27L34.9 22L37.5 27.73L31.87 32.06L30.5 38.23L24.33 36.87L20 41.5L15.67 36.87L9.5 38.23L8.13 32.06L2.5 27.73L5.1 22L2.5 16.27L8.13 11.94L9.5 5.77L15.67 7.13L20 2.5Z" fill="#0095F6"/><path d="M13 21.5L17.5 26L27 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            <div style={{ width: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}>
              {links.map(({ label, platform, color }, i) => (
                <div key={label} style={{ position: 'relative' }}>
                  <button
                    onClick={() => handleLinkClick(label)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      fontSize: 11, padding: '9px 0', borderRadius: 99,
                      fontWeight: 600,
                      background: i === 0 ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transform: clickedLink === label ? 'scale(0.96)' : 'scale(1)',
                      transition: 'transform 0.12s, box-shadow 0.15s',
                      boxShadow: clickedLink === label ? `0 0 20px rgba(99,102,241,0.5)` : 'none',
                    }}
                  >
                    <SocialIconSvg platform={platform} size={13} overrideColor="#fff" />
                    {label}
                  </button>
                  {clickedLink === label && (
                    <div style={{
                      position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: 8, padding: '5px 10px', fontSize: 10, color: '#a5b4fc',
                      whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
                      animation: 'fadeUp 0.15s ease',
                    }}>
                      Sign up to create yours →
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ margin: '0 16px 16px', width: 'calc(100% - 32px)', background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.15)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => navigate('/signup')}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(30,215,96,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#1ed760"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#1ed760', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Now Playing <SpotifyBars />
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Rehab (Winter In Paris)</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>Brent Faiyaz</div>
              </div>
            </div>
          </div>

          <div style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            background: 'rgba(99,102,241,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6,
            padding: '4px 8px', fontSize: 9, color: '#a5b4fc',
            transform: 'translateZ(20px)',
          }}>
            preview
          </div>
        </div>
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

export default function Landing() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const { isLoggedIn } = getAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cfg, setCfg] = useState(DEFAULTS);

  const [heroRef, heroVisible] = useInView(0.1);
  const [featRef, featVisible] = useInView(0.1);
  const [statsRef, statsVisible] = useInView(0.3);
  const [termRef, termVisible] = useInView(0.2);
  const [ctaRef, ctaVisible] = useInView(0.2);

  useEffect(() => {
    api.getSiteConfig().then(data => {
      if (data && Object.keys(data).length > 0) setCfg({ ...DEFAULTS, ...data });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMouse); };
  }, []);

  const handleClaim = (e) => {
    e.preventDefault();
    if (username.trim()) navigate(`/signup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
  };

  const stats = cfg.stats || DEFAULTS.stats;

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatA { 0%,100% { transform: translateY(0px) rotate(0deg); } 33% { transform: translateY(-14px) rotate(1.5deg); } 66% { transform: translateY(-7px) rotate(-1deg); } }
        @keyframes floatB { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-22px); } }
        @keyframes spinRing { from { transform: rotateX(72deg) rotate(0deg); } to { transform: rotateX(72deg) rotate(360deg); } }
        @keyframes spinRingB { from { transform: rotateX(60deg) rotateY(30deg) rotate(0deg); } to { transform: rotateX(60deg) rotateY(30deg) rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes eq1 { from { height: 4px; } to { height: 12px; } }
        @keyframes eq2 { from { height: 8px; } to { height: 4px; } }
        @keyframes eq3 { from { height: 3px; } to { height: 10px; } }
        .feat-ring { animation: spinRing 12s linear infinite; }
        .feat-ring-b { animation: spinRingB 18s linear infinite; }
      `}</style>

      {/* Parallax orb background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)', top: -200, left: -200, transform: `translate(${mousePos.x * -45}px, ${mousePos.y * -35 + scrollY * 0.07}px)`, transition: 'transform 0.18s ease-out' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)', top: '15%', right: -100, transform: `translate(${mousePos.x * 35}px, ${mousePos.y * 28 - scrollY * 0.1}px)`, transition: 'transform 0.18s ease-out', filter: 'blur(10px)' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', top: '55%', left: '15%', transform: `translate(${mousePos.x * -22}px, ${mousePos.y * -18 - scrollY * 0.05}px)`, transition: 'transform 0.22s ease-out', filter: 'blur(20px)' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)', bottom: -80, right: '5%', transform: `translate(${mousePos.x * 28}px, ${mousePos.y * 22 - scrollY * 0.06}px)`, transition: 'transform 0.18s ease-out' }} />
      </div>

      {/* Floating particles */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {[{ x:'12%',y:'22%',s:3,d:0,dur:4.2},{x:'78%',y:'12%',s:2,d:1.1,dur:5.3},{x:'88%',y:'58%',s:4,d:2,dur:6.1},{x:'22%',y:'72%',s:2,d:0.5,dur:4.8},{x:'55%',y:'88%',s:3,d:1.7,dur:5.6},{x:'42%',y:'38%',s:2,d:3.1,dur:7},{x:'65%',y:'45%',s:2,d:0.8,dur:4.5}].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s, borderRadius: '50%', background: 'rgba(165,180,252,0.55)', animation: `floatB ${p.dur}s ease-in-out ${p.d}s infinite`, boxShadow: `0 0 ${p.s * 4}px rgba(165,180,252,0.7)` }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>olik</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isLoggedIn ? (
            <Link to="/dashboard" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Log in</Link>
              <Link to="/signup" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '56px 32px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 300, textAlign: 'left', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(.22,.68,0,1.2)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 100, padding: '6px 16px', fontSize: 12, color: 'rgba(165,180,252,0.8)', marginBottom: 36 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {cfg.hero_badge}
            </div>
            <h1 style={{ fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
              <GlitchWord from="OLIK" to={cfg.hero_line1} />
              <span style={{ display: 'block', background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {cfg.hero_line2}
              </span>
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.38)', lineHeight: 1.78, maxWidth: 460, marginBottom: 44 }}>{cfg.hero_sub}</p>
            <form onSubmit={handleClaim} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 12, padding: '14px 20px', minWidth: 280, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <span style={{ color: 'rgba(165,180,252,0.38)', fontSize: 14, marginRight: 4 }}>olik.app/</span>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <MagneticButton type="submit" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
                Claim yours <ArrowRight size={15} />
              </MagneticButton>
            </form>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['Invite only', 'Free forever', 'No credit card'].map(t => (
                <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#34d399' }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* 3D tilt card with orbital rings */}
          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(32px)', transition: 'all 1s cubic-bezier(.22,.68,0,1.2) 0.2s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: heroVisible ? 'floatA 7s ease-in-out infinite' : 'none' }}>
            <div style={{ position: 'absolute', width: 360, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div className="feat-ring" style={{ width: 340, height: 340, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 40px rgba(99,102,241,0.06) inset', position: 'absolute' }} />
              <div className="feat-ring-b" style={{ width: 300, height: 300, borderRadius: '50%', border: '1px dashed rgba(168,85,247,0.15)', position: 'absolute' }} />
              {[0,60,120,180,240,300].map(deg => (
                <div key={deg} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,102,241,0.5)', boxShadow: '0 0 8px rgba(99,102,241,0.6)', transform: `rotate(${deg}deg) translateX(170px)` }} />
              ))}
            </div>
            <TiltCard navigate={navigate} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.28, marginTop: 64, animation: 'floatB 2.5s ease-in-out infinite' }}>
          <div style={{ width: 1, height: 44, background: 'linear-gradient(to bottom, rgba(99,102,241,0.8), transparent)' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, color: '#818cf8' }}>scroll</span>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: 'rgba(99,102,241,0.1)', borderRadius: 22, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.14)' }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#050508', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #a5b4fc, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                <CountUp target={s.val} suffix={s.suffix} active={statsVisible} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div ref={featRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto 110px', padding: '0 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64, opacity: featVisible ? 1 : 0, transform: featVisible ? 'none' : 'translateY(20px)', transition: 'all 0.7s ease' }}>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 14 }}>
            Everything you need.{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Nothing you don't.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, maxWidth: 380, margin: '0 auto' }}>Built from scratch. No templates, no limits, no nonsense.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { icon: <Palette size={18} color="#c084fc" />, title: 'Full Design Control', desc: '10+ preset themes. Custom colors, fonts, button shapes. Every pixel is yours to own.', accent: '#a855f7', delay: 0 },
            { icon: <Link2 size={18} color="#60a5fa" />, title: 'Unlimited Links', desc: 'Add as many as you want. Custom buttons, 50+ social icons, drag to reorder.', accent: '#3b82f6', delay: 0.08 },
            { icon: <Shield size={18} color="#34d399" />, title: 'Invite Only', desc: 'Exclusive by design. A key to get in — keeps the platform tight and quality high.', accent: '#10b981', delay: 0.16 },
            { icon: <Cpu size={18} color="#f59e0b" />, title: 'Live Preview', desc: 'See your changes instantly as you type. No saving, no reload, no waiting.', accent: '#f59e0b', delay: 0.24 },
            { icon: <Globe size={18} color="#f472b6" />, title: 'Your URL', desc: 'Your profile at olik.app/you — short, clean, and memorable.', accent: '#ec4899', delay: 0.32 },
            { icon: <Zap size={18} color="#818cf8" />, title: 'Actually Fast', desc: 'Compressed, optimized, edge-ready. Loads in a snap from anywhere.', accent: '#6366f1', delay: 0.4 },
          ].map(f => <Feature3D key={f.title} {...f} visible={featVisible} />)}
        </div>
      </div>

      {/* Terminal / coding screen */}
      <div ref={termRef} style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto 110px', padding: '0 32px' }}>
        <div style={{ background: '#0d0d14', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)' }}>
          {/* macOS traffic lights bar */}
          <div style={{ background: '#111118', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginLeft: 8, fontFamily: 'monospace' }}>olik — zsh</span>
          </div>
          <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <TermLine text="cd olik && npm create my-profile" delay={0.2} visible={termVisible} />
            <TermLine text="npx olik init --username=yourname" delay={1.2} visible={termVisible} />
            <TermLine text="✓ Profile created at olik.app/yourname" delay={2.4} visible={termVisible} />
            <TermLine text="olik theme set --preset=midnight" delay={3.4} visible={termVisible} />
            <TermLine text="✓ Theme applied. 10 more available." delay={4.4} visible={termVisible} />
            <TermLine text={'olik links add --url=portfolio.dev --title="My Work"'} delay={5.2} visible={termVisible} />
            <TermLine text="✓ Link added. Live in 0ms." delay={6.2} visible={termVisible} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div ref={ctaRef} style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 32px 130px', textAlign: 'center' }}>
        <div style={{
          opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? 'none' : 'translateY(32px)', transition: 'all 0.8s ease',
          background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.14)',
          borderRadius: 28, padding: '80px 40px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.14), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>{cfg.cta_title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, margin: '0 auto 44px', maxWidth: 380, lineHeight: 1.7 }}>{cfg.cta_sub}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '16px 36px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
              Enter invite key <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', padding: '16px 28px', borderRadius: 14, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
