/**
 * SISPAGER-GRD — Records API
 * GET  /api/records  → list records (admin: all, collaborator: own)
 * POST /api/records  → create record (authenticated users)
 */
import { initDB, sql as getDB } from '../_db.js';
import {
  requireAuth, sanitizeObject, setCorsHeaders, jsonResponse, handleOptions
} from '../_middleware.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  const user = await requireAuth(req);
  if (!user) return jsonResponse(res, 401, { error: 'No autenticado.' });

  try {
    await initDB();
    const db = getDB();

    // ── GET: list records with filters ──
    if (req.method === 'GET') {
      const { region, subprocess, dateFrom, dateTo, search, userId } = req.query || {};

      let records;

      if (user.role === 'admin') {
        // Admin sees all
        records = await db`
          SELECT r.*, u.username, u.full_name as user_full_name
          FROM records r
          LEFT JOIN users u ON r.user_id = u.id
          ORDER BY r.created_at DESC
        `;
      } else {
        // Collaborator sees only their records
        records = await db`
          SELECT r.*, u.username, u.full_name as user_full_name
          FROM records r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.user_id = ${user.id}
          ORDER BY r.created_at DESC
        `;
      }

      // Apply JS-side filters (Postgres doesn't support all dynamic filter combos easily)
      let filtered = records;

      if (region) filtered = filtered.filter(r => r.region === region);
      if (subprocess) filtered = filtered.filter(r => r.subprocess === subprocess);
      if (dateFrom) filtered = filtered.filter(r => r.date && new Date(r.date) >= new Date(dateFrom));
      if (dateTo) filtered = filtered.filter(r => r.date && new Date(r.date) <= new Date(dateTo));
      if (userId && user.role === 'admin') {
        filtered = filtered.filter(r => String(r.user_id) === String(userId));
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r =>
          [r.author_name, r.user_name, r.region, r.province, r.district,
           r.subprocess, r.problem, r.impact, r.lesson, r.lesson_learned,
           r.recommendations, r.approved_by]
            .some(f => f && String(f).toLowerCase().includes(q))
        );
      }

      // Map snake_case → camelCase for frontend
      return jsonResponse(res, 200, filtered.map(mapRecord));
    }

    // ── POST: create record ──
    if (req.method === 'POST') {
      const data = sanitizeObject(req.body || {});

      const result = await db`
        INSERT INTO records (
          user_id, author_name, user_name, date, region, province, district, subprocess,
          problem, impact, lesson, lesson_learned, recommendations,
          check_procedure, check_normative, check_diffusion, check_instructive,
          check_coordinate, coordinate_with, check_convene, convene_entities,
          other_recommendation, approved_by, electronic_signature, audit_trail
        ) VALUES (
          ${user.id},
          ${(data.authorName || data.userName || user.fullName || '').toUpperCase()},
          ${(data.userName || data.authorName || user.username || '').toUpperCase()},
          ${data.date || null},
          ${(data.region || '').toUpperCase()},
          ${(data.province || '').toUpperCase()},
          ${(data.district || '').toUpperCase()},
          ${data.subprocess || ''},
          ${data.problem || ''},
          ${data.impact || ''},
          ${data.lesson || data.lessonLearned || ''},
          ${data.lessonLearned || data.lesson || ''},
          ${data.recommendations || ''},
          ${data.checkProcedure || false},
          ${data.checkNormative || false},
          ${data.checkDiffusion || false},
          ${data.checkInstructive || false},
          ${data.checkCoordinate || false},
          ${data.coordinateWith || ''},
          ${data.checkConvene || false},
          ${data.conveneEntities || ''},
          ${data.otherRecommendation || ''},
          ${data.approvedBy || ''},
          ${data.electronicSignature || ''},
          ${'[]'}::jsonb
        )
        RETURNING *
      `;

      return jsonResponse(res, 201, mapRecord(result[0]));
    }

    return jsonResponse(res, 405, { error: 'Método no permitido.' });

  } catch (err) {
    console.error('[Records/Index]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}

/** Maps a DB record row (snake_case) to frontend format (camelCase) */
function mapRecord(r) {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    userName: r.user_name,
    date: r.date,
    region: r.region,
    province: r.province,
    district: r.district,
    subprocess: r.subprocess,
    problem: r.problem,
    impact: r.impact,
    lesson: r.lesson,
    lessonLearned: r.lesson_learned,
    recommendations: r.recommendations,
    checkProcedure: r.check_procedure,
    checkNormative: r.check_normative,
    checkDiffusion: r.check_diffusion,
    checkInstructive: r.check_instructive,
    checkCoordinate: r.check_coordinate,
    coordinateWith: r.coordinate_with,
    checkConvene: r.check_convene,
    conveneEntities: r.convene_entities,
    otherRecommendation: r.other_recommendation,
    approvedBy: r.approved_by,
    electronicSignature: r.electronic_signature,
    auditTrail: r.audit_trail || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
