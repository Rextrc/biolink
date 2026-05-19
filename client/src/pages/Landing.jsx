import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Radio, MapPin, Shield, Zap, Mic, Navigation } from 'lucide-react';
import { getAuth } from '../utils/auth';

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

/* Fake HUD preview card */
function HudPreviewCard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1800);
    return () => clearInterval(t);
  }, []);

  const events = [
    { type: 'Traffic Stop',    dist: '0.4 km', prio: 'MEDIUM' },
    { type: 'Accident – PD',   dist: '1.1 km', prio: 'HIGH'   },
    { type: 'Road Hazard',     dist: '2.3 km', prio: 'MEDIUM' },
  ];

  const signals = [
    { name: 'Main & 1st', state: tick % 3 === 0 ? 'LIKELY RED' : tick % 3 === 1 ? 'POSSIBLY SOON' : 'LIKELY GREEN', color: tick % 3 === 0 ? '#ff2222' : tick % 3 === 1 ? '#ff8800' : '#333' },
    { name: 'Oak & 5th',  state: tick % 3 === 2 ? 'LIKELY RED' : 'LIKELY GREEN', color: tick % 3 === 2 ? '#ff2222' : '#333' },
  ];

  return (
    <div style={{
      width: 270, borderRadius: 12, background: 'rgba(8,0,0,0.97)',
      border: '1px solid rgba(255,26,26,0.4)',
      boxShadow: '0 0 40px rgba(255,26,26,0.15), 0 20px 60px rgba(0,0,0,0.8)',
      fontFamily: "'Courier New', monospace", overflow: 'hidden',
    }}>
      {/* Mock map area */}
      <div style={{ height: 120, background: 'linear-gradient(135deg, #0a0000 0%, #110000 50%, #0a0005 100%)', position: 'relative', borderBottom: '1px solid rgba(255,26,26,0.2)', overflow: 'hidden' }}>
        {/* Grid lines */}
        {[20,40,60,80].map(x => <div key={x} style={{ position:'absolute', left:`${x}%`, top:0, bottom:0, width:1, background:'rgba(255,26,26,0.06)' }} />)}
        {[33,66].map(y => <div key={y} style={{ position:'absolute', top:`${y}%`, left:0, right:0, height:1, background:'rgba(255,26,26,0.06)' }} />)}
        {/* Route line */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <path d="M 30,90 Q 80,60 130,50 Q 180,40 240,30" stroke="#ff1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9"/>
          <path d="M 30,90 Q 80,60 130,50 Q 180,40 240,30" stroke="#ff4444" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.15"/>
        </svg>
        {/* User dot */}
        <div style={{ position:'absolute', left:26, top:82, width:10, height:10, borderRadius:'50%', background:'#fff', border:'2px solid #ff1a1a', boxShadow:'0 0 8px rgba(255,26,26,0.8)' }} />
        {/* Event dots */}
        <div style={{ position:'absolute', left:90, top:48, width:7, height:7, borderRadius:'50%', background:'#1a8cff', boxShadow:'0 0 10px rgba(26,140,255,0.7)' }} />
        <div style={{ position:'absolute', left:155, top:38, width:7, height:7, borderRadius:'50%', background:'#1a8cff', boxShadow:'0 0 10px rgba(26,140,255,0.7)' }} />
        {/* Signal dots */}
        <div style={{ position:'absolute', left:130, top:44, width:6, height:6, borderRadius:'50%', background: signals[0].color, boxShadow:`0 0 8px ${signals[0].color}` }} />
        {/* HUD label */}
        <div style={{ position:'absolute', top:6, left:8, fontSize:9, color:'rgba(255,26,26,0.7)', letterSpacing:'0.15em' }}>J.A.R.V.I.S HUD</div>
        <div style={{ position:'absolute', top:6, right:8, fontSize:8, color:'rgba(255,26,26,0.5)', letterSpacing:'0.1em' }}>GPS ●</div>
      </div>

      {/* Panel */}
      <div style={{ padding: '8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ fontSize:9, color:'#ff1a1a', letterSpacing:'0.2em', borderBottom:'1px solid rgba(255,26,26,0.2)', paddingBottom:5, display:'flex', justifyContent:'space-between' }}>
          <span>POLICE ACTIVITY</span>
          <span style={{ color:'rgba(255,26,26,0.5)' }}>{events.length} ACTIVE</span>
        </div>

        {/* Signals */}
        <div style={{ display:'flex', gap:4 }}>
          {signals.map(s => (
            <div key={s.name} style={{ flex:1, border:`1px solid ${s.color}`, borderRadius:3, padding:'3px 5px' }}>
              <div style={{ fontSize:7, color:'#666', letterSpacing:'0.05em' }}>{s.name}</div>
              <div style={{ fontSize:7, color:s.color, fontWeight:'bold', letterSpacing:'0.05em' }}>{s.state}</div>
            </div>
          ))}
        </div>

        {/* Events */}
        {events.slice(0,2).map(ev => (
          <div key={ev.type} style={{ background:'rgba(30,0,0,0.8)', border:'1px solid rgba(255,26,26,0.2)', borderRadius:3, padding:'4px 7px', borderLeft:'2px solid #ff1a1a' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:8, color:'#ff4444', letterSpacing:'0.08em' }}>{ev.type}</span>
              <span style={{ fontSize:7, color: ev.prio === 'HIGH' ? '#ff6600' : '#ffcc00', letterSpacing:'0.06em' }}>{ev.prio}</span>
            </div>
            <div style={{ fontSize:7, color:'#664444', marginTop:1 }}>{ev.dist} away</div>
          </div>
        ))}

        {/* Speak brief button */}
        <div style={{ marginTop:2, border:'1px solid rgba(26,140,255,0.5)', borderRadius:3, padding:'4px 8px', fontSize:8, color:'#1a8cff', letterSpacing:'0.12em', textAlign:'center' }}>
          ⬡ SPEAK BRIEF
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
  const navigate = useNavigate();
  const { isLoggedIn } = getAuth();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [heroRef,  heroVisible]  = useInView(0.1);
  const [featRef,  featVisible]  = useInView(0.1);
  const [statsRef, statsVisible] = useInView(0.3);
  const [ctaRef,   ctaVisible]   = useInView(0.2);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    const onMouse  = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMouse); };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatA { 0%,100% { transform: translateY(0px) rotate(0deg); } 33% { transform: translateY(-14px) rotate(1.5deg); } 66% { transform: translateY(-7px) rotate(-1deg); } }
        @keyframes floatB { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-22px); } }
        @keyframes spinRing { from { transform: rotateX(72deg) rotate(0deg); } to { transform: rotateX(72deg) rotate(360deg); } }
        @keyframes spinRingB { from { transform: rotateX(60deg) rotateY(30deg) rotate(0deg); } to { transform: rotateX(60deg) rotateY(30deg) rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes radarSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .feat-ring  { animation: spinRing  12s linear infinite; }
        .feat-ring-b{ animation: spinRingB 18s linear infinite; }
        .radar-sweep{ animation: radarSpin  3s linear  infinite; }
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
            <Radio size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>olik</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isLoggedIn ? (
            <Link to="/dashboard" style={{ background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 16px rgba(200,0,0,0.4)' }}>Open HUD</Link>
          ) : (
            <>
              <Link to="/login"  style={{ color: 'rgba(255,255,255,0.4)', padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Log in</Link>
              <Link to="/signup" style={{ background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 16px rgba(200,0,0,0.35)' }}>Get Access</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div ref={heroRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '56px 32px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: 300, textAlign: 'left', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(.22,.68,0,1.2)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.25)', borderRadius: 100, padding: '6px 16px', fontSize: 12, color: 'rgba(255,160,160,0.8)', marginBottom: 36 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2222', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              invite only — situational awareness
            </div>
            <h1 style={{ fontSize: 'clamp(48px,8vw,96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
              <GlitchWord from="OLIK" to="See everything." />
              <span style={{ display: 'block', background: 'linear-gradient(135deg, #ff4444 0%, #ff8888 40%, #ffaaaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Stay ahead.
              </span>
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.38)', lineHeight: 1.78, maxWidth: 460, marginBottom: 44 }}>
              Real-time public safety radar. GPS-tracked map, live scanner activity, signal predictions, and AI tactical briefings. For those who need to know.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <MagneticButton onClick={() => navigate('/signup')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#cc0000,#ff2222)', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(200,0,0,0.4)' }}>
                Enter invite key <ArrowRight size={15} />
              </MagneticButton>
              <button onClick={() => navigate('/login')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '14px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Log in
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['Invite only', 'Public data only', 'AI powered'].map(t => (
                <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#ff4444' }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Live HUD preview card */}
          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(32px)', transition: 'all 1s cubic-bezier(.22,.68,0,1.2) 0.2s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: heroVisible ? 'floatA 7s ease-in-out infinite' : 'none' }}>
            <div style={{ position: 'absolute', width: 360, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div className="feat-ring"   style={{ width: 340, height: 340, borderRadius: '50%', border: '1px solid rgba(200,0,0,0.2)', boxShadow: '0 0 40px rgba(200,0,0,0.06) inset', position: 'absolute' }} />
              <div className="feat-ring-b" style={{ width: 300, height: 300, borderRadius: '50%', border: '1px dashed rgba(255,50,50,0.12)', position: 'absolute' }} />
              {[0,60,120,180,240,300].map(deg => (
                <div key={deg} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,26,26,0.5)', boxShadow: '0 0 8px rgba(255,26,26,0.6)', transform: `rotate(${deg}deg) translateX(170px)` }} />
              ))}
            </div>
            <HudPreviewCard />
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
          {[
            { val: 30,  suffix: 's', label: 'Refresh interval' },
            { val: 100, suffix: '%', label: 'Public data only' },
            { val: 6,   suffix: '+', label: 'Feed sources' },
          ].map(s => (
            <div key={s.label} style={{ background: '#050508', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #ff4444, #ff9999)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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
            Full situational awareness.{' '}
            <span style={{ background: 'linear-gradient(135deg, #ff4444, #ff9999)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>One screen.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>Everything you need to understand your surroundings in real time.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { icon: <MapPin size={18} color="#ff4444" />,    title: 'Live GPS Map',          desc: 'Fullscreen dark map that auto-follows your position and rotates with your heading as you move.', accent: '#ff2222', delay: 0 },
            { icon: <Radio size={18} color="#1a8cff" />,     title: 'Scanner Activity',      desc: 'Public safety events shown as glowing blue dots. Tap any dot for the full incident summary and transcript.', accent: '#1a8cff', delay: 0.08 },
            { icon: <Zap size={18} color="#ff8800" />,       title: 'Signal Predictions',    desc: 'Upcoming intersections color-coded red, orange, or gray based on predicted signal state and traffic flow.', accent: '#ff8800', delay: 0.16 },
            { icon: <Mic size={18} color="#ff4444" />,       title: 'AI Tactical Brief',     desc: 'One tap. Jarvis reads your next nav step, signal states, and nearest activity aloud in a crisp voice briefing.', accent: '#cc0000', delay: 0.24 },
            { icon: <Navigation size={18} color="#ff6666" />,title: 'Route Overlay',         desc: 'Type any destination — a bright red polyline route appears on the map with live ETA and step-by-step nav.', accent: '#ff4444', delay: 0.32 },
            { icon: <Shield size={18} color="#34d399" />,    title: 'Invite Only',           desc: 'Exclusive access. Get a key from someone inside, or request one. Keeps the platform focused and private.', accent: '#10b981', delay: 0.4 },
          ].map(f => <Feature3D key={f.title} {...f} visible={featVisible} />)}
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
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 16 }}>Ready to see more?</h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 15, margin: '0 auto 44px', maxWidth: 380, lineHeight: 1.7 }}>
            olik radar is invite only. Get your key from someone inside, or request access.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#cc0000,#ff2222)', color: '#fff', padding: '16px 36px', borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 32px rgba(200,0,0,0.35)' }}>
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
