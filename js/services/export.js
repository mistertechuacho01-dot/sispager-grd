/**
 * SISPAGER-GRD - Export Service
 * Print and PDF generation for lesson learned records
 */

import { formatDate, escapeHtml } from '../utils/helpers.js';

/**
 * Generate the HTML content for a single record in the official institutional format.
 * Uses inline styles for maximum print reliability.
 * @param {Object} record - The record object to render
 * @returns {string} Complete HTML string for the record
 */
function formatOfficialDate(dateStr) {
  if (!dateStr) return '__ / __ / ____';
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day} / ${month} / ${year}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '__ / __ / ____';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function generateRecordHTML(record) {
  if (!record) return '<p>No se encontró el registro.</p>';

  const safe = (val) => escapeHtml(val || '') || '—';
  const officialDateStr = formatOfficialDate(record.date);
  const logoUrl = window.location.origin + '/assets/logo_indeci.png';

  // Checkbox state helper
  const isChecked = (val) => val === true || val === 'true';

  // Format recommendations text/checkboxes lines
  const checkX = (checked) => checked ? 'X' : '&nbsp;';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lección Aprendida - ${safe(record.subprocessLabel || record.subprocess)}</title>
      <style>
        @media print {
          body { margin: 0; padding: 10mm; }
          .no-print { display: none !important; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000;
          line-height: 1.4;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
        }
        .header-container {
          position: relative;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
          text-align: center;
          min-height: 42px;
        }
        .logo-img {
          height: 1cm;
          position: absolute;
          left: 0;
          top: 0;
        }
        .title-text {
          font-size: 15px;
          font-weight: bold;
          text-decoration: underline;
          margin: 6px 0 0 0;
          display: inline-block;
        }
        .meta-container {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: bold;
          margin-bottom: 15px;
          padding: 0 4px;
        }
        .meta-value {
          font-weight: normal;
          text-decoration: underline;
        }
        .main-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #000;
        }
        .main-table td {
          border: 1.5px solid #000;
        }
        .section-header {
          text-align: center;
          font-weight: bold;
          padding: 5px;
          background-color: #fff;
        }
        .section-header-label {
          font-weight: bold;
        }
        .section-header-desc {
          font-weight: normal;
          font-style: italic;
        }
        .section-content {
          padding: 10px 12px;
          min-height: 70px;
          text-align: justify;
          line-height: 1.5;
          white-space: pre-wrap;
          vertical-align: top;
        }
        .recs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }
        .recs-table td {
          border: none !important;
        }
        .recs-row {
          border-bottom: 1px dashed #000;
        }
        .recs-cell-left {
          width: 50%;
          padding: 6px 8px;
          border-right: 1px dashed #000 !important;
          vertical-align: middle;
        }
        .recs-cell-right {
          width: 50%;
          padding: 6px 8px;
          vertical-align: middle;
        }
        .underline-space {
          text-decoration: underline;
          font-weight: bold;
        }
        .monospace-x {
          font-family: monospace;
          font-size: 11px;
        }
        .dashed-filler-row {
          border-bottom: 1px dashed #000;
          height: 20px;
        }
        .dashed-filler-row-last {
          height: 20px;
        }
        .approval-cell {
          width: 60%;
          padding: 10px 12px;
          vertical-align: top;
        }
        .signature-cell {
          width: 40%;
          padding: 10px 12px;
          vertical-align: top;
          text-align: center;
        }
        .signature-title {
          font-weight: bold;
          display: block;
          margin-bottom: 15px;
        }
        .signature-value {
          font-family: monospace;
          font-size: 9.5px;
          color: #333;
          font-style: italic;
        }
        .approval-line {
          margin-top: 30px;
          border-top: 1px solid #000;
          width: 80%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header-container">
          <img src="${logoUrl}" class="logo-img" alt="INDECI Logo" />
          <h1 class="title-text">Lecciones aprendidas en el Proceso de Respuesta.</h1>
        </div>

        <!-- Metadata / Subprocess and Date -->
        <div class="meta-container">
          <div>Sub proceso: <span class="meta-value">${safe(record.subprocessLabel || record.subprocess)}</span></div>
          <div>Fecha: <span class="meta-value">${officialDateStr}</span></div>
        </div>

        <!-- Main Document Table -->
        <table class="main-table">
          <!-- Section 1: Problema/Situación -->
          <tr>
            <td colspan="2" class="section-header">
              <span class="section-header-label">Problema/Situación:</span>
              <span class="section-header-desc">Qué sucedió.</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="section-content">${safe(record.problem)}</td>
          </tr>

          <!-- Section 2: Impacto -->
          <tr>
            <td colspan="2" class="section-header">
              <span class="section-header-label">Impacto:</span>
              <span class="section-header-desc">Consecuencias positivas o negativas.</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="section-content">${safe(record.impact)}</td>
          </tr>

          <!-- Section 3: Lección Aprendida -->
          <tr>
            <td colspan="2" class="section-header">
              <span class="section-header-label">Lección aprendida:</span>
              <span class="section-header-desc">El conocimiento clave extraído de la experiencia.</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="section-content">${safe(record.lesson || record.lessonLearned)}</td>
          </tr>

          <!-- Section 4: Recomendaciones Header -->
          <tr>
            <td colspan="2" class="section-header">
              <span class="section-header-label">Recomendaciones:</span>
              <span class="section-header-desc">Acciones prácticas y específicas para mejorar futuras intervenciones.</span>
            </td>
          </tr>
          
          <!-- Recommendations Content -->
          <tr>
            <td colspan="2" style="padding: 0;">
              <table class="recs-table">
                <!-- Row 1 -->
                <tr class="recs-row">
                  <td class="recs-cell-left">
                    Preparar un procedimiento. <span class="underline-space monospace-x">&nbsp;&nbsp;${checkX(isChecked(record.checkProcedure))}&nbsp;&nbsp;</span>
                  </td>
                  <td class="recs-cell-right">
                    Incluir en un proyecto normativo <span class="underline-space monospace-x">&nbsp;&nbsp;${checkX(isChecked(record.checkNormative))}&nbsp;&nbsp;</span>
                  </td>
                </tr>
                <!-- Row 2 -->
                <tr class="recs-row">
                  <td class="recs-cell-left">
                    Difusión inmediata <span class="underline-space monospace-x">&nbsp;&nbsp;${checkX(isChecked(record.checkDiffusion))}&nbsp;&nbsp;</span>
                  </td>
                  <td class="recs-cell-right">
                    Preparar instructivo. <span class="underline-space monospace-x">&nbsp;&nbsp;${checkX(isChecked(record.checkInstructive))}&nbsp;&nbsp;</span>
                  </td>
                </tr>
                <!-- Row 3 -->
                <tr class="recs-row">
                  <td class="recs-cell-left">
                    Coordinar con. <span class="underline-space">&nbsp;${record.coordinateWith ? safe(record.coordinateWith) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</span>
                  </td>
                  <td class="recs-cell-right">
                    Convocar a Entidades de Primer Respuesta competentes. <span class="underline-space">&nbsp;${record.conveneEntities ? safe(record.conveneEntities) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</span>
                  </td>
                </tr>
                <!-- Row 4: Otro -->
                <tr class="recs-row">
                  <td colspan="2" style="padding: 6px 8px;">
                    Otro: <span class="underline-space">&nbsp;${record.otherRecommendation ? safe(record.otherRecommendation) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</span>
                  </td>
                </tr>
                <!-- Row 5: Dashed spacer line to match the image format exactly -->
                <tr class="dashed-filler-row">
                  <td colspan="2">&nbsp;</td>
                </tr>
                <!-- Row 6: Dashed spacer line last -->
                <tr class="dashed-filler-row-last">
                  <td colspan="2">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 5: Approval and Signature -->
          <tr>
            <!-- Approved By -->
            <td class="approval-cell">
              <span style="font-weight: bold;">Aprobado por :</span> <span style="font-weight: bold;">${safe(record.approvedBy)}</span>
              <div class="approval-line"></div>
            </td>
            <!-- Electronic Signature -->
            <td class="signature-cell">
              <span class="signature-title">Firma Electrónica</span>
              <div class="signature-value">${safe(record.electronicSignature || record.signature)}</div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

/**
 * Open a print view of a single record in the official format and trigger window.print().
 * @param {Object} record - The record to print
 */
export function printRecord(record) {
  if (!record) {
    console.error('[SISPAGER-GRD] printRecord: No record provided.');
    return;
  }

  try {
    const html = generateRecordHTML(record);
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      // Fallback: use a hidden iframe if popup is blocked
      console.warn('[SISPAGER-GRD] Popup blocked. Using iframe fallback.');
      printViaIframe(html);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to render before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };

    // Fallback timeout if onload doesn't fire
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        // Window might be closed already
      }
    }, 1500);
  } catch (error) {
    console.error('[SISPAGER-GRD] Error printing record:', error);
    alert('Error al imprimir el registro. Intente nuevamente.');
  }
}

