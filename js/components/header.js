// ============================================================================
// SISPAGER-GRD :: Header Component
// ============================================================================

/**
 * Renders a page header with title, optional subtitle, and optional actions
 * @param {string} title - Main page title
 * @param {string} [subtitle] - Optional description / breadcrumb text
 * @param {string} [actions] - Optional HTML string for action buttons
 * @returns {string} HTML string
 */
export function renderHeader(title, subtitle, actions) {
  return `
    <header class="page-header">
      <div class="page-header-left">
        <button class="menu-toggle" id="menu-toggle" title="Menú">
          <i data-lucide="menu"></i>
        </button>
        <div>
          <h1 class="page-title">${title}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      ${actions ? `<div class="page-header-actions">${actions}</div>` : ''}
    </header>
  `;
}

/**
 * Initialize the header hamburger menu button
 * Should be called after rendering a header
 */
export function initHeader() {
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('toggle-sidebar'));
    });
  }
}
