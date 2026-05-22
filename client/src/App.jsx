import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './utils/api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HudPage from './pages/Hud';
import Admin from './pages/Admin';
import Verify from './pages/Verify';
import Inbox from './pages/Inbox';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ComingSoon from './pages/ComingSoon';
import { getAuth } from './utils/auth';

function PrivateRoute({ children }) {
  const { isLoggedIn } = getAuth();
  return isLoggedIn ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { isLoggedIn } = getAuth();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!isLoggedIn) { setStatus('deny'); return; }
    api.admin.stats().then(() => setStatus('ok')).catch(() => setStatus('deny'));
  }, []);
  if (status === 'loading') return null;
  if (status === 'deny') return <Navigate to={isLoggedIn ? '/dashboard' : '/login'} />;
  return children;
}

function useMode() {
  const [comingSoon, setComingSoon] = useState(null);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE || ''}/api/mode`)
      .then(r => r.json())
      .then(d => setComingSoon(d.comingSoon))
      .catch(() => setComingSoon(false));
  }, []);
  return comingSoon;
}

export default function App() {
  const comingSoon = useMode();
  if (comingSoon === null) return null; // brief blank while fetching

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={comingSoon ? <ComingSoon /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<PrivateRoute><HudPage /></PrivateRoute>} />
        <Route path="/god" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/inbox" element={<AdminRoute><Inbox /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
