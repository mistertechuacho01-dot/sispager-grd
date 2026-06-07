/**
 * SISPAGER-GRD — Record by ID API
 * GET    /api/records/[id]  → get single record
 * PUT    /api/records/[id]  → update record (respects post-approval lock)
 * DELETE /api/records/[id]  → delete record
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

  const recordId = parseInt(req.query.id, 10);
  if (!recordId || isNaN(recordId)) {
    return jsonResponse(res, 400, { error: 'ID de registro inválido.' });
  }

  try {
    await initDB();
    const db = getDB();

    // Fetch the record
    const rows = await db`SELECT * FROM records WHERE id = ${recordId} LIMIT 1`;
    if (rows.length === 0) return jsonResponse(res, 404, { error: 'Registro no encontrado.' });
    const record = rows[0];

    // Access control: non-admin can only access their own records
    if (user.role !== 'admin' && record.user_id !== user.id) {
      return jsonResponse(res, 403, { error: 'Acceso denegado a este registro.' });
    }

    // ── GET ──
    if (req.method === 'GET') {
      return jsonResponse(res, 200, mapRecord(record));
    }

    // ── PUT: update ──
    if (req.method === 'PUT') {
      const data = sanitizeObject(req.body || {});
      const isApproved = record.approved_by && record.electronic_signature;

      // Post-approval lock: collaborator cannot edit approved records
      if (isApproved && user.role !== 'admin' && record.user_id !== user.id) {
        return jsonResponse(res, 403, {
          error: 'Este registro está aprobado y bloqueado. Solo el administrador o el aprobador pueden editarlo.'
        });
      }

      // Collaborator cannot touch approval fields
      let approvedBy = record.approved_by;
      let electronicSignature = record.electronic_signature;
      if (user.role === 'admin') {
        if (data.approvedBy !== undefined) approvedBy = data.approvedBy;
        if (data.electronicSignature !== undefined) electronicSignature = data.electronicSignature;
      }

      // Build audit trail entry if editing an approved record
      let auditTrail = record.audit_trail || [];
      if (isApproved) {
        auditTrail = [
          ...auditTrail,
          {
            userId: user.id,
            username: user.username,
            role: user.role,
            action: 'Edición post-aprobación',
            timestamp: new Date().toISOString()
          }
        ];
      }

      await db`
        UPDATE records SET
          date                 = COALESCE(${data.date ?? null}, date),
          region               = COALESCE(${data.region ? data.region.toUpperCase() : null}, region),
          province             = COALESCE(${data.province ? data.province.toUpperCase() : null}, province),
          district             = COALESCE(${data.district ? data.district.toUpperCase() : null}, district),
          subprocess           = COALESCE(${data.subprocess ?? null}, subprocess),
          problem              = COALESCE(${data.problem ?? null}, problem),
          impact               = COALESCE(${data.impact ?? null}, impact),
          lesson               = COALESCE(${data.lesson ?? data.lessonLearned ?? null}, lesson),
          lesson_learned       = COALESCE(${data.lessonLearned ?? data.lesson ?? null}, lesson_learned),
          recommendations      = COALESCE(${data.recommendations ?? null}, recommendations),
          check_procedure      = COALESCE(${data.checkProcedure ?? null}, check_procedure),
          check_normative      = COALESCE(${data.checkNormative ?? null}, check_normative),
          check_diffusion      = COALESCE(${data.checkDiffusion ?? null}, check_diffusion),
          check_instructive    = COALESCE(${data.checkInstructive ?? null}, check_instructive),
          check_coordinate     = COALESCE(${data.checkCoordinate ?? null}, check_coordinate),
          coordinate_with      = COALESCE(${data.coordinateWith ?? null}, coordinate_with),
          check_convene        = COALESCE(${data.checkConvene ?? null}, check_convene),
          convene_entities     = COALESCE(${data.conveneEntities ?? null}, convene_entities),
          other_recommendation = COALESCE(${data.otherRecommendation ?? null}, other_recommendation),
          approved_by          = ${approvedBy},
          electronic_signature = ${electronicSignature},
          audit_trail          = ${JSON.stringify(auditTrail)}::jsonb,
          updated_at           = NOW()
        WHERE id = ${recordId}
      `;

      return jsonResponse(res, 200, { success: true, message: 'Registro actualizado.' });
    }

    // ── DELETE ──
    if (req.method === 'DELETE') {
      const isApproved = record.approved_by && record.electronic_signature;

      // Only admin can delete approved records
      if (isApproved && user.role !== 'admin') {
        return jsonResponse(res, 403, {
          error: 'No se puede eliminar un registro aprobado.'
        });
      }

      // Collaborator can only delete their own records
      if (user.role !== 'admin' && record.user_id !== user.id) {
        return jsonResponse(res, 403, { error: 'No puede eliminar registros de otros usuarios.' });
      }

      await db`DELETE FROM records WHERE id = ${recordId}`;
      return jsonResponse(res, 200, { success: true, message: 'Registro eliminado.' });
    }

    return jsonResponse(res, 405, { error: 'Método no permitido.' });

  } catch (err) {
    console.error('[Records/ID]', err);
    return jsonResponse(res, 500, { error: 'Error interno del servidor.' });
  }
}

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
