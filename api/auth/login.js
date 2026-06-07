/**
 * SISPAGER-GRD — Auth: Login
 * POST /api/auth/login
 * Validates credentials, applies rate limiting, issues httpOnly JWT cookie.
 */
import bcrypt from 'bcryptjs';
import { initDB, sql as getDB } from '../_db.js';
import {
  generateToken, buildCookie, rateLimit, clearRateLimit,
  setCorsHeaders, jsonResponse, handleOptions
} from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Método no permitido.' });

  try {
    await initDB();
    const db = getDB();

    // — Rate limiting by IP —
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      const mins = Math.ceil(rl.resetInMs / 60000);
      return jsonResponse(res, 429, {
        error: `Demasiados intentos. Espere ${mins} minuto(s) e intente nuevamente.`
      });
    }

    // — Input validation —
    const { username, password } = req.body || {};
    if (!username || !password) {
      return jsonResponse(res, 400, { error: 'Usuario y contraseña son obligatorios.' });
    }

    const upperUsername = String(username).trim().toUpperCase().substring(0, 100);

    // — Look up user —
    const users = await db`
      SELECT id, username, password_hash, full_name, role, region, active
      FROM users
      WHERE username = ${upperUsername}
      LIMIT 1
    `;

    if (users.length === 0) {
      // Record failed attempt in DB for audit
      await db`
        INSERT INTO login_attempts (username, ip) VALUES (${upperUsername}, ${ip})
      `.catch(() => {});
      return jsonResponse(res, 401, { error: 'Credenciales inválidas.' });
    }

    const user = users[0];

    if (!user.active) {
      return jsonResponse(res, 403, {
        error: 'Su cuenta está desactivada. Contacte al administrador.'
      });
    }

    // — Verify password with bcrypt —
    const passwordValid = await bcrypt.compare(
      String(password).toUpperCase(),
      user.password_hash
    );

    if (!passwordValid) {
      await db`
        INSERT INTO login_attempts (username, ip) VALUES (${upperUsername}, ${ip})
      `.catch(() => {});
      return jsonResponse(res, 401, { error: 'Credenciales inválidas.' });
    }

    // — Success: clear rate limit and issue token —
    clearRateLimit(`login:${ip}`);

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      region: user.region
    };

    const token = await generateToken(payload);
    res.setHeader('Set-Cookie', buildCookie(token));

    return jsonResponse(res, 200, { success: true, user: payload });

  } catch (err) {
    console.error('[Auth/Login]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}
