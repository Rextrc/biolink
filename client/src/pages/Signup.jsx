import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Check, X, ArrowRight } from 'lucide-react';
import { api } from '../utils/api';
import { setAuth } from '../utils/auth';

const RESERVED = ['dashboard', 'login', 'signup', 'api', 'admin', 'settings'];

export default function Signup() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ username: params.get('username') || '', email: '', password: '', invite_key: params.get('key') || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(form.username) && !RESERVED.includes(form.username);

  const submit = async (e) => {
    e.preventDefault();
    if (!usernameValid) return setError('Invalid username');
    setError(''); setLoading(true);
    try {
      const data = await api.signup(form);
      if (data.needsVerification) {
        navigate(`/verify?username=${data.username}`);
      } else {
        setAuth(data.token, data.username, data.isAdmin);
        navigate('/dashboard');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-7">
            <Zap size={20} className="text-indigo-400" />
            <span className="font-bold text-white text-lg tracking-tight">olik</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create your page</h1>
          <p className="text-white/38 text-sm mt-1.5">Free forever, no credit card needed</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm pointer-events-none">olik.app/</span>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className="w-full bg-white/4 border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl pl-24 pr-10 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
                placeholder="yourname"
                autoComplete="off"
                required
              />
              {form.username.length >= 3 && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {usernameValid
                    ? <Check size={14} className="text-emerald-400" />
                    : <X size={14} className="text-red-400" />}
                </div>
              )}
            </div>
            <p className="text-white/25 text-xs mt-0.5">3–20 chars · lowercase · letters, numbers, underscores</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full bg-white/4 border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full bg-white/4 border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
              placeholder="Min 6 characters"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Invite Key</label>
            <input
              type="text"
              value={form.invite_key}
              onChange={e => setForm(p => ({ ...p, invite_key: e.target.value.toUpperCase() }))}
              className="w-full bg-white/4 border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 font-mono tracking-widest"
              placeholder="OLIK-XXXX-XXXX-XXXX"
              autoComplete="off"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !usernameValid}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-40 hover:shadow-lg hover:shadow-indigo-500/25 mt-1"
          >
            {loading ? 'Creating account…' : <><span>Create account</span><ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="text-center text-white/35 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
