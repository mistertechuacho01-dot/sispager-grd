/**
 * SISPAGER-GRD — Users by ID API
 * GET    /api/users/[id]  → get user (admin only)
 * PUT    /api/users/[id]  → update user (admin only)
 * DELETE /api/users/[id]  → delete user (admin only)
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

  const userId = parseInt(req.query.id, 10);
  if (!userId || isNaN(userId)) {
    return jsonResponse(res, 400, { error: 'ID de usuario inválido.' });
  }

  try {
    await initDB();
    const db = getDB();

    // ── GET: get single user ──
    if (req.method === 'GET') {
      const users = await db`
        SELECT id, username, full_name, role, region, email, active, created_at, updated_at
        FROM users WHERE id = ${userId} LIMIT 1
      `;
      if (users.length === 0) return jsonResponse(res, 404, { error: 'Usuario no encontrado.' });
      const u = users[0];
      return jsonResponse(res, 200, {
        id: u.id, username: u.username, fullName: u.full_name,
        role: u.role, region: u.region, email: u.email,
        active: u.active, createdAt: u.created_at, updatedAt: u.updated_at
      });
    }

    // ── PUT: update user ──
    if (req.method === 'PUT') {
      const data = sanitizeObject(req.body || {});

      // Build update fields
      const updates = { updated_at: new Date().toISOString() };

      if (data.fullName !== undefined) updates.full_name = data.fullName.toUpperCase();
      if (data.role !== undefined && ['admin', 'collaborator'].includes(data.role)) updates.role = data.role;
      if (data.region !== undefined) updates.region = data.region.toUpperCase();
      if (data.email !== undefined) updates.email = data.email.toUpperCase();
      if (data.active !== undefined) updates.active = Boolean(data.active);

      if (data.password && data.password.trim()) {
        updates.password_hash = await bcrypt.hash(String(data.password).toUpperCase(), 12);
      }

      // Prevent removing the last admin
      if (updates.role === 'collaborator') {
        const existingUser = await db`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
        if (existingUser[0]?.role === 'admin') {
          const adminCount = await db`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`;
          if (parseInt(adminCount[0].c) <= 1) {
            return jsonResponse(res, 409, { error: 'No se puede remover el rol del único administrador.' });
          }
        }
      }

      await db`
        UPDATE users SET
          full_name    = COALESCE(${updates.full_name ?? null}, full_name),
          role         = COALESCE(${updates.role ?? null}, role),
          region       = COALESCE(${updates.region ?? null}, region),
          email        = COALESCE(${updates.email ?? null}, email),
          active       = COALESCE(${updates.active ?? null}, active),
          password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
          updated_at   = NOW()
        WHERE id = ${userId}
      `;

      return jsonResponse(res, 200, { success: true, message: 'Usuario actualizado.' });
    }

    // ── DELETE: remove user ──
    if (req.method === 'DELETE') {
      // Prevent deleting the last admin
      const user = await db`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
      if (user.length === 0) return jsonResponse(res, 404, { error: 'Usuario no encontrado.' });

      if (user[0].role === 'admin') {
        const adminCount = await db`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`;
        if (parseInt(adminCount[0].c) <= 1) {
          return jsonResponse(res, 409, { error: 'No se puede eliminar el único administrador.' });
        }
      }

      await db`DELETE FROM users WHERE id = ${userId}`;
      return jsonResponse(res, 200, { success: true, message: 'Usuario eliminado.' });
    }

    return jsonResponse(res, 405, { error: 'Método no permitido.' });

  } catch (err) {
    console.error('[Users/ID]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}
