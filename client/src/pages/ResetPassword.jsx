import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setError(''); setLoading(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
          <h1 className="text-2xl font-bold tracking-tight">New password</h1>
          <p className="text-white/38 text-sm mt-1.5">Choose a new password for your account</p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-white/50 text-sm">Password reset! Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
            {!token && <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">Invalid reset link.</div>}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/45 text-xs font-medium tracking-wide uppercase">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#161616] border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
                placeholder="Min 6 characters" autoComplete="new-password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/45 text-xs font-medium tracking-wide uppercase">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full bg-[#161616] border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20"
                placeholder="Repeat password" autoComplete="new-password" required />
            </div>
            <button type="submit" disabled={loading || !token}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25">
              {loading ? 'Saving…' : <><span>Set new password</span><ArrowRight size={15} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
