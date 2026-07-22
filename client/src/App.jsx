import { useState, useEffect } from 'react'; // useEffect used by AdminRoute
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
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
