import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import ProfileView from '../components/ProfileView';

export default function Profile() {
  const { username } = useParams();
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPublicProfile(username)
      .then(setData)
      .catch(() => setError('not found'));
  }, [username]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 72, fontWeight: 700, color: 'rgba(255,255,255,0.08)' }}>404</div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>This profile doesn't exist.</p>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return <ProfileView data={data} minHeight="100vh" />;
}
