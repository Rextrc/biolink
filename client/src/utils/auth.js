export function getAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  return { token, username, isLoggedIn: !!token, isAdmin };
}

export function setAuth(token, username, isAdmin = false) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  localStorage.setItem('isAdmin', String(isAdmin));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('isAdmin');
}
