// ============================================================================
// SISPAGER-GRD :: Explorer Module
// ============================================================================
import { getCurrentUser, isAdmin } from '../services/auth.js';
import { getAllRecords, deleteRecord, getRecordById } from '../services/database.js';
import { showPrintDialog } from '../services/export.js';
import { SUBPROCESS_COLORS } from '../utils/constants.js';
import { renderHeader, initHeader } from '../components/header.js';
import { renderFilters, initFilters } from '../components/filters.js';
import { createTable, initTable } from '../components/table.js';
import { showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let _allRecords = [];
let _filteredRecords = [];
let _sortKey = 'date';
let _sortDir = 'desc';
let _currentPage = 1;
const PER_PAGE = 15;

/**
 * Render the explorer page
 * @param {HTMLElement} container
 * @param {Function} navigate
 */
export async function renderExplorer(container, navigate) {
  const user = getCurrentUser();
  const admin = isAdmin();

  container.innerHTML = `
    ${renderHeader(
      'Explorador de Repositorio',
      'Consulta y gestión de lecciones aprendidas',
      `<button class="btn btn-primary" id="btn-new-from-explorer">
        <i data-lucide="plus"></i> Nuevo Registro
      </button>`
    )}
    <div class="explorer-content">
      <div id="explorer-filters"></div>
      <div id="explorer-count" class="record-count-bar"></div>
      <div id="explorer-table" class="explorer-table-container">
        <div class="loading-skeleton">
          <div class="skeleton-row"></div><div class="skeleton-row"></div>
          <div class="skeleton-row"></div><div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </div>
      </div>
    </div>
  `;

  initHeader();

  // Render filters
  const filtersContainer = document.getElementById('explorer-filters');
  filtersContainer.innerHTML = renderFilters({
    showSearch: true,
    showDateRange: true,
    showRegion: true,
    showSubprocess: true
  });

  if (window.lucide) window.lucide.createIcons();

  // Load data
  try {
    if (admin) {
      _allRecords = await getAllRecords();
    } else {
      _allRecords = await getAllRecords({ userId: user.id });
    }
    _filteredRecords = [..._allRecords];
    _currentPage = 1;
    renderTableContent(navigate, admin, user);
  } catch (err) {
    showToast('Error al cargar los registros', 'error');
    console.error('Explorer load error:', err);
  }

  // Init filters
  initFilters((filters) => {
    _filteredRecords = applyFilters(_allRecords, filters);
    _currentPage = 1;
    renderTableContent(navigate, admin, user);
  });

  // New record button
  document.getElementById('btn-new-from-explorer')?.addEventListener('click', () => {
    navigate('form');
  });
}

/**
 * Render the table with current filtered/sorted/paginated data
 */
function renderTableContent(navigate, admin, user) {
  const tableContainer = document.getElementById('explorer-table');
  const countBar = document.getElementById('explorer-count');

  // Sort
  const sorted = sortRecords(_filteredRecords, _sortKey, _sortDir);

  // Paginate
  const total = sorted.length;
  const start = (_currentPage - 1) * PER_PAGE;
  const pageData = sorted.slice(start, start + PER_PAGE);

  // Count bar
  if (countBar) {
    countBar.innerHTML = `
      <span class="record-count-badge">
        <i data-lucide="database"></i>
        <strong>${total}</strong> registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}
      </span>
    `;
  }

  // Define columns
  const columns = [
    { key: 'authorName', label: 'Usuario', sortable: true, render: (val, row) => val || row.userName || '—' },
    {
      key: 'date', label: 'Fecha', sortable: true,
      render: (val) => formatDate(val)
    },
    { key: 'region', label: 'Región', sortable: true },
    {
      key: 'province', label: 'Ubicación', sortable: false,
      render: (val, row) => {
        const parts = [val, row.district].filter(Boolean);
        return parts.join(' / ') || '—';
      }
    },
    {
      key: 'subprocess', label: 'Subproceso', sortable: true,
      render: (val, row) => {
        const color = row.subprocessColor || SUBPROCESS_COLORS[val] || 'var(--primary)';
        const label = row.subprocessLabel || val || 'N/A';
        return `<span class="subprocess-badge" style="--badge-color: ${color}">${label}</span>`;
      }
    }
  ];

  // Determine allowed actions based on role
  let actions = ['print'];
  if (admin) {
    actions = ['edit', 'delete', 'print'];
  } else {
    // Collaborators can edit their own
    actions = ['edit', 'print'];
  }

  const tableHTML = createTable({
    columns,
    data: pageData,
    sortKey: _sortKey,
    sortDir: _sortDir,
    showActions: true,
    actions,
    emptyMessage: 'No se encontraron registros que coincidan con los filtros',
    pagination: {
      page: _currentPage,
      perPage: PER_PAGE,
      total
    }
  });

  if (tableContainer) {
    tableContainer.innerHTML = tableHTML;
  }

  // Init table events
  initTable(tableContainer, {
    onSort: (key) => {
      if (_sortKey === key) {
        _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        _sortKey = key;
        _sortDir = 'asc';
      }
      renderTableContent(navigate, admin, user);
    },
    onAction: async (action, id) => {
      if (action === 'edit') {
        // Check ownership for collaborators
        if (!admin) {
          const record = _allRecords.find(r => String(r.id) === String(id));
          if (record && record.userId !== user.id) {
            showToast('Solo puede editar sus propios registros', 'warning');
            return;
          }
        }
        navigate('form', id);
      } else if (action === 'delete') {
        if (!admin) {
          showToast('No tiene permisos para eliminar registros', 'warning');
          return;
        }
        showConfirm('¿Está seguro que desea eliminar este registro?', async () => {
          try {
            await deleteRecord(id);
            _allRecords = _allRecords.filter(r => String(r.id) !== String(id));
            _filteredRecords = _filteredRecords.filter(r => String(r.id) !== String(id));
            showToast('Registro eliminado', 'success');
            renderTableContent(navigate, admin, user);
          } catch (err) {
            showToast('Error al eliminar el registro', 'error');
          }
        });
      } else if (action === 'print') {
        try {
          const record = await getRecordById(id);
          if (record) {
            showPrintDialog(record);
          } else {
            showToast('No se pudo cargar el registro', 'error');
          }
        } catch (err) {
          showToast('Error al preparar la impresión', 'error');
        }
      }
    },
    onPageChange: (page) => {
      _currentPage = page;
      renderTableContent(navigate, admin, user);
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Apply filters to records
 */
function applyFilters(records, filters) {
  return records.filter(r => {
    // Search
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        r.userName, r.region, r.province, r.district,
        r.problem, r.impact, r.lessonLearned, r.subprocess,
        r.subprocessLabel
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    // Date range
    if (filters.dateFrom) {
      if (r.date < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      if (r.date > filters.dateTo) return false;
    }

    // Region
    if (filters.region) {
      if (r.region !== filters.region) return false;
    }

    // Subprocess
    if (filters.subprocess) {
      if (r.subprocess !== filters.subprocess) return false;
    }

    return true;
  });
}

/**
 * Sort records
 */
function sortRecords(records, key, dir) {
  return [...records].sort((a, b) => {
    let valA = a[key] || '';
    let valB = b[key] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return dir === 'asc' ? -1 : 1;
    if (valA > valB) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
