const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = process.env.SPOTIFY_REDIRECT_URI;
const SCOPES        = 'user-read-currently-playing user-read-playback-state';

// Short-lived access token cache — Spotify access tokens last ~1hr, no need
// to hit the token endpoint on every /now-playing poll.
let tokenCache = { accessToken: null, expiresAt: 0 };

function getRefreshToken() {
  return db.prepare('SELECT refresh_token FROM spotify_auth WHERE id = 1').get()?.refresh_token || null;
}

function requireAdmin(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(decoded.userId);
  if (!user?.is_admin) throw new Error('not admin');
}

async function getAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) return tokenCache.accessToken;
  const refreshToken = getRefreshToken();
  if (!refreshToken || !CLIENT_ID || !CLIENT_SECRET) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

// Admin-only. Full-page redirect (not a fetch), so the JWT travels as a
// query param instead of an Authorization header.
router.get('/connect', (req, res) => {
  try {
    requireAdmin(req.query.token);
  } catch {
    return res.status(403).send('Admin only');
  }
  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(500).send('Spotify is not configured on the server (missing SPOTIFY_CLIENT_ID / SPOTIFY_REDIRECT_URI env vars).');
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Spotify redirects here after the owner approves access.
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/god?spotify=error');
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    });
    const data = await tokenRes.json();
    if (!data.refresh_token) throw new Error('no refresh token in response');
    db.prepare('UPDATE spotify_auth SET refresh_token = ? WHERE id = 1').run(data.refresh_token);
    res.redirect('/god?spotify=connected');
  } catch {
    res.redirect('/god?spotify=error');
  }
});

// Admin-only: whether an account is currently connected.
router.get('/status', (req, res) => {
  try {
    requireAdmin((req.headers['authorization'] || '').split(' ')[1]);
  } catch {
    return res.status(403).json({ error: 'Admin only' });
  }
  res.json({ connected: !!getRefreshToken(), configured: !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI) });
});

// Public: sanitized now-playing status for the landing page. Never exposes tokens.
router.get('/now-playing', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return res.json({ isPlaying: false });

    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.status === 204 || !r.ok) return res.json({ isPlaying: false });

    const data = await r.json();
    if (!data?.is_playing || !data.item || data.currently_playing_type !== 'track') {
      return res.json({ isPlaying: false });
    }
    res.json({
      isPlaying: true,
      track:    data.item.name,
      artist:   (data.item.artists || []).map(a => a.name).join(', '),
      albumArt: data.item.album?.images?.[1]?.url || data.item.album?.images?.[0]?.url || null,
      trackUrl: data.item.external_urls?.spotify || null,
    });
  } catch {
    res.json({ isPlaying: false });
  }
});

module.exports = router;
