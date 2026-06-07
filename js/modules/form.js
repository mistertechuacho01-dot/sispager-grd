// ============================================================================
// SISPAGER-GRD :: Form Module (Lessons Learned Official Form)
// ============================================================================
import { getCurrentUser } from '../services/auth.js';
import { createRecord, updateRecord, deleteRecord, getRecordById } from '../services/database.js';
import { showPrintDialog } from '../services/export.js';
import { validateForm } from '../utils/validators.js';
import { SUBPROCESSES, REGIONS, PROVINCES, LOCATIONS } from '../utils/constants.js';
import { renderHeader, initHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { showConfirm, showModal, closeModal } from '../components/modal.js';
import { generateLesson, generateRecommendations } from '../services/ai.js';

/**
 * Render the lessons learned form
 * @param {HTMLElement} container - Main content container
 * @param {Function} navigate - Navigation callback
 * @param {string} [editId] - If provided, loads record for editing
 */
export async function renderForm(container, navigate, editId) {
  const user = getCurrentUser();
  const isEdit = !!editId;
  let existingRecord = null;

  if (isEdit) {
    try {
      existingRecord = await getRecordById(editId);
      if (!existingRecord) {
        showToast('Registro no encontrado', 'error');
        navigate('explorer');
        return;
      }
    } catch (err) {
      showToast('Error al cargar el registro', 'error');
      navigate('explorer');
      return;
    }
  }

  const r = existingRecord || {};
  const isApproved = !!(r.approvedBy && r.approvedBy.trim());
  const isOwner = !isEdit || r.userId === user.id;
  const isAdminUser = user.role === 'admin';
  const isApprover = isEdit && r.approvedBy && user.fullName.toUpperCase() === r.approvedBy.trim().toUpperCase();

  let canEdit = true;
  let bannerHtml = '';

  if (isEdit) {
    if (!isAdminUser && !isOwner) {
      showToast('No tiene permisos para ver o modificar este registro.', 'error');
      navigate('explorer');
      return;
    }

    if (isApproved) {
      if (!isAdminUser && !isApprover) {
        canEdit = false;
        bannerHtml = `
          <div class="alert-banner warning" style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--color-danger); padding: var(--space-4); border-radius: var(--radius-md); display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-5);">
            <i data-lucide="lock" style="color: var(--color-danger); flex-shrink: 0; width: 20px; height: 20px;"></i>
            <span style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.5;">
              <strong>REGISTRO CERRADO:</strong> Este documento ya ha sido aprobado. Los colaboradores no pueden realizar modificaciones. Solo el administrador o el aprobador original (${r.approvedBy}) tienen permisos para corregir este registro.
            </span>
          </div>
        `;
      } else {
        bannerHtml = `
          <div class="alert-banner info" style="background: rgba(0, 103, 177, 0.1); border-left: 4px solid var(--color-primary); padding: var(--space-4); border-radius: var(--radius-md); display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-5);">
            <i data-lucide="shield-alert" style="color: var(--color-primary); flex-shrink: 0; width: 20px; height: 20px;"></i>
            <span style="color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: 1.5;">
              <strong>EDICIÓN DE AUDITORÍA:</strong> Este registro ya se encuentra aprobado. Cualquier cambio que guarde quedará registrado bajo su usuario en la bitácora de auditoría histórica.
            </span>
          </div>
        `;
      }
    }
  }

  // Build subprocess options
  const subprocessOpts = SUBPROCESSES.map(s =>
    `<option value="${s.id}" ${r.subprocess === s.id ? 'selected' : ''}>${s.label}</option>`
  ).join('');

  // Build region options
  const regionOpts = REGIONS.map(region =>
    `<option value="${region}" ${r.region === region ? 'selected' : ''}>${region}</option>`
  ).join('');

  // Build province options (based on current region)
  const currentProvinces = r.region && PROVINCES[r.region] ? PROVINCES[r.region] : [];
  const provinceOpts = currentProvinces.map(p =>
    `<option value="${p}" ${r.province === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  // Build district options (based on current region & province)
  const currentDistricts = r.region && r.province && LOCATIONS[r.region] && LOCATIONS[r.region][r.province]
    ? LOCATIONS[r.region][r.province]
    : [];
  const districtOpts = currentDistricts.map(d =>
    `<option value="${d}" ${r.district === d ? 'selected' : ''}>${d}</option>`
  ).join('');

  // Recommendations checkboxes
  const recs = r.recommendations || {};

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto; width: 100%;">
      ${renderHeader(
        isEdit ? 'Editar Registro' : 'Nuevo Registro',
        'Lecciones aprendidas en el Proceso de Respuesta',
        isEdit && canEdit ? `<button class="btn btn-danger btn-sm" id="btn-delete-record"><i data-lucide="trash-2"></i> Eliminar</button>` : ''
      )}

      <div class="form-wrapper">
        ${bannerHtml}
      <form class="lesson-form" id="lesson-form" novalidate>
        <!-- Section 1: Header Info -->
        <div class="form-section">
          <div class="form-section-title">
            <i data-lucide="info"></i>
            <span>Información General</span>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label" for="field-subprocess">Subproceso <span class="required">*</span></label>
              <select id="field-subprocess" class="form-control" ${!canEdit ? 'disabled' : ''} required>
                <option value="">Seleccione un subproceso</option>
                ${subprocessOpts}
              </select>
              <span class="form-error" id="error-subprocess"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="field-date">Fecha <span class="required">*</span></label>
              <input type="date" id="field-date" class="form-control" value="${r.date || ''}" ${!canEdit ? 'disabled' : ''} required />
              <span class="form-error" id="error-date"></span>
            </div>
          </div>
        </div>

        <!-- Section 2: Location -->
        <div class="form-section">
          <div class="form-section-title">
            <i data-lucide="map-pin"></i>
            <span>Ubicación</span>
          </div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label" for="field-region">Región <span class="required">*</span></label>
              <select id="field-region" class="form-control" ${!canEdit ? 'disabled' : ''} required>
                <option value="">Seleccione una región</option>
                ${regionOpts}
              </select>
              <span class="form-error" id="error-region"></span>
            </div>
            <div class="form-group">
              <label class="form-label" for="field-province">Provincia</label>
              <select id="field-province" class="form-control" ${!canEdit ? 'disabled' : ''}>
                <option value="">Seleccione una provincia</option>
                ${provinceOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="field-district">Distrito</label>
              <select id="field-district" class="form-control" ${!canEdit ? 'disabled' : ''}>
                <option value="">Seleccione un distrito</option>
                ${districtOpts}
              </select>
            </div>
          </div>
        </div>

        <!-- Section 3: Problem -->
        <div class="form-section">
          <div class="form-section-title">
            <i data-lucide="alert-triangle"></i>
            <span>Problema / Situación</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-problem">
              Qué sucedió. <span class="required">*</span>
            </label>
            <textarea id="field-problem" class="form-control form-textarea" rows="5"
              placeholder="Describa el problema o situación que se presentó..." ${!canEdit ? 'disabled' : ''} required>${r.problem || ''}</textarea>
            <span class="form-error" id="error-problem"></span>
          </div>
        </div>

        <!-- Section 4: Impact -->
        <div class="form-section">
          <div class="form-section-title">
            <i data-lucide="activity"></i>
            <span>Impacto</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-impact">
              Consecuencias positivas o negativas. <span class="required">*</span>
            </label>
            <textarea id="field-impact" class="form-control form-textarea" rows="5"
              placeholder="Describa las consecuencias positivas o negativas..." ${!canEdit ? 'disabled' : ''} required>${r.impact || ''}</textarea>
            <span class="form-error" id="error-impact"></span>
          </div>
        </div>

        <!-- Section 5: Lesson Learned -->
        <div class="form-section">
          <div class="form-section-title" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <i data-lucide="lightbulb"></i>
              <span>Lección Aprendida</span>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="btn-ai-lesson" ${!canEdit ? 'disabled style="display: none;"' : ''} style="gap: var(--space-1.5); padding: 6px 12px; height: 32px; border-color: var(--color-primary-light); color: var(--color-primary-light);">
              <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
              <span>Protocolo IA</span>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-lesson">
              El conocimiento clave extraído de la experiencia. <span class="required">*</span>
            </label>
            <textarea id="field-lesson" class="form-control form-textarea" rows="5"
              placeholder="Describa la lección aprendida..." ${!canEdit ? 'disabled' : ''} required>${r.lessonLearned || ''}</textarea>
            <span class="form-error" id="error-lessonLearned"></span>
          </div>
        </div>

        <!-- Section 6: Plan de Acción Operativo Sugerido (Recomendaciones) -->
        <div class="form-section">
          <div class="form-section-title" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <i data-lucide="check-square"></i>
              <span>Plan de Acción Operativo Sugerido (Recomendaciones)</span>
            </div>
            <button type="button" class="btn btn-outline btn-sm" id="btn-ai-recommendations" ${!canEdit ? 'disabled style="display: none;"' : ''} style="gap: var(--space-1.5); padding: 6px 12px; height: 32px; border-color: var(--color-primary-light); color: var(--color-primary-light);">
              <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
              <span>Asistente Plan de Acción IA</span>
            </button>
          </div>
          <p class="form-help-text">Acciones prácticas y específicas para mejorar futuras intervenciones.</p>
          
          <div class="recommendations-grid">
            <label class="checkbox-label">
              <input type="checkbox" id="rec-procedure" ${recs.procedure ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} />
              <span class="checkbox-custom"></span>
              <span>Preparar un procedimiento</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="rec-normative" ${recs.normative ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} />
              <span class="checkbox-custom"></span>
              <span>Incluir en un proyecto normativo</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="rec-diffusion" ${recs.diffusion ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} />
              <span class="checkbox-custom"></span>
              <span>Difusión inmediata</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="rec-instructive" ${recs.instructive ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} />
              <span class="checkbox-custom"></span>
              <span>Preparar instructivo</span>
            </label>
          </div>

          <div class="form-row form-row-2" style="margin-top: 1rem;">
            <div class="form-group">
              <label class="form-label" for="rec-coordinate">Coordinar con:</label>
              <input type="text" id="rec-coordinate" class="form-control"
                value="${recs.coordinateWith || ''}" placeholder="Especifique entidades..." ${!canEdit ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label" for="rec-convene">Convocar a Entidades de Primer Respuesta competentes:</label>
              <input type="text" id="rec-convene" class="form-control"
                value="${recs.conveneEntities || ''}" placeholder="Especifique entidades..." ${!canEdit ? 'disabled' : ''} />
            </div>
          </div>

          <div class="form-group" style="margin-top: 0.5rem;">
            <label class="form-label" for="rec-other">Otro:</label>
            <input type="text" id="rec-other" class="form-control"
              value="${recs.other || ''}" placeholder="Otra recomendación..." ${!canEdit ? 'disabled' : ''} />
          </div>
        </div>

        <!-- Section 7: Approval -->
        <div class="form-section">
          <div class="form-section-title">
            <i data-lucide="award"></i>
            <span>Aprobación</span>
          </div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label" for="field-approved-by">Aprobado por</label>
              <input type="text" id="field-approved-by" class="form-control"
                value="${r.approvedBy || ''}" placeholder="Nombre del aprobador" ${(!canEdit || !isAdminUser) ? 'disabled' : ''} />
            </div>
            <div class="form-group">
              <label class="form-label" for="field-signature">Firma Electrónica</label>
              <input type="text" id="field-signature" class="form-control"
                value="${r.signature || ''}" placeholder="Firma electrónica" ${(!canEdit || !isAdminUser) ? 'disabled' : ''} />
            </div>
          </div>
        </div>

        <!-- Section: Audit Trail -->
        ${r.auditTrail && r.auditTrail.length > 0 ? `
          <div class="form-section audit-section" style="margin-top: var(--space-6);">
            <div class="form-section-title">
              <i data-lucide="history"></i>
              <span>Historial de Auditoría (Correcciones Post-Aprobación)</span>
            </div>
            <div class="audit-history-list" style="background: var(--color-surface-light); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); border: 1px solid var(--color-border);">
              ${r.auditTrail.map((entry, idx) => `
                <div class="audit-entry" style="font-size: var(--font-size-sm); border-bottom: ${idx < r.auditTrail.length - 1 ? '1px solid var(--color-border)' : 'none'}; padding-bottom: ${idx < r.auditTrail.length - 1 ? 'var(--space-2)' : '0'};">
                  <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
                    <span style="font-weight: var(--font-weight-semibold); color: var(--color-text-secondary);">${entry.userName} (${entry.userRole.toUpperCase()})</span>
                    <span style="color: var(--color-text-tertiary); font-size: var(--font-size-xs);">${new Date(entry.date).toLocaleString('es-PE')}</span>
                  </div>
                  <div style="color: var(--color-text-tertiary); font-size: var(--font-size-xs);">
                    Acción: <span style="font-weight: var(--font-weight-medium); color: var(--color-text-secondary);">${entry.action}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Actions Bar -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel">
            <i data-lucide="x"></i>
            <span>Cancelar</span>
          </button>
          <button type="submit" class="btn btn-primary" id="btn-save" ${!canEdit ? 'style="display: none;"' : ''}>
            <i data-lucide="save"></i>
            <span>${isEdit ? 'Actualizar' : 'Guardar'} Registro</span>
          </button>
        </div>
      </form>
    </div>
  </div>
  `;

  initHeader();
  if (window.lucide) window.lucide.createIcons();

  // ---- Province & District cascading ----
  const regionSelect = document.getElementById('field-region');
  const provinceSelect = document.getElementById('field-province');
  const districtSelect = document.getElementById('field-district');

  if (regionSelect && provinceSelect && districtSelect) {
    // Region change handler
    regionSelect.addEventListener('change', () => {
      const region = regionSelect.value;
      const provinces = region && PROVINCES[region] ? PROVINCES[region] : [];
      
      // Update provinces select
      provinceSelect.innerHTML = `<option value="">Seleccione una provincia</option>` +
        provinces.map(p => `<option value="${p}">${p}</option>`).join('');
      
      // Reset districts select
      districtSelect.innerHTML = `<option value="">Seleccione un distrito</option>`;
    });

    // Province change handler
    provinceSelect.addEventListener('change', () => {
      const region = regionSelect.value;
      const province = provinceSelect.value;
      
      const districts = region && province && LOCATIONS[region] && LOCATIONS[region][province]
        ? LOCATIONS[region][province]
        : [];
      
      // Update districts select
      districtSelect.innerHTML = `<option value="">Seleccione un distrito</option>` +
        districts.map(d => `<option value="${d}">${d}</option>`).join('');
    });
  }

  // ---- AI Lesson Learned ----
  const btnAiLesson = document.getElementById('btn-ai-lesson');
  if (btnAiLesson) {
    btnAiLesson.addEventListener('click', async () => {
      const problemVal = document.getElementById('field-problem').value.trim();
      const impactVal = document.getElementById('field-impact').value.trim();

      if (!problemVal || !impactVal) {
        showToast('Por favor, complete los campos de Problema/Situación e Impacto antes de usar el Protocolo IA.', 'warning');
        return;
      }

      btnAiLesson.disabled = true;
      const originalText = btnAiLesson.innerHTML;
      btnAiLesson.innerHTML = '<span class="btn-spinner"></span><span>Analizando...</span>';

      try {
        const lesson = await generateLesson(problemVal, impactVal);
        const lessonTextarea = document.getElementById('field-lesson');
        if (lessonTextarea) {
          lessonTextarea.value = lesson.toUpperCase();
          lessonTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        showToast('Lección aprendida sugerida con éxito', 'success');
      } catch (err) {
        showToast('Error al generar la lección aprendida', 'error');
        console.error(err);
      } finally {
        btnAiLesson.disabled = false;
        btnAiLesson.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ---- AI Suggested Recommendations ----
  const btnAiRecs = document.getElementById('btn-ai-recommendations');
  if (btnAiRecs) {
    btnAiRecs.addEventListener('click', async () => {
      const problemVal = document.getElementById('field-problem').value.trim();
      const impactVal = document.getElementById('field-impact').value.trim();
      const lessonVal = document.getElementById('field-lesson').value.trim();

      if (!problemVal || !impactVal || !lessonVal) {
        showToast('Por favor, complete los campos de Problema/Situación, Impacto y Lección Aprendida antes de usar el Asistente de Plan de Acción.', 'warning');
        return;
      }

      btnAiRecs.disabled = true;
      const originalText = btnAiRecs.innerHTML;
      btnAiRecs.innerHTML = '<span class="btn-spinner"></span><span>Analizando...</span>';

      try {
        const recsObj = await generateRecommendations(problemVal, impactVal, lessonVal);

        // Update checkboxes
        const chkProcedure = document.getElementById('rec-procedure');
        if (chkProcedure) {
          chkProcedure.checked = !!recsObj.procedure;
          chkProcedure.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const chkNormative = document.getElementById('rec-normative');
        if (chkNormative) {
          chkNormative.checked = !!recsObj.normative;
          chkNormative.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const chkDiffusion = document.getElementById('rec-diffusion');
        if (chkDiffusion) {
          chkDiffusion.checked = !!recsObj.diffusion;
          chkDiffusion.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const chkInstructive = document.getElementById('rec-instructive');
        if (chkInstructive) {
          chkInstructive.checked = !!recsObj.instructive;
          chkInstructive.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Update inputs (force to uppercase, dispatch input event)
        const txtCoordinate = document.getElementById('rec-coordinate');
        if (txtCoordinate) {
          txtCoordinate.value = (recsObj.coordinateWith || '').toUpperCase();
          txtCoordinate.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const txtConvene = document.getElementById('rec-convene');
        if (txtConvene) {
          txtConvene.value = (recsObj.conveneEntities || '').toUpperCase();
          txtConvene.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const txtOther = document.getElementById('rec-other');
        if (txtOther) {
          txtOther.value = (recsObj.other || '').toUpperCase();
          txtOther.dispatchEvent(new Event('input', { bubbles: true }));
        }

        showToast('Plan de acción sugerido con éxito', 'success');
      } catch (err) {
        showToast('Error al generar el plan de acción', 'error');
        console.error(err);
      } finally {
        btnAiRecs.disabled = false;
        btnAiRecs.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ---- Cancel ----
  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    navigate('explorer');
  });

  // ---- Delete (edit mode) ----
  if (isEdit) {
    document.getElementById('btn-delete-record')?.addEventListener('click', () => {
      showConfirm('¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.', async () => {
        try {
          await deleteRecord(editId);
          showToast('Registro eliminado exitosamente', 'success');
          navigate('explorer');
        } catch (err) {
          showToast('Error al eliminar el registro', 'error');
        }
      });
    });
  }

  // ---- Form Submit ----
  const form = document.getElementById('lesson-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect form data
    const formData = {
      subprocess: document.getElementById('field-subprocess').value,
      date: document.getElementById('field-date').value,
      region: document.getElementById('field-region').value,
      province: document.getElementById('field-province').value,
      district: document.getElementById('field-district').value,
      problem: document.getElementById('field-problem').value.trim(),
      impact: document.getElementById('field-impact').value.trim(),
      lessonLearned: document.getElementById('field-lesson').value.trim(),
      lesson: document.getElementById('field-lesson').value.trim(),
      recommendations: {
        procedure: document.getElementById('rec-procedure').checked,
        normative: document.getElementById('rec-normative').checked,
        diffusion: document.getElementById('rec-diffusion').checked,
        instructive: document.getElementById('rec-instructive').checked,
        coordinateWith: document.getElementById('rec-coordinate').value.trim(),
        conveneEntities: document.getElementById('rec-convene').value.trim(),
        other: document.getElementById('rec-other').value.trim()
      },
      approvedBy: document.getElementById('field-approved-by').value.trim(),
      signature: document.getElementById('field-signature').value.trim()
    };

    // Find subprocess label and color
    const subprocessObj = SUBPROCESSES.find(s => s.id === formData.subprocess);
    if (subprocessObj) {
      formData.subprocessLabel = subprocessObj.label;
      formData.subprocessColor = subprocessObj.color;
    }

    // Validate
    clearErrors();
    const validation = validateForm(formData, {
      subprocess: ['required'],
      date: ['required', 'date'],
      region: ['required'],
      problem: ['required', 'minLength:5'],
      impact: ['required', 'minLength:5'],
      lessonLearned: ['required', 'minLength:5']
    });
    if (!validation.valid) {
      showValidationErrors(validation.errors);
      showToast('Por favor corrija los errores en el formulario', 'warning');
      return;
    }

    // Add user info (keep original creator if editing, otherwise assign to current user)
    if (!isEdit) {
      formData.userId = user.id;
      formData.userName = user.fullName;
      formData.authorName = user.fullName;
    } else {
      formData.userId = existingRecord.userId;
      formData.userName = existingRecord.userName || existingRecord.authorName;
      formData.authorName = existingRecord.authorName || existingRecord.userName;
      
      // Audit trail for post-approval corrections
      if (existingRecord.approvedBy && existingRecord.approvedBy.trim()) {
        const auditEntry = {
          userId: user.id,
          userName: user.fullName,
          userRole: user.role,
          date: new Date().toISOString(),
          action: 'CORRECCIÓN POST-APROBACIÓN'
        };
        formData.auditTrail = existingRecord.auditTrail || [];
        formData.auditTrail.push(auditEntry);
      } else {
        formData.auditTrail = existingRecord.auditTrail || [];
      }
    }

    // Save
    const saveBtn = document.getElementById('btn-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-spinner"></span><span>Guardando...</span>';

    try {
      let savedRecord;
      if (isEdit) {
        await updateRecord(editId, formData);
        savedRecord = { ...existingRecord, ...formData, id: editId };
      } else {
        const id = await createRecord(formData);
        savedRecord = { ...formData, id };
      }

      showToast('Registro guardado exitosamente', 'success');

      // Show print dialog after successful save
      showPostSaveDialog(savedRecord, navigate);

    } catch (err) {
      showToast('Error al guardar el registro', 'error');
      console.error('Save error:', err);
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="save"></i><span>${isEdit ? 'Actualizar' : 'Guardar'} Registro</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

/**
 * Show post-save dialog asking about print/PDF
 */
function showPostSaveDialog(record, navigate) {
  showModal({
    title: 'Registro Guardado',
    content: `
      <div class="save-success-content">
        <div class="save-success-icon">✓</div>
        <p>Registro guardado exitosamente.</p>
        <p class="save-success-question">¿Desea imprimir el formulario?</p>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" id="post-save-close">Cerrar</button>
      <button class="btn btn-outline" id="post-save-pdf">
        <i data-lucide="download"></i> Descargar PDF
      </button>
      <button class="btn btn-primary" id="post-save-print">
        <i data-lucide="printer"></i> Imprimir
      </button>
    `,
    size: 'md',
    onClose: () => navigate('explorer')
  });

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('post-save-close')?.addEventListener('click', () => {
    closeModal();
    navigate('explorer');
  });

  document.getElementById('post-save-print')?.addEventListener('click', () => {
    closeModal();
    showPrintDialog(record);
    setTimeout(() => navigate('explorer'), 500);
  });

  document.getElementById('post-save-pdf')?.addEventListener('click', () => {
    closeModal();
    showPrintDialog(record, 'pdf');
    setTimeout(() => navigate('explorer'), 500);
  });
}

/**
 * Clear all validation errors
 */
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
  document.querySelectorAll('.form-control.invalid').forEach(el => {
    el.classList.remove('invalid');
  });
}

/**
 * Show validation errors inline
 */
function showValidationErrors(errors) {
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
    // Also mark the input
    const inputEl = document.getElementById(`field-${field}`) ||
      document.getElementById(`field-${camelToKebab(field)}`);
    if (inputEl) {
      inputEl.classList.add('invalid');
    }
  }

  // Scroll to first error
  const firstError = document.querySelector('.form-error.show');
  if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function camelToKebab(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
