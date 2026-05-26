import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const FONT = "'Courier New', 'Lucida Console', monospace";
const RED = '#ff1a1a';
const RED_DIM = '#7a0000';
const RED_GLOW = 'rgba(255,26,26,0.4)';
const BG = '#080000';

function useGlitch(text, run) {
  const [out, setOut] = useState(text);
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01234!@#$%';
  useEffect(() => {
    if (!run) return;
    let iter = 0;
    const interval = setInterval(() => {
      setOut(text.split('').map((c, i) => {
        if (c === ' ') return ' ';
        if (i < iter) return text[i];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join(''));
      if (iter >= text.length) { setOut(text); clearInterval(interval); }
      iter += 0.5;
    }, 35);
    return () => clearInterval(interval);
  }, [run]);
  return out;
}

function Blink({ children, ms = 900 }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn(v => !v), ms);
    return () => clearInterval(t);
  }, [ms]);
  return <span style={{ opacity: on ? 1 : 0 }}>{children}</span>;
}

function RadarRing({ size, delay }) {
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      border: `1px solid ${RED}`,
      opacity: 0,
      animation: `radarPulse 3s ${delay}s ease-out infinite`,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }} />
  );
}

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | error | dupe
  const [glitchRun, setGlitchRun] = useState(false);
  const inputRef = useRef(null);

  const title = useGlitch('OLIK RADAR', glitchRun);

  useEffect(() => {
    const t = setTimeout(() => setGlitchRun(true), 600);
    return () => clearTimeout(t);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!email || state === 'loading' || state === 'done') return;
    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) setState('done');
      else if (res.status === 409) setState('dupe');
      else setState('error');
    } catch { setState('error'); }
  }

  const msgMap = {
    done:  '// SIGNAL LOCKED IN. STANDING BY.',
    dupe:  '// FREQUENCY ALREADY REGISTERED.',
    error: '// TRANSMISSION FAILED. RETRY.',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: BG,
      fontFamily: FONT,
      color: RED,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes radarPulse {
          0%   { transform: translate(-50%,-50%) scale(0.1); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0; }
        }
        @keyframes scanV {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes cornerBlink {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        .cs-input::placeholder { color: ${RED_DIM}; }
        .cs-input:focus { outline: none; border-color: ${RED}; box-shadow: 0 0 12px ${RED_GLOW}; }
        .cs-btn:hover { background: ${RED} !important; color: #000 !important; }
        .cs-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
      }} />

      {/* vertical scan beam */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2, pointerEvents: 'none',
        background: `linear-gradient(to bottom, transparent, ${RED_GLOW}, transparent)`,
        animation: 'scanV 6s linear infinite',
      }} />

      {/* radar rings */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <RadarRing size="min(60vw,400px)" delay={0} />
        <RadarRing size="min(40vw,280px)" delay={1} />
        <RadarRing size="min(20vw,160px)" delay={2} />
      </div>

      {/* corner decorations */}
      {['top:16px;left:16px', 'top:16px;right:16px', 'bottom:16px;left:16px', 'bottom:16px;right:16px'].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...Object.fromEntries(pos.split(';').map(p => p.split(':'))),
          fontSize: 10, color: RED_DIM, fontFamily: FONT,
          animation: `cornerBlink 2s ${i * 0.5}s ease-in-out infinite`,
          zIndex: 3,
        }}>
          {i === 0 ? '◢ SYS:ONLINE' : i === 1 ? 'FREQ:LOCKED ◣' : i === 2 ? '◥ NET:SECURE' : 'AUTH:PENDING ◤'}
        </div>
      ))}

      {/* main content */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0, padding: '0 20px', maxWidth: 520, width: '100%',
        textAlign: 'center', boxSizing: 'border-box',
      }}>
        {/* coming soon badge */}
        <div style={{
          fontSize: 11, letterSpacing: '0.2em', color: '#000',
          background: RED, padding: '5px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700,
        }}>
          <Blink ms={700}>█</Blink>
          <span>COMING SOON</span>
          <Blink ms={700}>█</Blink>
        </div>

        {/* title */}
        <h1 style={{
          fontSize: 'clamp(42px, 10vw, 80px)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          margin: 0,
          color: '#fff',
          textShadow: `0 0 30px ${RED_GLOW}, 0 0 60px rgba(255,26,26,0.2)`,
          lineHeight: 1,
          fontFamily: FONT,
        }}>
          {title}
        </h1>

        {/* divider */}
        <div style={{
          width: '100%', height: 1,
          background: `linear-gradient(to right, transparent, ${RED}, transparent)`,
          margin: '24px 0',
          boxShadow: `0 0 8px ${RED_GLOW}`,
        }} />

        {/* description */}
        <p style={{
          fontSize: 'clamp(13px, 3.5vw, 15px)', color: 'rgba(255,255,255,0.75)',
          margin: '0 0 16px', lineHeight: 1.7, letterSpacing: '0.01em',
          fontFamily: 'Inter, sans-serif', fontWeight: 400,
        }}>
          A real-time situational awareness platform — live police scanner feeds, GPS-mapped incidents, AI tactical briefings, and proximity alerts for your city.
        </p>

        {/* feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          {['Live scanner audio', 'Incident map', 'AI briefings', 'Proximity alerts', 'Miami feeds'].map(f => (
            <span key={f} style={{
              fontSize: 11, letterSpacing: '0.08em', color: RED_DIM,
              border: `1px solid ${RED_DIM}`, padding: '4px 10px',
              fontFamily: FONT,
            }}>{f}</span>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#440000', letterSpacing: '0.08em', margin: '0 0 28px', fontFamily: FONT }}>
          // DROP DATE: CLASSIFIED
        </p>

        {/* email form */}
        {state !== 'done' ? (
          <form onSubmit={submit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <input
                ref={inputRef}
                className="cs-input"
                type="email"
                placeholder="YOUR@EMAIL.COM"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  flex: 1, minWidth: 0,
                  background: 'rgba(255,26,26,0.04)',
                  border: `1px solid ${RED_DIM}`,
                  color: RED,
                  fontFamily: FONT,
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  padding: '12px 14px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              <button
                type="submit"
                className="cs-btn"
                disabled={state === 'loading'}
                style={{
                  background: 'transparent',
                  border: `1px solid ${RED}`,
                  color: RED,
                  fontFamily: FONT,
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {state === 'loading' ? '...' : 'LOCK IN'}
              </button>
            </div>
            {(state === 'error' || state === 'dupe') && (
              <p style={{ fontSize: 11, color: state === 'dupe' ? '#ff8800' : RED, letterSpacing: '0.1em', margin: 0 }}>
                {msgMap[state]}
              </p>
            )}
          </form>
        ) : (
          <div style={{
            border: `1px solid ${RED}`,
            padding: '16px 24px',
            fontSize: 12,
            letterSpacing: '0.12em',
            color: RED,
            boxShadow: `0 0 20px ${RED_GLOW}`,
          }}>
            {msgMap.done}
          </div>
        )}
      </div>
      <Link to="/login" style={{
        position: 'absolute', bottom: 16, right: 18, zIndex: 10,
        fontSize: 10, color: RED_DIM, letterSpacing: '0.12em',
        textDecoration: 'none', fontFamily: FONT,
        border: `1px solid #3a0000`,
        padding: '4px 10px',
        opacity: 0.55,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
      >⬡ ADMIN LOGIN</Link>
    </div>
  );
}
