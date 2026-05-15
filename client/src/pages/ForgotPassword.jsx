import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }).catch(() => {});
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-7">
            <Zap size={20} className="text-indigo-400" />
            <span className="font-bold text-white text-lg tracking-tight">olik</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-white/38 text-sm mt-1.5">
            {sent ? 'Check your email for a reset link.' : "Enter your email or username and we'll send a reset link."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Email or Username</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#161616] border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
                placeholder="you@example.com or yourname"
                autoComplete="off"
                required
              />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25">
              {loading ? 'Sending…' : <><span>Send reset link</span><ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <p className="text-white/50 text-sm mb-6">If that account exists, a reset link is on its way. Check your spam too.</p>
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">Back to login</Link>
          </div>
        )}

        {!sent && (
          <p className="text-center text-white/35 text-sm mt-6">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
