// ============================================================================
// SISPAGER-GRD :: Toast Notification Component
// ============================================================================

let _container = null;

/**
 * Ensure the toast container exists
 */
function getContainer() {
  if (!_container || !document.body.contains(_container)) {
    _container = document.createElement('div');
    _container.className = 'toast-container';
    document.body.appendChild(_container);
  }
  return _container;
}

/**
 * Show a toast notification
 * @param {string} message - Notification message
 * @param {string} [type='info'] - 'success' | 'error' | 'warning' | 'info'
 * @param {number} [duration=4000] - Auto-dismiss duration in ms
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = getContainer();

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" title="Cerrar">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger slide-in animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Close handler
  const dismiss = () => {
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', dismiss);

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return toast;
}
