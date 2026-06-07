// ============================================================================
// SISPAGER-GRD :: Sidebar Component
// ============================================================================
import { getCurrentUser, isAdmin } from '../services/auth.js';
import { NAV_ITEMS } from '../utils/constants.js';
import { getApiKey, saveApiKey } from '../services/ai.js';
import { showModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

let _activePageId = 'dashboard';

/**
 * Renders the sidebar HTML
 */
export function renderSidebar() {
  const user = getCurrentUser();
  const admin = isAdmin();
  const roleBadgeClass = admin ? 'admin' : 'collaborator';
  const roleLabel = admin ? 'Administrador' : 'Colaborador';

  const navItems = NAV_ITEMS
    .filter(item => !item.adminOnly || admin)
    .map(item => `
      <a href="#" class="nav-item ${item.id === _activePageId ? 'active' : ''}" data-page="${item.id}">
        <i data-lucide="${item.icon}"></i>
        <span class="sidebar-text nav-label">${item.label}</span>
      </a>
    `).join('');

  return `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo-container">
          <img src="/assets/logo_indeci.png" alt="INDECI Logo" class="sidebar-logo-img" />
        </div>
        <div class="sidebar-header-text">
          <h1 class="sidebar-header-title">SISPAGER - GRD</h1>
          <span class="sidebar-header-subtitle">Sistema de Gestión de Riesgos</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${navItems}
      </nav>

      <div class="sidebar-footer" style="flex-direction: column; align-items: stretch; gap: var(--space-2);">
        <div class="user-info" style="display: flex; align-items: center; gap: var(--space-3); width: 100%;">
          <div class="sidebar-user-avatar user-avatar">
            <i data-lucide="user"></i>
          </div>
          <div class="sidebar-user-info user-details">
            <span class="sidebar-user-name user-name">${user?.fullName || 'Usuario'}</span>
            <span class="sidebar-user-role role-badge ${roleBadgeClass}">${roleLabel}</span>
          </div>
        </div>
        <div class="sidebar-footer-buttons" style="display: flex; flex-direction: column; gap: var(--space-1); width: 100%;">
          <button class="sidebar-footer-btn" id="btn-ai-config" title="Configuración IA">
            <i data-lucide="cpu"></i>
            <span class="sidebar-text nav-label">Configuración IA</span>
          </button>
          <button class="sidebar-footer-btn" id="btn-logout" title="Cerrar sesión">
            <i data-lucide="log-out"></i>
            <span class="sidebar-text nav-label">Salir</span>
          </button>
        </div>
      </div>

      <button class="sidebar-toggle" id="sidebar-toggle" title="Colapsar menú">
        <i data-lucide="chevrons-left"></i>
      </button>
    </aside>
  `;
}

/**
 * Set the active nav item
 */
export function setActiveNavItem(pageId) {
  _activePageId = pageId;
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
}

/**
 * Initialize sidebar event handlers
 */
export function initSidebar(onNavigate, onLogout) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('sidebar-toggle');
  const logoutBtn = document.getElementById('btn-logout');

  if (!sidebar) return;

  // Navigation click delegation
  const nav = sidebar.querySelector('.sidebar-nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (!navItem) return;
      e.preventDefault();
      const pageId = navItem.dataset.page;
      setActiveNavItem(pageId);
      if (onNavigate) onNavigate(pageId);
      // Close on mobile
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('sidebar-open');
        overlay.classList.remove('active');
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (onLogout) onLogout();
    });
  }

  // AI Config
  const aiConfigBtn = document.getElementById('btn-ai-config');
  if (aiConfigBtn) {
    aiConfigBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAiConfigModal();
    });
  }

  // Collapse toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      
      // Toggle collapsed class on app container too
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
      }
      
      // Update toggle icon
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide',
          sidebar.classList.contains('collapsed') ? 'chevrons-right' : 'chevrons-left'
        );
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Overlay click (mobile)
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('sidebar-open');
      overlay.classList.remove('active');
    });
  }

  // Listen for toggle-sidebar event (from hamburger menu)
  document.addEventListener('toggle-sidebar', () => {
    if (window.innerWidth <= 1024) {
      sidebar.classList.toggle('sidebar-open');
      overlay.classList.toggle('active');
    }
  });

  // Activate lucide icons
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Open the AI Configuration modal
 */
function openAiConfigModal() {
  const currentKey = getApiKey() || '';
  
  showModal({
    title: 'Configuración de IA (Gemini)',
    content: `
      <div class="ai-config-modal-body">
        <p class="mb-2" style="font-size: var(--font-size-sm); color: var(--color-accent) !important; line-height: 1.5; font-weight: var(--font-weight-medium);">
          SISPAGER-GRD utiliza la inteligencia artificial de <strong style="color: var(--color-primary-light);">Google Gemini</strong> para analizar los registros y sugerir lecciones aprendidas y planes de acción operativos.
        </p>
        <p class="mb-3" style="font-size: var(--font-size-sm); color: var(--color-accent) !important; line-height: 1.5; font-weight: var(--font-weight-medium);">
          Ingrese su API Key de Gemini. Esta se guardará de forma segura en su navegador (localStorage) y nunca será compartida.
        </p>
        <div class="form-group">
          <label class="form-label" for="gemini-api-key-input" style="color: var(--color-accent) !important; font-weight: var(--font-weight-semibold);">Gemini API Key</label>
          <input type="password" id="gemini-api-key-input" class="form-control form-input w-full" 
            value="${currentKey}" placeholder="AIzaSy..." style="font-family: monospace; text-transform: none; border-color: var(--color-accent);" />
          <p class="form-help-text" style="color: var(--color-accent) !important; opacity: 0.9;">Si no ingresa una clave, el sistema utilizará un motor de reglas local como fallback.</p>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" id="modal-ai-cancel">Cancelar</button>
      ${currentKey ? `<button class="btn btn-danger" id="modal-ai-clear" style="margin-right: auto;">Eliminar Clave</button>` : ''}
      <button class="btn btn-primary" id="modal-ai-save">Guardar</button>
    `,
    size: 'md'
  });

  document.getElementById('modal-ai-cancel')?.addEventListener('click', () => closeModal());
  
  document.getElementById('modal-ai-clear')?.addEventListener('click', () => {
    saveApiKey(null);
    showToast('Clave de API eliminada', 'info');
    closeModal();
  });

  document.getElementById('modal-ai-save')?.addEventListener('click', () => {
    const keyInput = document.getElementById('gemini-api-key-input');
    const newKey = keyInput ? keyInput.value.trim() : '';
    
    if (!newKey) {
      showToast('Por favor ingrese una clave válida o cancele', 'warning');
      return;
    }

    saveApiKey(newKey);
    showToast('Clave de API guardada exitosamente', 'success');
    closeModal();
  });
}
