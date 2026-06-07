/**
 * SISPAGER-GRD — Stats API
 * GET /api/stats → aggregated statistics for dashboard & reports
 */
import { initDB, sql as getDB } from '../_db.js';
import { requireAuth, setCorsHeaders, jsonResponse, handleOptions } from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return jsonResponse(res, 405, { error: 'Método no permitido.' });

  const user = await requireAuth(req);
  if (!user) return jsonResponse(res, 401, { error: 'No autenticado.' });

  try {
    await initDB();
    const db = getDB();

    const isAdmin = user.role === 'admin';

    // Build base condition
    const records = isAdmin
      ? await db`SELECT region, subprocess, date, created_at, author_name, user_id FROM records`
      : await db`SELECT region, subprocess, date, created_at, author_name, user_id FROM records WHERE user_id = ${user.id}`;

    const total = records.length;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthCount = records.filter(r => {
      const d = new Date(r.date || r.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const uniqueRegions = new Set(records.map(r => r.region).filter(Boolean)).size;
    const myCount = records.filter(r => r.user_id === user.id).length;

    // By region
    const byRegion = {};
    records.forEach(r => { if (r.region) byRegion[r.region] = (byRegion[r.region] || 0) + 1; });

    // By subprocess
    const bySubprocess = {};
    records.forEach(r => { if (r.subprocess) bySubprocess[r.subprocess] = (bySubprocess[r.subprocess] || 0) + 1; });

    // By month (last 12)
    const byMonth = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    records.forEach(r => {
      const d = new Date(r.date || r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in byMonth) byMonth[key]++;
    });

    // By user (top 10)
    const byUserMap = {};
    records.forEach(r => {
      const a = r.author_name || 'Desconocido';
      byUserMap[a] = (byUserMap[a] || 0) + 1;
    });
    const byUser = Object.fromEntries(
      Object.entries(byUserMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
    );

    return jsonResponse(res, 200, {
      total, thisMonth: thisMonthCount, uniqueRegions, myCount,
      byRegion, bySubprocess, byMonth, byUser
    });

  } catch (err) {
    console.error('[Stats]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}
