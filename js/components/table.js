// ============================================================================
// SISPAGER-GRD :: Data Table Component
// ============================================================================
import { getCurrentUser } from '../services/auth.js';

/**
 * Create a data table with sorting, pagination, and actions
 * @param {Object} options
 * @param {Array<{key:string, label:string, sortable?:boolean, render?:Function}>} options.columns
 * @param {Array} options.data - Array of row objects
 * @param {string} [options.sortKey] - Current sort column key
 * @param {string} [options.sortDir='asc'] - 'asc' | 'desc'
 * @param {Function} [options.onSort] - Called with (key) when a sortable header is clicked
 * @param {Function} [options.onAction] - Called with (action, row) for row actions
 * @param {string} [options.emptyMessage='No se encontraron registros']
 * @param {Object} [options.pagination] - { page, perPage, total }
 * @param {boolean} [options.showActions=true]
 * @param {Array<string>} [options.actions=['edit','delete','print']]
 * @returns {string} HTML string
 */
export function createTable(options = {}) {
  const {
    columns = [],
    data = [],
    sortKey = '',
    sortDir = 'asc',
    onSort,
    emptyMessage = 'No se encontraron registros',
    pagination,
    showActions = true,
    actions = ['edit', 'delete', 'print']
  } = options;

  if (!data || data.length === 0) {
    return `
      <div class="data-table-wrapper">
        <div class="table-empty">
          <div class="table-empty-icon">
            <i data-lucide="search-x"></i>
          </div>
          <p class="table-empty-message">${emptyMessage}</p>
        </div>
      </div>
    `;
  }

  // Build header
  const headerCells = columns.map(col => {
    const isSorted = col.key === sortKey;
    const indicator = isSorted ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    const sortableClass = col.sortable ? 'sortable' : '';
    const sortAttr = col.sortable ? `data-sort-key="${col.key}"` : '';
    return `<th class="${sortableClass}" ${sortAttr}>${col.label}<span class="sort-indicator">${indicator}</span></th>`;
  }).join('');

  const actionsHeader = showActions ? '<th class="th-actions">Acciones</th>' : '';

  // Build rows
  const rows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      const rendered = col.render ? col.render(value, row) : (value ?? '');
      return `<td>${rendered}</td>`;
    }).join('');

    let actionCells = '';
    if (showActions) {
      const actionButtons = [];
      
      const user = getCurrentUser();
      const isAdmin = user && user.role === 'admin';
      const isApproved = !!(row.approvedBy && row.approvedBy.trim());
      const isApprover = user && row.approvedBy && user.fullName.toUpperCase() === row.approvedBy.trim().toUpperCase();

      if (actions.includes('edit')) {
        if (isApproved && !isAdmin && !isApprover) {
          actionButtons.push(`<button class="btn-action btn-action-edit" data-action="edit" data-id="${row.id}" title="Ver (Aprobado)"><i data-lucide="eye"></i></button>`);
        } else {
          actionButtons.push(`<button class="btn-action btn-action-edit" data-action="edit" data-id="${row.id}" title="Editar"><i data-lucide="pencil"></i></button>`);
        }
      }
      if (actions.includes('delete')) {
        actionButtons.push(`<button class="btn-action btn-action-delete" data-action="delete" data-id="${row.id}" title="Eliminar"><i data-lucide="trash-2"></i></button>`);
      }
      if (actions.includes('print')) {
        actionButtons.push(`<button class="btn-action btn-action-print" data-action="print" data-id="${row.id}" title="Imprimir"><i data-lucide="printer"></i></button>`);
      }
      actionCells = `<td class="table-actions">${actionButtons.join('')}</td>`;
    }

    return `<tr data-id="${row.id}">${cells}${actionCells}</tr>`;
  }).join('');

  // Pagination
  let paginationHTML = '';
  if (pagination) {
    const { page, perPage, total } = pagination;
    const totalPages = Math.ceil(total / perPage);
    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    let pageButtons = '';
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Prev button
    pageButtons += `<button class="pagination-btn ${page <= 1 ? 'disabled' : ''}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left"></i>
    </button>`;

    if (startPage > 1) {
      pageButtons += `<button class="pagination-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        pageButtons += `<span class="pagination-ellipsis">…</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons += `<span class="pagination-ellipsis">…</span>`;
      }
      pageButtons += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    pageButtons += `<button class="pagination-btn ${page >= totalPages ? 'disabled' : ''}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right"></i>
    </button>`;

    paginationHTML = `
      <div class="table-pagination">
        <span class="pagination-info">Mostrando ${from}–${to} de ${total} registros</span>
        <div class="pagination-controls">${pageButtons}</div>
      </div>
    `;
  }

  return `
    <div class="data-table-wrapper">
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>${headerCells}${actionsHeader}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${paginationHTML}
    </div>
  `;
}

/**
 * Initialize table event handlers (sort, pagination, actions)
 * Call after rendering createTable output into the DOM.
 * @param {HTMLElement} container - The container holding the table
 * @param {Object} callbacks - { onSort, onAction, onPageChange }
 */
export function initTable(container, callbacks = {}) {
  if (!container) return;

  const { onSort, onAction, onPageChange } = callbacks;

  // Sort headers
  if (onSort) {
    container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (key) onSort(key);
      });
    });
  }

  // Action buttons
  if (onAction) {
    container.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        onAction(action, id);
      });
    });
  }

  // Pagination buttons
  if (onPageChange) {
    container.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (!isNaN(page)) onPageChange(page);
      });
    });
  }

  // Activate lucide icons within the table
  if (window.lucide) window.lucide.createIcons();
}
