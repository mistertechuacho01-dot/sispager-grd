/**
 * SISPAGER-GRD - Authentication Service
 * Now backed by secure server-side API with JWT httpOnly cookies.
 * Same public interface as before — UI modules need no changes.
 */

const SESSION_KEY = 'sispager_session_cache';

/** Internal: cached user object (for sync reads like getCurrentUser) */
let _cachedUser = null;

// ── Restore cache from sessionStorage on page load ──────────────────────────
try {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    _cachedUser = JSON.parse(stored);
  }
} catch {
  /* ignore */
}

/**
 * Generic API caller with error handling.
 * Cookie is sent automatically (same-origin).
 */
async function apiCall(path, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  const response = await fetch(path, { ...defaults, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * Authenticate a user. Calls POST /api/auth/login.
 * On success, caches user in sessionStorage for sync reads.
 */
export async function login(username, password) {
  if (!username || !password) {
    throw new Error('El nombre de usuario y la contraseña son obligatorios.');
  }

  const data = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  _cachedUser = data.user;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user)); } catch { /* ignore */ }
  return data.user;
}

/**
 * Log out the current user. Calls POST /api/auth/logout.
 */
export async function logout() {
  _cachedUser = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  await apiCall('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

/**
 * Verify session with the server. Updates cached user.
 * Returns user or null.
 */
export async function verifySession() {
  try {
    const user = await apiCall('/api/auth/me');
    _cachedUser = user;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch { /* ignore */ }
    return user;
  } catch {
    _cachedUser = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    return null;
  }
}

/**
 * Sync read of current user (from cache).
 * Call verifySession() on app start for server-validated data.
 */
export function getCurrentUser() {
  return _cachedUser;
}

/** True if there is a cached user (session may still expire on server) */
export function isAuthenticated() {
  return _cachedUser !== null;
}

/** True if the cached user has admin role */
export function isAdmin() {
  return _cachedUser !== null && _cachedUser.role === 'admin';
}

/**
 * Require authentication. If not authenticated, dispatches navigation event.
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.dispatchEvent(new CustomEvent('sispager:navigate', {
      detail: { view: 'login', reason: 'auth_required' }
    }));
    return false;
  }
  return true;
}

/**
 * Require admin role. If not admin, dispatches navigation event.
 */
export function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    window.dispatchEvent(new CustomEvent('sispager:navigate', {
      detail: { view: 'dashboard', reason: 'admin_required' }
    }));
    return false;
  }
  return true;
}
