// ============================================================================
// SISPAGER-GRD :: Filters Component
// ============================================================================
import { REGIONS, SUBPROCESSES } from '../utils/constants.js';

let _debounceTimer = null;

/**
 * Render the filter bar HTML
 * @param {Object} options
 * @param {boolean} [options.showSearch=true]
 * @param {boolean} [options.showDateRange=true]
 * @param {boolean} [options.showRegion=true]
 * @param {boolean} [options.showSubprocess=true]
 * @returns {string} HTML string
 */
export function renderFilters(options = {}) {
  const {
    showSearch = true,
    showDateRange = true,
    showRegion = true,
    showSubprocess = true
  } = options;

  let html = '<div class="filters-bar" id="filters-bar">';

  if (showSearch) {
    html += `
      <div class="filter-group search-group">
        <div class="search-input-wrapper">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="filter-search" class="filter-input search-input"
            placeholder="Buscar registros..." />
        </div>
      </div>
    `;
  }

  if (showDateRange) {
    html += `
      <div class="filter-group">
        <label class="filter-label" for="filter-date-from">Desde</label>
        <input type="date" id="filter-date-from" class="filter-input filter-date" />
      </div>
      <div class="filter-group">
        <label class="filter-label" for="filter-date-to">Hasta</label>
        <input type="date" id="filter-date-to" class="filter-input filter-date" />
      </div>
    `;
  }

  if (showRegion) {
    const regionOpts = REGIONS.map(r => `<option value="${r}">${r}</option>`).join('');
    html += `
      <div class="filter-group">
        <label class="filter-label" for="filter-region">Región</label>
        <select id="filter-region" class="filter-select">
          <option value="">Todas las regiones</option>
          ${regionOpts}
        </select>
      </div>
    `;
  }

  if (showSubprocess) {
    const subOpts = SUBPROCESSES.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
    html += `
      <div class="filter-group">
        <label class="filter-label" for="filter-subprocess">Subproceso</label>
        <select id="filter-subprocess" class="filter-select">
          <option value="">Todos los subprocesos</option>
          ${subOpts}
        </select>
      </div>
    `;
  }

  html += `
    <div class="filter-group filter-actions">
      <button class="btn btn-clear-filters" id="btn-clear-filters" title="Limpiar filtros">
        <i data-lucide="x"></i>
        <span>Limpiar</span>
      </button>
    </div>
  `;

  html += '</div>';
  return html;
}

/**
 * Get current filter values from the DOM
 */
function getFilterValues() {
  return {
    search: document.getElementById('filter-search')?.value || '',
    dateFrom: document.getElementById('filter-date-from')?.value || '',
    dateTo: document.getElementById('filter-date-to')?.value || '',
    region: document.getElementById('filter-region')?.value || '',
    subprocess: document.getElementById('filter-subprocess')?.value || ''
  };
}

/**
 * Initialize filter event handlers
 * @param {Function} onChange - Called with filter values when any filter changes
 */
export function initFilters(onChange) {
  if (!onChange) return;

  const searchInput = document.getElementById('filter-search');
  const dateFrom = document.getElementById('filter-date-from');
  const dateTo = document.getElementById('filter-date-to');
  const regionSelect = document.getElementById('filter-region');
  const subprocessSelect = document.getElementById('filter-subprocess');
  const clearBtn = document.getElementById('btn-clear-filters');

  const emit = () => onChange(getFilterValues());

  // Debounced search
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(emit, 300);
    });
  }

  // Immediate change events
  [dateFrom, dateTo, regionSelect, subprocessSelect].forEach(el => {
    if (el) el.addEventListener('change', emit);
  });

  // Clear all
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      if (regionSelect) regionSelect.value = '';
      if (subprocessSelect) subprocessSelect.value = '';
      emit();
    });
  }

  // Activate lucide icons
  if (window.lucide) window.lucide.createIcons();
}
