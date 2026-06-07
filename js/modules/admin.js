// ============================================================================
// SISPAGER-GRD :: Admin Module (User Management)
// ============================================================================
import { getCurrentUser, isAdmin } from '../services/auth.js';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/database.js';
import { REGIONS, ROLES } from '../utils/constants.js';
import { renderHeader, initHeader } from '../components/header.js';
import { createTable, initTable } from '../components/table.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let _users = [];

/**
 * Render the admin page
 * @param {HTMLElement} container
 * @param {Function} navigate
 */
export async function renderAdmin(container, navigate) {
  const currentUser = getCurrentUser();

  if (!isAdmin()) {
    container.innerHTML = `
      <div class="access-denied">
        <i data-lucide="shield-x"></i>
        <h2>Acceso Denegado</h2>
        <p>No tiene permisos para acceder a esta sección.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = `
    ${renderHeader(
      'Gestión de Usuarios',
      'Administración de cuentas de usuario del sistema',
      `<button class="btn btn-primary" id="btn-new-user">
        <i data-lucide="user-plus"></i> Nuevo Usuario
      </button>`
    )}
    <div class="admin-content">
      <div id="admin-table" class="admin-table-container">
        <div class="loading-skeleton">
          <div class="skeleton-row"></div><div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </div>
      </div>
    </div>
  `;

  initHeader();
  if (window.lucide) window.lucide.createIcons();

  // Load users
  try {
    _users = await getAllUsers();
    renderUsersTable(currentUser);
  } catch (err) {
    showToast('Error al cargar usuarios', 'error');
    console.error('Admin load error:', err);
  }

  // New user button
  document.getElementById('btn-new-user')?.addEventListener('click', () => {
    showUserModal(null, currentUser);
  });
}

/**
 * Render the users table
 */
function renderUsersTable(currentUser) {
  const tableContainer = document.getElementById('admin-table');
  if (!tableContainer) return;

  const columns = [
    { key: 'fullName', label: 'Nombre Completo', sortable: true },
    { key: 'username', label: 'Usuario', sortable: true },
    {
      key: 'role', label: 'Rol', sortable: true,
      render: (val) => {
        const label = val === 'admin' ? 'Administrador' : 'Colaborador';
        const cls = val === 'admin' ? 'admin' : 'collaborator';
        return `<span class="role-badge ${cls}">${label}</span>`;
      }
    },
    { key: 'region', label: 'Región', sortable: true },
    {
      key: 'createdAt', label: 'Fecha Creación', sortable: true,
      render: (val) => {
        if (!val) return 'N/A';
        return new Date(val).toLocaleDateString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
      }
    }
  ];

  const tableHTML = createTable({
    columns,
    data: _users,
    sortKey: 'fullName',
    sortDir: 'asc',
    showActions: true,
    actions: ['edit', 'delete'],
    emptyMessage: 'No hay usuarios registrados'
  });

  tableContainer.innerHTML = tableHTML;

  initTable(tableContainer, {
    onAction: (action, id) => {
      if (action === 'edit') {
        const user = _users.find(u => String(u.id) === String(id));
        if (user) showUserModal(user, currentUser);
      } else if (action === 'delete') {
        handleDeleteUser(id, currentUser);
      }
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Show user create/edit modal
 */
function showUserModal(user, currentUser) {
  const isEdit = !!user;

  const regionOpts = REGIONS.map(r =>
    `<option value="${r}" ${user?.region === r ? 'selected' : ''}>${r}</option>`
  ).join('');

  const modal = showModal({
    title: isEdit ? 'Editar Usuario' : 'Nuevo Usuario',
    content: `
      <form id="user-form" class="modal-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="user-fullname">Nombre Completo <span class="required">*</span></label>
          <input type="text" id="user-fullname" class="form-control" 
            value="${user?.fullName || ''}" placeholder="Nombre completo" required />
          <span class="form-error" id="error-user-fullname"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="user-username">Nombre de Usuario <span class="required">*</span></label>
          <input type="text" id="user-username" class="form-control" 
            value="${user?.username || ''}" placeholder="nombre.usuario"
            ${isEdit ? 'readonly' : ''} required />
          <span class="form-error" id="error-user-username"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="user-password">
            Contraseña ${isEdit ? '(dejar vacío para no cambiar)' : '<span class="required">*</span>'}
          </label>
          <input type="password" id="user-password" class="form-control"
            placeholder="${isEdit ? '••••••••' : 'Contraseña'}" 
            ${isEdit ? '' : 'required'} />
          <span class="form-error" id="error-user-password"></span>
        </div>

        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label" for="user-role">Rol <span class="required">*</span></label>
            <select id="user-role" class="form-control" required>
              <option value="collaborator" ${user?.role === 'collaborator' || !user ? 'selected' : ''}>Colaborador</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="user-region">Región</label>
            <select id="user-region" class="form-control">
              <option value="">Sin asignar</option>
              ${regionOpts}
            </select>
          </div>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" id="modal-user-cancel">Cancelar</button>
      <button type="button" class="btn btn-primary" id="modal-user-save">
        <i data-lucide="save"></i> ${isEdit ? 'Actualizar' : 'Crear'}
      </button>
    `,
    size: 'md'
  });

  if (window.lucide) window.lucide.createIcons();

  modal.querySelector('#modal-user-cancel')?.addEventListener('click', () => closeModal());

  // Prevent form submit on enter
  modal.querySelector('#user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('modal-user-save')?.click();
  });

  modal.querySelector('#modal-user-save')?.addEventListener('click', async () => {
    const fullName = document.getElementById('user-fullname').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const region = document.getElementById('user-region').value;

    // Validate
    let hasError = false;

    if (!fullName) {
      showFieldError('error-user-fullname', 'El nombre es requerido');
      hasError = true;
    }
    if (!username) {
      showFieldError('error-user-username', 'El usuario es requerido');
      hasError = true;
    }
    if (!isEdit && !password) {
      showFieldError('error-user-password', 'La contraseña es requerida');
      hasError = true;
    }
    if (password && password.length < 4) {
      showFieldError('error-user-password', 'La contraseña debe tener al menos 4 caracteres');
      hasError = true;
    }

    if (hasError) return;

    // Check duplicate username on create
    if (!isEdit) {
      const existing = _users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        showFieldError('error-user-username', 'Este nombre de usuario ya existe');
        return;
      }
    }

    const userData = { fullName, username, role, region };
    if (password) userData.password = password;

    try {
      if (isEdit) {
        await updateUser(user.id, userData);
        showToast('Usuario actualizado exitosamente', 'success');
      } else {
        userData.createdAt = new Date().toISOString();
        await createUser(userData);
        showToast('Usuario creado exitosamente', 'success');
      }

      closeModal();

      // Reload
      _users = await getAllUsers();
      renderUsersTable(currentUser);

    } catch (err) {
      showToast('Error al guardar usuario', 'error');
      console.error('User save error:', err);
    }
  });
}

/**
 * Handle delete user
 */
function handleDeleteUser(id, currentUser) {
  // Cannot delete self
  if (String(id) === String(currentUser.id)) {
    showToast('No puede eliminar su propia cuenta', 'warning');
    return;
  }

  // Cannot delete last admin
  const user = _users.find(u => String(u.id) === String(id));
  if (user?.role === 'admin') {
    const adminCount = _users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      showToast('No se puede eliminar el último administrador', 'warning');
      return;
    }
  }

  showConfirm(
    `¿Está seguro que desea eliminar al usuario "${user?.fullName || ''}"? Esta acción no se puede deshacer.`,
    async () => {
      try {
        await deleteUser(id);
        _users = _users.filter(u => String(u.id) !== String(id));
        showToast('Usuario eliminado exitosamente', 'success');
        renderUsersTable(currentUser);
      } catch (err) {
        showToast('Error al eliminar usuario', 'error');
      }
    }
  );
}

function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}
