export function getAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  return { token, username, isLoggedIn: !!token };
}

export function setAuth(token, username) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
}
