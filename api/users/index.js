/**
 * SISPAGER-GRD — Users API
 * GET  /api/users  → list all users (admin only)
 * POST /api/users  → create user (admin only)
 */
import bcrypt from 'bcryptjs';
import { initDB, sql as getDB } from '../_db.js';
import {
  requireAdmin, sanitizeObject, setCorsHeaders, jsonResponse, handleOptions
} from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse(res, 403, { error: 'Acceso denegado. Se requiere rol administrador.' });

  try {
    await initDB();
    const db = getDB();

    // ── GET: list all users ──
    if (req.method === 'GET') {
      const users = await db`
        SELECT id, username, full_name, role, region, email, active, created_at, updated_at
        FROM users
        ORDER BY created_at ASC
      `;
      // Map to camelCase for frontend compatibility
      const mapped = users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        role: u.role,
        region: u.region,
        email: u.email,
        active: u.active,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));
      return jsonResponse(res, 200, mapped);
    }

    // ── POST: create user ──
    if (req.method === 'POST') {
      const data = sanitizeObject(req.body || {});
      const { username, password, fullName, role, region, email } = data;

      if (!username || !password) {
        return jsonResponse(res, 400, { error: 'Usuario y contraseña son obligatorios.' });
      }

      const upperUsername = username.trim().toUpperCase().substring(0, 100);

      // Check for duplicates
      const existing = await db`
        SELECT id FROM users WHERE username = ${upperUsername} LIMIT 1
      `;
      if (existing.length > 0) {
        return jsonResponse(res, 409, { error: `El usuario '${upperUsername}' ya existe.` });
      }

      const passwordHash = await bcrypt.hash(String(password).toUpperCase(), 12);

      const result = await db`
        INSERT INTO users (username, password_hash, full_name, role, region, email, active)
        VALUES (
          ${upperUsername},
          ${passwordHash},
          ${(fullName || '').toUpperCase()},
          ${['admin', 'collaborator'].includes(role) ? role : 'collaborator'},
          ${(region || '').toUpperCase()},
          ${(email || '').toUpperCase()},
          true
        )
        RETURNING id, username, full_name, role, region, email, active, created_at
      `;
      const u = result[0];
      return jsonResponse(res, 201, {
        id: u.id, username: u.username, fullName: u.full_name,
        role: u.role, region: u.region, email: u.email,
        active: u.active, createdAt: u.created_at
      });
    }

    return jsonResponse(res, 405, { error: 'Método no permitido.' });

  } catch (err) {
    console.error('[Users/Index]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}
