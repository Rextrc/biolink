import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Zap, Palette, Link2, Star, Check } from 'lucide-react';

export default function Landing() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleClaim = (e) => {
    e.preventDefault();
    if (username.trim()) navigate(`/signup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-indigo-600/12 blur-[140px]" />
        <div className="absolute top-40 -left-20 w-[400px] h-[400px] rounded-full bg-purple-700/8 blur-[120px]" />
        <div className="absolute top-60 -right-20 w-[350px] h-[350px] rounded-full bg-indigo-500/6 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="text-indigo-400" size={22} />
          <span className="font-bold text-lg tracking-tight">BioLink</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/25">Sign up free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-300 text-sm mb-6">
            <Star size={13} fill="currentColor" />
            <span>The cleanest link-in-bio tool</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
            One link.<br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Endless possibilities.</span>
          </h1>
          <p className="text-white/45 text-lg mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Create a stunning, fully customizable profile page that houses all your links. Built for creators, brands, and everyone in between.
          </p>

          <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0">
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 hover:border-white/20 rounded-full px-5 py-3 transition-colors focus-within:border-indigo-500/60">
              <span className="text-white/25 text-sm mr-1 shrink-0">biolink.me/</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname"
                className="flex-1 bg-transparent text-white placeholder:text-white/20 text-sm outline-none"
              />
            </div>
            <button type="submit" className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-indigo-500/30 shrink-0">
              Claim yours <ArrowRight size={15} />
            </button>
          </form>

          <div className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-sm text-white/35">
            {['Free forever', 'No credit card', 'Setup in 2 min'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <Check size={12} className="text-emerald-400 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 -m-8 rounded-full bg-indigo-600/10 blur-[60px] pointer-events-none" />
          <div
            className="relative w-64 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #13102a, #1e1040)', height: 480 }}
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
            {/* Status bar */}
            <div className="h-10 flex items-end justify-between px-6 pb-1.5 text-[10px] text-white/40">
              <span>9:41</span><span className="flex gap-1">▪▪▪</span>
            </div>
            <div className="px-5 py-3 flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src="https://i.pravatar.cc/150?img=32"
                  alt=""
                  style={{ width: 72, height: 72, boxShadow: '0 0 28px rgba(139,92,246,0.55)' }}
                  className="rounded-full border-2 border-purple-400/60"
                />
                <div className="absolute inset-0 rounded-full ring-1 ring-purple-400/20" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm text-white">Alex Rivers</div>
                <div className="text-xs mt-0.5 text-purple-300/80">Creator · Designer · Dreamer ✨</div>
              </div>
              <div className="w-full flex flex-col gap-2.5 mt-1">
                {['My Portfolio', 'Latest Project'].map(t => (
                  <div key={t} className="w-full text-center text-xs py-2.5 rounded-full font-semibold tracking-wide" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>{t}</div>
                ))}
              </div>
              <div className="flex gap-3 mt-1">
                {['IG', 'X', 'TT'].map(s => (
                  <div key={s} className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-[10px] text-white/60 font-medium">{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Everything you need</h2>
          <p className="text-white/35 text-base">Powerful features, beautifully simple.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: <Palette size={20} className="text-purple-400" />,
              accent: 'bg-purple-500/10 group-hover:bg-purple-500/15',
              border: 'group-hover:border-purple-500/20',
              title: 'Fully Customizable',
              desc: 'Choose themes, colors, fonts, button styles, and more. Make it truly yours.',
            },
            {
              icon: <Link2 size={20} className="text-blue-400" />,
              accent: 'bg-blue-500/10 group-hover:bg-blue-500/15',
              border: 'group-hover:border-blue-500/20',
              title: 'Unlimited Links',
              desc: 'Add custom links, social profiles, and more. No limits on what you can share.',
            },
            {
              icon: <Zap size={20} className="text-amber-400" />,
              accent: 'bg-amber-500/10 group-hover:bg-amber-500/15',
              border: 'group-hover:border-amber-500/20',
              title: 'Instant Preview',
              desc: 'See exactly how your profile looks as you edit it. Real-time updates.',
            },
          ].map(f => (
            <div key={f.title} className={`group glass rounded-2xl p-7 border border-white/8 ${f.border} hover:border-opacity-100 transition-all duration-200 hover:-translate-y-0.5`}>
              <div className={`w-10 h-10 rounded-xl ${f.accent} flex items-center justify-center mb-5 transition-colors`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-[15px] mb-2">{f.title}</h3>
              <p className="text-white/38 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative max-w-6xl mx-auto px-6 pb-20">
        <div className="relative rounded-3xl p-px overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.25), rgba(255,255,255,0.04))' }}>
          <div className="relative bg-[#0e0e16] rounded-3xl px-8 py-16 text-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-indigo-600/10 blur-[80px]" />
            </div>
            <h2 className="relative text-3xl font-bold tracking-tight mb-3">Ready to get started?</h2>
            <p className="relative text-white/38 mb-8 text-base">Join thousands of creators already using BioLink.</p>
            <Link
              to="/signup"
              className="relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-9 py-3.5 rounded-full font-medium transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30 text-sm"
            >
              Create your page <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
