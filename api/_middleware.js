/**
 * SISPAGER-GRD — API Security Middleware
 * JWT verification, rate limiting, input sanitization, CORS.
 */
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_RAW = process.env.JWT_SECRET || 'sispager-dev-secret-change-in-production-32chars';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_EXPIRY = '24h';
const COOKIE_NAME = 'sispager_token';

// ── In-memory rate limiter (resets on cold start; good enough for serverless) ──
const rateLimitStore = new Map();

/**
 * Generates a signed JWT token for a user payload.
 */
export async function generateToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setIssuer('sispager-grd')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'sispager-grd'
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts JWT from httpOnly cookie or Authorization header.
 */
export function getTokenFromRequest(req) {
  const cookie = req.headers?.cookie || '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match) return match[1];

  const auth = req.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  return null;
}

/**
 * Middleware: require authenticated user (any role).
 * Returns user payload or null.
 */
export async function requireAuth(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return await verifyToken(token);
}

/**
 * Middleware: require admin role.
 * Returns user payload or null.
 */
export async function requireAdmin(req) {
  const user = await requireAuth(req);
  if (!user || user.role !== 'admin') return null;
  return user;
}

/**
 * Builds a secure session cookie string.
 */
export function buildCookie(token) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd ? '; Secure' : '';
  const sameSite = isProd ? 'Strict' : 'Lax';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=86400${secure}; SameSite=${sameSite}`;
}

/**
 * Builds a cookie that immediately expires (for logout).
 */
export function buildExpiredCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`;
}

/**
 * Rate limiter: tracks key (e.g., IP) within a sliding window.
 * Returns { allowed, attemptsLeft, resetInMs }
 */
export function rateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let attempts = (rateLimitStore.get(key) || []).filter(t => t > windowStart);
  const allowed = attempts.length < maxAttempts;

  if (!allowed) {
    const resetInMs = (Math.min(...attempts) + windowMs) - now;
    return { allowed: false, attemptsLeft: 0, resetInMs };
  }

  attempts.push(now);
  rateLimitStore.set(key, attempts);
  return { allowed: true, attemptsLeft: maxAttempts - attempts.length, resetInMs: 0 };
}

/**
 * Clears rate limit for a key (e.g., on successful login).
 */
export function clearRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Sanitizes a string to prevent XSS. Strips HTML tags and trims whitespace.
 */
export function sanitizeString(val) {
  if (val == null) return '';
  return String(val)
    .replace(/<[^>]*>/g, '')  // strip HTML tags
    .replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c]))
    .trim();
}

/**
 * Sanitizes an object's string fields recursively.
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === 'string' ? sanitizeString(v) : v;
  }
  return result;
}

/**
 * Set standard CORS headers for API responses.
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Sends a JSON response with status code.
 */
export function jsonResponse(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(data);
}

/**
 * Handles pre-flight OPTIONS requests.
 */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
