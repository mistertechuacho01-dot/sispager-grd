// ============================================================================
// SISPAGER-GRD :: Modal Component
// ============================================================================

let _currentModal = null;
let _escHandler = null;

/**
 * Show a modal dialog
 * @param {Object} options
 * @param {string} options.title - Modal title
 * @param {string} options.content - HTML string for body
 * @param {string} [options.footer] - HTML string for footer buttons
 * @param {string} [options.size='md'] - 'sm' | 'md' | 'lg'
 * @param {Function} [options.onClose] - Callback when modal closes
 * @returns {HTMLElement} The modal overlay element
 */
export function showModal(options = {}) {
  // Close any existing modal first
  closeModal();

  const { title = '', content = '', footer = '', size = 'md', onClose } = options;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card ${size}">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" title="Cerrar">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  _currentModal = { overlay, onClose };

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('modal-active');
  });

  // Close button
  overlay.querySelector('.modal-close').addEventListener('click', () => closeModal());

  // Overlay click (outside the card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Escape key
  _escHandler = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', _escHandler);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  return overlay;
}

/**
 * Close the current modal
 */
export function closeModal() {
  if (!_currentModal) return;

  const { overlay, onClose } = _currentModal;
  overlay.classList.remove('modal-active');
  overlay.classList.add('modal-closing');

  // Remove escape handler
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }

  // Restore body scroll
  document.body.style.overflow = '';

  // Remove after animation
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (onClose) onClose();
  }, 250);

  _currentModal = null;
}

/**
 * Show a confirmation dialog
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 */
export function showConfirm(message, onConfirm) {
  const modal = showModal({
    title: 'Confirmar acción',
    content: `<p class="modal-confirm-message">${message}</p>`,
    footer: `
      <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
      <button class="btn btn-danger" id="modal-confirm">Confirmar</button>
    `,
    size: 'sm'
  });

  modal.querySelector('#modal-cancel').addEventListener('click', () => closeModal());
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });

  return modal;
}

/**
 * Show a simple alert modal
 * @param {string} message - Alert message
 * @param {string} [type='info'] - 'success' | 'error' | 'warning' | 'info'
 */
export function showAlert(message, type = 'info') {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const modal = showModal({
    title: '',
    content: `
      <div class="modal-alert-content">
        <div class="modal-alert-icon ${type}">${icons[type] || icons.info}</div>
        <p class="modal-alert-message">${message}</p>
      </div>
    `,
    footer: `<button class="btn btn-primary" id="modal-ok">Aceptar</button>`,
    size: 'sm'
  });

  modal.querySelector('#modal-ok').addEventListener('click', () => closeModal());

  return modal;
}
