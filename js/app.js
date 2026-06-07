// ============================================================================
// SISPAGER-GRD :: Main Application Entry Point & Router
// ============================================================================
import { initDatabase } from './services/database.js';
import { isAuthenticated, getCurrentUser, logout, verifySession } from './services/auth.js';
import { renderLogin } from './modules/login.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderForm } from './modules/form.js';
import { renderExplorer } from './modules/explorer.js';
import { renderReports } from './modules/reports.js';
import { renderAdmin } from './modules/admin.js';
import { renderSidebar, initSidebar } from './components/sidebar.js';

// Application state
const state = {
  currentPage: 'dashboard',
  currentParams: null
};

/**
 * Initialize application
 */
async function init() {
  // 1. Initialize DB connection (no-op client-side; server auto-inits)
  await initDatabase();

  // 2. Setup Routing listener
  window.addEventListener('sispager:navigate', (e) => {
    const { page, params } = e.detail;
    navigate(page, params);
  });

  // 3. Verify session with server (validates JWT cookie)
  const user = await verifySession();
  if (!user) {
    showLoginView();
  } else {
    showMainAppView();
  }
}

/**
 * Show login view (replacing whole #app container)
 */
function showLoginView() {
  renderLogin(() => {
    showMainAppView();
  });
}

/**
 * Show main application frame with sidebar and main content
 */
function showMainAppView() {
  const appContainer = document.getElementById('app');
  
  appContainer.innerHTML = `
    <div class="app-container">
      <div id="sidebar-container"></div>
      <main class="main-content">
        <div id="main-page-content"></div>
      </main>
    </div>
  `;

  // Render & Init Sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = renderSidebar();
  }
  initSidebar(
    (pageId) => {
      navigate(pageId);
    },
    () => {
      logout();
      showLoginView();
    }
  );

  // Navigate to default or current page
  navigate(state.currentPage);
}

/**
 * Router / Navigation function
 * @param {string} page - Page name
 * @param {any} [params] - Query/route params (like edit ID)
 */
async function navigate(page, params = null) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  state.currentPage = page;
  state.currentParams = params;

  const contentContainer = document.getElementById('main-page-content');
  if (!contentContainer) return;

  // Clear any persistent handlers if needed
  contentContainer.innerHTML = '<div class="skeleton-loader"><div class="skeleton" style="height: 40px; margin-bottom: 20px;"></div><div class="skeleton" style="height: 200px;"></div></div>';

  const user = getCurrentUser();

  // Update sidebar active link state
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const route = link.getAttribute('data-route');
    if (route === page || (page.startsWith('form') && route === 'form')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  try {
    switch (page) {
      case 'dashboard':
        await renderDashboard(contentContainer, navigate);
        break;
      case 'form':
        const editId = params ? parseInt(params) : null;
        await renderForm(contentContainer, navigate, editId);
        break;
      case 'explorer':
        await renderExplorer(contentContainer, navigate);
        break;
      case 'reports':
        await renderReports(contentContainer, navigate);
        break;
      case 'admin':
        if (user && user.role === 'admin') {
          await renderAdmin(contentContainer, navigate);
        } else {
          navigate('dashboard');
        }
        break;
      default:
        await renderDashboard(contentContainer, navigate);
    }
  } catch (error) {
    console.error(`Error rendering page ${page}:`, error);
    contentContainer.innerHTML = `
      <div class="error-state">
        <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--danger);"></i>
        <h3>Error al cargar la página</h3>
        <p>Ha ocurrido un problema inesperado al cargar esta sección. Por favor intente nuevamente.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Reintentar</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Force uppercase on all text inputs and textareas globally
document.addEventListener('input', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    if (e.target.type !== 'date' && e.target.type !== 'checkbox' && e.target.type !== 'radio') {
      if (e.target.type !== 'password') {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        // Restore cursor position if applicable
        if (start !== null && end !== null) {
          e.target.setSelectionRange(start, end);
        }
      } else {
        // Safe for password type inputs, no cursor selection range calls to avoid browser exceptions
        e.target.value = e.target.value.toUpperCase();
      }
    }
  }
});

// Start app on DOM content loaded
document.addEventListener('DOMContentLoaded', init);
export { navigate };