/**
 * Fallback print method using a hidden iframe.
 * @param {string} html - The HTML content to print
 */
function printViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Cleanup iframe after a delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500);
}

/**
 * Generate and download a PDF of a record using html2pdf.js.
 * Dynamically loads html2pdf.js from CDN if not already available.
 * @param {Object} record - The record to generate PDF for
 * @returns {Promise<void>}
 */
export async function generatePDF(record) {
  if (!record) {
    console.error('[SISPAGER-GRD] generatePDF: No record provided.');
    return;
  }

  try {
    // Ensure html2pdf is loaded
    await loadHtml2Pdf();

    // Create a temporary container for the HTML content
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;';
    container.innerHTML = generateRecordHTML(record);

    // Extract the body content from the full HTML document
    const bodyContent = document.createElement('div');
    const bodyMatch = container.innerHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyContent.innerHTML = bodyMatch[1];
    } else {
      bodyContent.innerHTML = container.innerHTML;
    }
    bodyContent.style.cssText = 'font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-size:12px;color:#222;line-height:1.5;padding:20px;';

    document.body.appendChild(bodyContent);

    // Generate filename
    const subprocess = record.subprocess
      ? record.subprocess.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_').substring(0, 30)
      : 'registro';
    const dateStr = record.date
      ? new Date(record.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const filename = `Leccion_Aprendida_${subprocess}_${dateStr}.pdf`;

    // html2pdf options
    const options = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Generate PDF
    await window.html2pdf().set(options).from(bodyContent).save();

    // Cleanup
    document.body.removeChild(bodyContent);
    console.log(`[SISPAGER-GRD] PDF generated: ${filename}`);
  } catch (error) {
    console.error('[SISPAGER-GRD] Error generating PDF:', error);
    alert('Error al generar el PDF. Verifique su conexión e intente nuevamente.');
  }
}

