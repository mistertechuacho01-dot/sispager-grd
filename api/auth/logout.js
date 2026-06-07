/**
 * SISPAGER-GRD — Auth: Logout
 * POST /api/auth/logout
 * Clears the httpOnly session cookie.
 */
import { buildExpiredCookie, setCorsHeaders, jsonResponse, handleOptions } from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'Método no permitido.' });

  res.setHeader('Set-Cookie', buildExpiredCookie());
  return jsonResponse(res, 200, { success: true, message: 'Sesión cerrada correctamente.' });
}
