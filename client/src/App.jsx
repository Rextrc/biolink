import { useState, useEffect } from 'react'; // useEffect used by AdminRoute
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './utils/api';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Verify from './pages/Verify';
import Inbox from './pages/Inbox';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Create from './pages/Create';
import Edit from './pages/Edit';
import Claim from './pages/Claim';
import UserPage from './pages/UserPage';
import { getAuth } from './utils/auth';

function AdminRoute({ children }) {
  const { isLoggedIn } = getAuth();
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!isLoggedIn) { setStatus('deny'); return; }
    api.admin.stats().then(() => setStatus('ok')).catch(() => setStatus('deny'));
  }, []);
  if (status === 'loading') return null;
  // Non-admins have nowhere to land now that the radar dashboard is gone,
  // so send them to the public landing page instead.
  if (status === 'deny') return <Navigate to={isLoggedIn ? '/' : '/login'} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/god" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/inbox" element={<AdminRoute><Inbox /></AdminRoute>} />
        <Route path="/create" element={<AdminRoute><Create /></AdminRoute>} />
        <Route path="/edit" element={<Edit />} />
        <Route path="/claim" element={<Claim />} />
        {/* Catch-all: any other single-segment path is a user page (olik.app/<slug>),
            falling back to the owner's main card when the slug doesn't exist. */}
        <Route path="/:slug" element={<UserPage />} />
      </Routes>
    </BrowserRouter>
  );
}
