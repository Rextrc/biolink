import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { getAuth } from './utils/auth';

function PrivateRoute({ children }) {
  const { isLoggedIn } = getAuth();
  return isLoggedIn ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = getAuth();
  if (!isLoggedIn) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/god" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="/:username" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}