/**
 * Dynamically load html2pdf.js from CDN if not already loaded.
 * @returns {Promise<void>}
 */
function loadHtml2Pdf() {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';

    script.onload = () => {
      console.log('[SISPAGER-GRD] html2pdf.js loaded successfully.');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('No se pudo cargar html2pdf.js. Verifique su conexión a internet.'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Show a modal dialog asking the user to choose between Print and Download PDF.
 * @param {Object} record - The record to export
 */
export function showPrintDialog(record) {
  if (!record) {
    console.error('[SISPAGER-GRD] showPrintDialog: No record provided.');
    return;
  }

  // Remove any existing dialog
  const existingDialog = document.getElementById('sispager-print-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'sispager-print-dialog';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: sispagerFadeIn 0.2s ease;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #fff;
    border-radius: 16px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    text-align: center;
    animation: sispagerSlideUp 0.3s ease;
  `;

  const subprocess = escapeHtml(record.subprocess || 'Registro');

  modal.innerHTML = `
    <style>
      @keyframes sispagerFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes sispagerSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .sispager-export-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 14px 20px;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      .sispager-export-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
      .sispager-export-btn:active { transform: translateY(0); }
      .sispager-btn-print { background: #1a3c6d; color: #fff; }
      .sispager-btn-print:hover { background: #2a5298; }
      .sispager-btn-pdf { background: #dc2626; color: #fff; }
      .sispager-btn-pdf:hover { background: #ef4444; }
      .sispager-btn-cancel { background: #f3f4f6; color: #666; margin-top: 8px; }
      .sispager-btn-cancel:hover { background: #e5e7eb; color: #333; }
    </style>

    <div style="margin-bottom:8px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1a3c6d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
    </div>

    <h3 style="margin:0 0 6px;font-size:18px;color:#1a3c6d;">Exportar Lección Aprendida</h3>
    <p style="margin:0 0 24px;font-size:13px;color:#777;line-height:1.4;">
      ${subprocess}<br>
      <span style="font-size:12px;">Seleccione el formato de exportación</span>
    </p>

    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="sispager-export-btn sispager-btn-print" id="sispager-btn-print">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Imprimir
      </button>

      <button class="sispager-export-btn sispager-btn-pdf" id="sispager-btn-pdf">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        Descargar PDF
      </button>

      <button class="sispager-export-btn sispager-btn-cancel" id="sispager-btn-cancel">
        Cancelar
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Event handlers
  const closeDialog = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById('sispager-btn-print').addEventListener('click', () => {
    closeDialog();
    setTimeout(() => printRecord(record), 100);
  });

  document.getElementById('sispager-btn-pdf').addEventListener('click', async () => {
    const pdfBtn = document.getElementById('sispager-btn-pdf');
    if (pdfBtn) {
      pdfBtn.textContent = 'Generando PDF...';
      pdfBtn.disabled = true;
      pdfBtn.style.opacity = '0.7';
    }
    try {
      await generatePDF(record);
    } catch (error) {
      console.error('[SISPAGER-GRD] PDF generation failed:', error);
    }
    closeDialog();
  });

  document.getElementById('sispager-btn-cancel').addEventListener('click', closeDialog);

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });

  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}
