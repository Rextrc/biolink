import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Zap, Palette, Link2, Star, Check } from 'lucide-react';
import { getAuth } from '../utils/auth';

/* ── 3D Particle Sphere ─────────────────────────────────────── */
function Sphere() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w, h;

    const resize = () => {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.current = { x: (cx - r.left) / w - 0.5, y: (cy - r.top)  / h - 0.5 };
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });

    // Build sphere points
    const N = 280;
    const pts = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    // Extra random inner ring
    for (let i = 0; i < 60; i++) {
      const t = Math.random() * Math.PI * 2;
      const p = Math.random() * Math.PI;
      pts.push({ x: 0.6 * Math.sin(p) * Math.cos(t), y: 0.6 * Math.cos(p), z: 0.6 * Math.sin(p) * Math.sin(t) });
    }

    let rotX = 0, rotY = 0;

    const draw = () => {
      rotY += 0.003 + mouse.current.x * 0.02;
      rotX += 0.001 + mouse.current.y * 0.01;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5, cy = h * 0.5;
      const rad = Math.min(w, h) * 0.38;

      // Project and sort by z
      const projected = pts.map(p => {
        // Rotate Y
        const x1 = p.x * Math.cos(rotY) - p.z * Math.sin(rotY);
        const z1 = p.x * Math.sin(rotY) + p.z * Math.cos(rotY);
        // Rotate X
        const y2 = p.y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = p.y * Math.sin(rotX) + z1 * Math.cos(rotX);
        return { sx: cx + x1 * rad, sy: cy + y2 * rad, z: z2 };
      }).sort((a, b) => a.z - b.z);

      // Draw lines between close points (top layer only)
      const front = projected.filter(p => p.z > 0.2);
      for (let i = 0; i < front.length; i++) {
        for (let j = i + 1; j < front.length; j++) {
          const dx = front[i].sx - front[j].sx;
          const dy = front[i].sy - front[j].sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < rad * 0.22) {
            const alpha = (1 - dist / (rad * 0.22)) * 0.12 * front[i].z;
            ctx.beginPath();
            ctx.moveTo(front[i].sx, front[i].sy);
            ctx.lineTo(front[j].sx, front[j].sy);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw dots
      projected.forEach(p => {
        const t = (p.z + 1) / 2;
        const size = 0.8 + t * 2.2;
        const alpha = 0.15 + t * 0.85;
        const r = Math.round(99  + t * 156);
        const g = Math.round(102 + t * 50);
        const b = Math.round(241);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      // Center glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.55);
      grd.addColorStop(0, 'rgba(99,102,241,0.18)');
      grd.addColorStop(0.5, 'rgba(139,92,246,0.06)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/* ── Floating orb ────────────────────────────────────────────── */
function FloatOrb({ style }) {
  return (
    <div style={{
      position: 'absolute', borderRadius: '50%',
      filter: 'blur(80px)', pointerEvents: 'none',
      animation: 'floatOrb 8s ease-in-out infinite',
      ...style,
    }} />
  );
}

/* ── Main landing ─────────────────────────────────────────────── */
export default function Landing() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const { isLoggedIn } = getAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClaim = (e) => {
    e.preventDefault();
    if (username.trim()) navigate(`/signup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatOrb {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse3d {
          0%,100% { box-shadow: 0 0 40px rgba(99,102,241,0.3), 0 0 80px rgba(99,102,241,0.1); }
          50%      { box-shadow: 0 0 80px rgba(99,102,241,0.5), 0 0 160px rgba(99,102,241,0.2); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(.22,.68,0,1.2) forwards; opacity: 0; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.22s; }
        .fade-up-3 { animation-delay: 0.34s; }
        .fade-up-4 { animation-delay: 0.46s; }
        .cta-btn { transition: transform 0.18s, box-shadow 0.18s; }
        .cta-btn:hover { transform: scale(1.04); box-shadow: 0 0 40px rgba(99,102,241,0.5); }
        .feat-card { transition: transform 0.22s, border-color 0.22s; border: 1px solid rgba(255,255,255,0.06); }
        .feat-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); }
      `}</style>

      {/* Background orbs */}
      <FloatOrb style={{ width: 600, height: 600, top: -100, left: '50%', marginLeft: -300, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', animationDuration: '10s' }} />
      <FloatOrb style={{ width: 400, height: 400, top: 200, left: -100, background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', animationDuration: '13s', animationDelay: '-4s' }} />
      <FloatOrb style={{ width: 350, height: 350, top: 300, right: -50, background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', animationDuration: '11s', animationDelay: '-7s' }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={20} color="#6366f1" />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>olik</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isLoggedIn ? (
            <Link to="/dashboard" style={{ background: '#6366f1', color: '#fff', padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.5)', padding: '8px 16px', borderRadius: 99, fontSize: 13, textDecoration: 'none' }}>Log in</Link>
              <Link to="/signup" style={{ background: '#6366f1', color: '#fff', padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '40px 32px 80px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>

        {/* Left text */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div className="fade-up fade-up-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '6px 16px', fontSize: 12, color: '#a5b4fc', marginBottom: 24 }}>
            <Star size={11} fill="currentColor" /> The cleanest link-in-bio tool
          </div>
          <h1 className="fade-up fade-up-2" style={{ fontSize: 'clamp(42px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 20 }}>
            One link.<br />
            <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Endless possibilities.
            </span>
          </h1>
          <p className="fade-up fade-up-3" style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: 36, maxWidth: 420 }}>
            Create a stunning, customizable profile page that houses all your links. Built for creators and brands.
          </p>

          <form className="fade-up fade-up-4" onSubmit={handleClaim} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 460 }}>
            <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '12px 20px' }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, marginRight: 4, whiteSpace: 'nowrap' }}>olik.app/</span>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname" style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <button type="submit" className="cta-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 99, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Claim yours <ArrowRight size={15} />
            </button>
          </form>

          <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            {['Free forever', 'No credit card', 'Setup in 2 min'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                <Check size={11} color="#34d399" /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* 3D Sphere */}
        <div style={{ flex: '0 0 420px', height: 420, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', animation: 'pulse3d 4s ease-in-out infinite' }} />
          <Sphere />
          {/* Floating label */}
          <div style={{ position: 'absolute', top: '12%', right: '5%', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 14px', fontSize: 12, color: 'rgba(255,255,255,0.7)', animation: 'floatOrb 6s ease-in-out infinite', animationDelay: '-2s' }}>
            ✨ Live preview
          </div>
          <div style={{ position: 'absolute', bottom: '15%', left: '5%', background: 'rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '8px 14px', fontSize: 12, color: '#a5b4fc', animation: 'floatOrb 7s ease-in-out infinite', animationDelay: '-5s' }}>
            🔗 Unlimited links
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '20px 32px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>Everything you need</h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Powerful features, beautifully simple.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: <Palette size={20} color="#c084fc" />, bg: 'rgba(168,85,247,0.1)', title: 'Fully Customizable', desc: 'Themes, colors, fonts, button styles, layouts. Make it truly yours.', glow: 'rgba(168,85,247,0.15)' },
            { icon: <Link2 size={20} color="#60a5fa" />, bg: 'rgba(59,130,246,0.1)',  title: 'Unlimited Links',   desc: 'Custom links, social profiles, and more. No limits on what you share.', glow: 'rgba(59,130,246,0.15)' },
            { icon: <Zap size={20} color="#fbbf24" />,   bg: 'rgba(245,158,11,0.1)',  title: 'Instant Preview',  desc: 'See exactly how your profile looks as you edit. Real-time updates.', glow: 'rgba(245,158,11,0.15)' },
          ].map(f => (
            <div key={f.title} className="feat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: f.glow, filter: 'blur(40px)', pointerEvents: 'none' }} />
              <div style={{ width: 44, height: 44, borderRadius: 14, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                {f.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile demo strip */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 28, padding: '48px 40px', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
          {/* Mini profile card */}
          <div style={{ flex: '0 0 auto', background: 'linear-gradient(160deg, #13102a, #1e1040)', borderRadius: 28, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 200, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ position: 'relative' }}>
              <img src="https://scontent-mia3-2.cdninstagram.com/v/t51.82787-19/639778373_18035639270717019_8788809374271189271_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-mia3-2.cdninstagram.com&_nc_cat=103&_nc_oc=Q6cZ2gEtpjIAJUNHKbnhUWPnyDm2rwQMZZXlYXy2TifJl4r1TbxeNyb7y_aeNTaKeOFW_iM&_nc_ohc=OP5lpxWlBLEQ7kNvwHqtXhA&_nc_gid=M404KjCehi0EM04C8aJlYg&edm=ALGbJPMBAAAA&ccb=7-5&oh=00_Af6YjllZeME6Q2D1wJBIfBoiWAZjlor2hSOn7I4g5eDZLA&oe=6A0C1DCA&_nc_sid=7d3ac5" alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(139,92,246,0.6)', boxShadow: '0 0 28px rgba(139,92,246,0.4)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                @olik
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#6366f1"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(168,85,247,0.8)', marginTop: 2 }}>Creator · Designer ✨</div>
            </div>
            {['My Portfolio', 'Latest Project'].map(t => (
              <div key={t} style={{ width: '100%', textAlign: 'center', fontSize: 11, padding: '8px 0', borderRadius: 99, fontWeight: 600, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>{t}</div>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>Your page,<br />your way.</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Fully customizable with 10+ themes, unlimited links, and a live preview as you edit.</p>
            <Link to="/signup" className="cta-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: 99, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Create your page <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
