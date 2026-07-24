import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { setAuth } from '../utils/auth';

export default function Verify() {
  const [params] = useSearchParams();
  const username = params.get('username') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/auth/verify', { method: 'POST', body: JSON.stringify({ username, code }) });
      setAuth(data.token, data.username, data.isAdmin);
      navigate('/god');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    await apiFetch('/auth/resend-code', { method: 'POST', body: JSON.stringify({ username }) }).catch(() => {});
    setResent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-7">
            <Zap size={20} className="text-indigo-400" />
            <span className="font-bold text-white text-lg tracking-tight">olik</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-white/40 text-sm mt-2">We sent a 6-digit code to your email.<br />Enter it below to activate your account.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white/4 border border-white/8 hover:border-white/14 focus:border-indigo-500/60 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.4em] font-bold outline-none transition-colors"
            placeholder="000000"
            required
          />
          <button type="submit" disabled={loading || code.length !== 6} className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50">
            {loading ? 'Verifying…' : <><span>Verify</span><ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-6">
          Didn't get it?{' '}
          <button onClick={resend} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            {resent ? 'Sent!' : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}
