// ============================================================================
// SISPAGER-GRD :: Dashboard Module
// ============================================================================
import { getCurrentUser, isAdmin } from '../services/auth.js';
import { getAllRecords, getRecordsByUser } from '../services/database.js';
import { renderHeader, initHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

/**
 * Render the dashboard page
 * @param {HTMLElement} container - The main content container
 * @param {Function} navigate - Navigation callback
 */
export async function renderDashboard(container, navigate) {
  const user = getCurrentUser();
  const admin = isAdmin();

  container.innerHTML = `
    ${renderHeader(
      'Dashboard',
      `Bienvenido, ${user?.fullName || 'Usuario'}`
    )}
    <div class="dashboard-content">
      <div class="kpi-grid" id="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-total"><i data-lucide="file-text"></i></div>
          <div class="kpi-value" data-target="0" id="kpi-total">0</div>
          <div class="kpi-label">Total Registros</div>
          <div class="kpi-trend" id="kpi-total-trend"></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-month"><i data-lucide="calendar"></i></div>
          <div class="kpi-value" data-target="0" id="kpi-month">0</div>
          <div class="kpi-label">Registros Este Mes</div>
          <div class="kpi-trend" id="kpi-month-trend"></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-regions"><i data-lucide="map-pin"></i></div>
          <div class="kpi-value" data-target="0" id="kpi-regions">0</div>
          <div class="kpi-label">Regiones Activas</div>
          <div class="kpi-trend" id="kpi-regions-trend"></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-mine"><i data-lucide="user-check"></i></div>
          <div class="kpi-value" data-target="0" id="kpi-mine">0</div>
          <div class="kpi-label">Mi Contribución</div>
          <div class="kpi-trend" id="kpi-mine-trend"></div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-section recent-section">
          <div class="section-header">
            <h2 class="section-title"><i data-lucide="clock"></i> Registros Recientes</h2>
            <button class="btn btn-ghost" id="btn-view-all">Ver todos</button>
          </div>
          <div class="recent-records" id="recent-records">
            <div class="loading-skeleton">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          </div>
        </div>

        <div class="dashboard-section actions-section">
          <div class="section-header">
            <h2 class="section-title"><i data-lucide="zap"></i> Acciones Rápidas</h2>
          </div>
          <div class="quick-actions">
            <button class="quick-action-btn" id="btn-new-record">
              <div class="quick-action-icon"><i data-lucide="plus-circle"></i></div>
              <div class="quick-action-text">
                <span class="quick-action-title">Nuevo Registro</span>
                <span class="quick-action-desc">Crear una nueva lección aprendida</span>
              </div>
            </button>
            <button class="quick-action-btn" id="btn-go-explorer">
              <div class="quick-action-icon"><i data-lucide="folder-open"></i></div>
              <div class="quick-action-text">
                <span class="quick-action-title">Ver Explorador</span>
                <span class="quick-action-desc">Explorar el repositorio de lecciones</span>
              </div>
            </button>
            <button class="quick-action-btn" id="btn-go-reports">
              <div class="quick-action-icon"><i data-lucide="bar-chart-3"></i></div>
              <div class="quick-action-text">
                <span class="quick-action-title">Ver Reportes</span>
                <span class="quick-action-desc">Estadísticas y gráficos</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  initHeader();
  if (window.lucide) window.lucide.createIcons();

  // Fetch data
  try {
    let records;
    if (admin) {
      records = await getAllRecords();
    } else {
      records = await getRecordsByUser(user.id);
    }

    // Calculate KPIs
    const total = records.length;
    const now = new Date();
    const thisMonth = records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const uniqueRegions = new Set(records.map(r => r.region).filter(Boolean)).size;
    const myRecords = records.filter(r => r.userId === user.id).length;

    // Animate KPI counters
    animateCounter('kpi-total', total);
    animateCounter('kpi-month', thisMonth);
    animateCounter('kpi-regions', uniqueRegions);
    animateCounter('kpi-mine', myRecords);

    // Recent records (last 5)
    const sorted = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent = sorted.slice(0, 5);
    renderRecentRecords(recent);

  } catch (err) {
    showToast('Error al cargar datos del dashboard', 'error');
    console.error('Dashboard error:', err);
  }

  // Event listeners
  document.getElementById('btn-new-record')?.addEventListener('click', () => navigate('form'));
  document.getElementById('btn-go-explorer')?.addEventListener('click', () => navigate('explorer'));
  document.getElementById('btn-go-reports')?.addEventListener('click', () => navigate('reports'));
  document.getElementById('btn-view-all')?.addEventListener('click', () => navigate('explorer'));
}

/**
 * Animate a counter from 0 to target
 */
function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 1200;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render recent records cards
 */
function renderRecentRecords(records) {
  const container = document.getElementById('recent-records');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        <i data-lucide="inbox"></i>
        <p>No hay registros recientes</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = records.map(record => `
    <div class="recent-card" data-id="${record.id}">
      <div class="recent-card-header">
        <span class="recent-card-date">
          <i data-lucide="calendar"></i>
          ${formatDate(record.date)}
        </span>
        <span class="subprocess-badge" style="--badge-color: ${record.subprocessColor || 'var(--primary)'}">${record.subprocessLabel || record.subprocess || 'N/A'}</span>
      </div>
      <div class="recent-card-body">
        <p class="recent-card-problem">${truncate(record.problem || '', 120)}</p>
      </div>
      <div class="recent-card-footer">
        <span class="recent-card-location">
          <i data-lucide="map-pin"></i>
          ${record.region || ''} ${record.province ? '/ ' + record.province : ''}
        </span>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '…';
}
