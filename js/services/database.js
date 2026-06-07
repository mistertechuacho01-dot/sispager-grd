/**
 * SISPAGER-GRD - Database Service
 * Now backed by secure server-side API (Vercel Postgres/Neon).
 * Same public interface as Dexie.js version — UI modules need no changes.
 */

/**
 * Generic API caller.
 */
async function apiCall(path, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  const response = await fetch(path, { ...defaults, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${path}`);
  }
  return data;
}

/**
 * Build a URL with query parameters.
 */
function buildUrl(path, params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `${path}?${qs}` : path;
}

// ── Database Initialization ─────────────────────────────────────────────────

/**
 * No-op: DB init is handled server-side on first API call.
 * Kept for compatibility with app.js boot sequence.
 */
export async function initDatabase() {
  // Server initializes DB automatically on first request.
  // This is a no-op on the client side.
  return true;
}

// ── User Operations ─────────────────────────────────────────────────────────

/** Get all users (admin only) */
export async function getUsers() {
  return await apiCall('/api/users');
}

export const getAllUsers = getUsers;

/** Get a user by ID */
export async function getUserById(id) {
  return await apiCall(`/api/users/${id}`);
}

/** Get user by username — only used for login (handled server-side now) */
export async function getUserByUsername(username) {
  // Not used directly anymore; login calls /api/auth/login
  throw new Error('getUserByUsername is handled server-side.');
}

/** Create a new user */
export async function createUser(userData) {
  return await apiCall('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

/** Update an existing user */
export async function updateUser(id, userData) {
  return await apiCall(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

/** Delete a user */
export async function deleteUser(id) {
  return await apiCall(`/api/users/${id}`, {
    method: 'DELETE'
  });
}

// ── Record Operations ────────────────────────────────────────────────────────

/**
 * Get records with optional filters.
 */
export async function getRecords(filters = {}) {
  return await apiCall(buildUrl('/api/records', {
    region: filters.region,
    subprocess: filters.subprocess,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: filters.search,
    userId: filters.userId
  }));
}

export const getAllRecords = getRecords;

/** Get a single record by ID */
export async function getRecordById(id) {
  return await apiCall(`/api/records/${id}`);
}

/** Create a new record */
export async function createRecord(recordData) {
  return await apiCall('/api/records', {
    method: 'POST',
    body: JSON.stringify(recordData)
  });
}

/** Update an existing record */
export async function updateRecord(id, recordData) {
  return await apiCall(`/api/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(recordData)
  });
}

/** Delete a record */
export async function deleteRecord(id) {
  return await apiCall(`/api/records/${id}`, {
    method: 'DELETE'
  });
}

// ── Statistics ───────────────────────────────────────────────────────────────

/** Get aggregated stats for dashboard & reports */
export async function getRecordStats() {
  return await apiCall('/api/stats');
}

export async function getRecordsByRegion() {
  const stats = await getRecordStats();
  return stats.byRegion || {};
}

export async function getRecordsBySubprocess() {
  const stats = await getRecordStats();
  return stats.bySubprocess || {};
}

export async function getRecordsByMonth() {
  const stats = await getRecordStats();
  return stats.byMonth || {};
}

export async function getRecordsByUser() {
  const stats = await getRecordStats();
  return stats.byUser || {};
}

/**
 * Seed sample data — only usable if DB is empty.
 * Now it's a no-op because data is server-side.
 */
export async function seedSampleData() {
  console.log('[SISPAGER-GRD] Sample data seeding is handled server-side.');
}

export default {};
