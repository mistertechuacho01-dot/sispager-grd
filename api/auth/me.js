/**
 * SISPAGER-GRD — Auth: Me (session check)
 * GET /api/auth/me
 * Returns the currently authenticated user or 401.
 */
import { requireAuth, setCorsHeaders, jsonResponse, handleOptions } from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Método no permitido.' });

  const user = await requireAuth(req);
  if (!user) return jsonResponse(res, 401, { error: 'No autenticado.' });

  return jsonResponse(res, 200, {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    region: user.region
  });
}
