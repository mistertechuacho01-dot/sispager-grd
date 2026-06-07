// ============================================================================
// SISPAGER-GRD :: Reports Module
// ============================================================================
import { Chart, registerables } from 'chart.js';
import { getCurrentUser, isAdmin } from '../services/auth.js';
import { getAllRecords, getRecordsByUser } from '../services/database.js';
import { REGIONS, SUBPROCESSES, SUBPROCESS_COLORS } from '../utils/constants.js';
import { renderHeader, initHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

Chart.register(...registerables);

let _chartInstances = [];

/**
 * Destroy all existing chart instances
 */
function destroyCharts() {
  _chartInstances.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  _chartInstances = [];
}

/**
 * Render the reports page
 * @param {HTMLElement} container
 * @param {Function} navigate
 */
export async function renderReports(container, navigate) {
  destroyCharts();

  const user = getCurrentUser();
  const admin = isAdmin();

  container.innerHTML = `
    ${renderHeader(
      'Reportes y Estadísticas',
      'Análisis de lecciones aprendidas registradas'
    )}
    <div class="reports-content">
      <!-- Filters -->
      <div class="reports-filters" id="reports-filters">
        <div class="filter-group">
          <label class="filter-label" for="report-date-from">Desde</label>
          <input type="date" id="report-date-from" class="filter-input filter-date" />
        </div>
        <div class="filter-group">
          <label class="filter-label" for="report-date-to">Hasta</label>
          <input type="date" id="report-date-to" class="filter-input filter-date" />
        </div>
        <div class="filter-group">
          <label class="filter-label" for="report-region">Región</label>
          <select id="report-region" class="filter-select">
            <option value="">Todas las regiones</option>
            ${REGIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group filter-actions">
          <button class="btn btn-clear-filters" id="btn-report-clear">
            <i data-lucide="x"></i> Limpiar
          </button>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-grid kpi-grid-4" id="report-kpis">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-total"><i data-lucide="file-text"></i></div>
          <div class="kpi-value" id="report-kpi-total">0</div>
          <div class="kpi-label">Total Registros</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-regions"><i data-lucide="map"></i></div>
          <div class="kpi-value" id="report-kpi-regions">0</div>
          <div class="kpi-label">Por Región</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-subprocess"><i data-lucide="layers"></i></div>
          <div class="kpi-value" id="report-kpi-subprocesses">0</div>
          <div class="kpi-label">Por Subproceso</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon-month"><i data-lucide="trending-up"></i></div>
          <div class="kpi-value" id="report-kpi-avg">0</div>
          <div class="kpi-label">Promedio / Mes</div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <div class="chart-card">
          <h3 class="chart-title"><i data-lucide="bar-chart-horizontal"></i> Registros por Región</h3>
          <div class="chart-container">
            <canvas id="chart-region"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title"><i data-lucide="trending-up"></i> Tendencia Mensual</h3>
          <div class="chart-container">
            <canvas id="chart-trend"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title"><i data-lucide="pie-chart"></i> Distribución por Subproceso</h3>
          <div class="chart-container chart-container-doughnut">
            <canvas id="chart-subprocess"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title"><i data-lucide="users"></i> Top 5 Contribuidores</h3>
          <div class="chart-container">
            <canvas id="chart-users"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  initHeader();
  if (window.lucide) window.lucide.createIcons();

  // Load data and render charts
  let allRecords = [];
  try {
    if (admin) {
      allRecords = await getAllRecords();
    } else {
      allRecords = await getRecordsByUser(user.id);
    }
  } catch (err) {
    showToast('Error al cargar datos de reportes', 'error');
    console.error('Reports load error:', err);
    return;
  }

  // Initial render
  updateReports(allRecords);

  // Filter events
  const dateFrom = document.getElementById('report-date-from');
  const dateTo = document.getElementById('report-date-to');
  const regionSelect = document.getElementById('report-region');
  const clearBtn = document.getElementById('btn-report-clear');

  const applyReportFilters = () => {
    const filtered = allRecords.filter(r => {
      if (dateFrom.value && r.date < dateFrom.value) return false;
      if (dateTo.value && r.date > dateTo.value) return false;
      if (regionSelect.value && r.region !== regionSelect.value) return false;
      return true;
    });
    updateReports(filtered);
  };

  dateFrom?.addEventListener('change', applyReportFilters);
  dateTo?.addEventListener('change', applyReportFilters);
  regionSelect?.addEventListener('change', applyReportFilters);

  clearBtn?.addEventListener('click', () => {
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (regionSelect) regionSelect.value = '';
    updateReports(allRecords);
  });
}

/**
 * Update KPIs and charts with given records
 */
function updateReports(records) {
  destroyCharts();

  // KPIs
  const total = records.length;
  const uniqueRegions = new Set(records.map(r => r.region).filter(Boolean)).size;
  const uniqueSubprocesses = new Set(records.map(r => r.subprocess).filter(Boolean)).size;

  // Average per month
  let avgPerMonth = 0;
  if (records.length > 0) {
    const dates = records.map(r => new Date(r.date)).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const months = Math.max(1,
        (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
        (maxDate.getMonth() - minDate.getMonth()) + 1
      );
      avgPerMonth = (records.length / months).toFixed(1);
    }
  }

  setText('report-kpi-total', total);
  setText('report-kpi-regions', uniqueRegions);
  setText('report-kpi-subprocesses', uniqueSubprocesses);
  setText('report-kpi-avg', avgPerMonth);

  // Chart colors
  const chartColors = [
    '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
    '#e879f9', '#f472b6', '#fb7185', '#f87171',
    '#fbbf24', '#34d399', '#2dd4bf', '#22d3ee',
    '#60a5fa', '#818cf8', '#a855f7', '#d946ef',
    '#f43f5e', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
    '#8b5cf6'
  ];

  // 1. Bar chart: Records by Region (horizontal)
  const regionCounts = {};
  records.forEach(r => {
    if (r.region) regionCounts[r.region] = (regionCounts[r.region] || 0) + 1;
  });
  const regionLabels = Object.keys(regionCounts).sort((a, b) => regionCounts[b] - regionCounts[a]);
  const regionData = regionLabels.map(k => regionCounts[k]);

  const ctxRegion = document.getElementById('chart-region');
  if (ctxRegion) {
    _chartInstances.push(new Chart(ctxRegion, {
      type: 'bar',
      data: {
        labels: regionLabels,
        datasets: [{
          label: 'Registros',
          data: regionData,
          backgroundColor: chartColors.slice(0, regionLabels.length),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.9)',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    }));
  }

  // 2. Line chart: Monthly trend (last 12 months)
  const monthlyData = getMonthlyTrend(records, 12);
  const ctxTrend = document.getElementById('chart-trend');
  if (ctxTrend) {
    _chartInstances.push(new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Registros',
          data: monthlyData.values,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.9)',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    }));
  }

  // 3. Doughnut chart: Distribution by Subprocess
  const subCounts = {};
  records.forEach(r => {
    const label = r.subprocessLabel || r.subprocess || 'Sin clasificar';
    subCounts[label] = (subCounts[label] || 0) + 1;
  });
  const subLabels = Object.keys(subCounts);
  const subData = subLabels.map(k => subCounts[k]);
  const subColors = subLabels.map((label, i) => {
    const sp = SUBPROCESSES.find(s => s.label === label);
    return sp?.color || SUBPROCESS_COLORS[label] || chartColors[i % chartColors.length];
  });

  const ctxSubprocess = document.getElementById('chart-subprocess');
  if (ctxSubprocess) {
    _chartInstances.push(new Chart(ctxSubprocess, {
      type: 'doughnut',
      data: {
        labels: subLabels,
        datasets: [{
          data: subData,
          backgroundColor: subColors,
          borderWidth: 2,
          borderColor: '#1e1b4b',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.9)',
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    }));
  }

  // 4. Bar chart: Top 5 Users
  const userCounts = {};
  records.forEach(r => {
    const name = r.userName || 'Anónimo';
    userCounts[name] = (userCounts[name] || 0) + 1;
  });
  const sortedUsers = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const userLabels = sortedUsers.map(([name]) => name);
  const userData = sortedUsers.map(([, count]) => count);

  const ctxUsers = document.getElementById('chart-users');
  if (ctxUsers) {
    _chartInstances.push(new Chart(ctxUsers, {
      type: 'bar',
      data: {
        labels: userLabels,
        datasets: [{
          label: 'Contribuciones',
          data: userData,
          backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.9)',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#94a3b8' },
            grid: { color: 'rgba(148,163,184,0.1)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    }));
  }
}

/**
 * Get monthly trend data for last N months
 */
function getMonthlyTrend(records, months) {
  const now = new Date();
  const labels = [];
  const values = [];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    labels.push(label);

    const count = records.filter(r => {
      const rd = new Date(r.date);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    values.push(count);
  }

  return { labels, values };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
