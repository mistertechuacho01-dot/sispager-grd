// ============================================================================
// SISPAGER-GRD :: Login Module
// ============================================================================
import { login } from '../services/auth.js';

/**
 * Render the full-page login screen
 * @param {Function} onLoginSuccess - Called with the user object after successful login
 */
export function renderLogin(onLoginSuccess) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="login-container">
      <!-- Animated background floating particles -->
      <div class="login-particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
      </div>

      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <img src="/assets/logo_indeci.png" alt="INDECI Logo" class="login-logo-img" style="height: 70px; object-fit: contain; background: white; padding: var(--space-2); border-radius: var(--radius-lg); box-shadow: 0 8px 24px rgba(0, 103, 177, 0.25);" />
          </div>
          <h1 class="login-title">SISPAGER-GRD</h1>
          <p class="login-subtitle">Sistema de Gestión de Lecciones Aprendidas en GRD</p>
        </div>

        <form class="login-form" id="login-form" autocomplete="off">
          <div class="form-group">
            <label for="login-username" class="form-label">
              <span>Usuario</span>
            </label>
            <div class="form-input-wrapper">
              <input type="text" id="login-username" class="form-input" 
                placeholder="Ingrese su usuario" required autocomplete="username" />
              <i class="input-icon" data-lucide="user"></i>
            </div>
          </div>

          <div class="form-group">
            <label for="login-password" class="form-label">
              <span>Contraseña</span>
            </label>
            <div class="form-input-wrapper">
              <input type="password" id="login-password" class="form-input"
                placeholder="Ingrese su contraseña" required autocomplete="current-password" />
              <i class="input-icon" data-lucide="lock"></i>
              <button type="button" class="password-toggle" id="toggle-password" tabindex="-1">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </div>

          <div class="login-error" id="login-error" style="display: none;"></div>

          <button type="submit" class="login-btn" id="login-btn">
            <span>Iniciar Sesión</span>
          </button>
        </form>

        <div class="login-footer">
          <p>Gestión de Riesgos de Desastres</p>
        </div>
      </div>
    </div>
  `;

  // Activate lucide icons
  if (window.lucide) window.lucide.createIcons();

  // References
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const togglePwdBtn = document.getElementById('toggle-password');

  // Toggle password visibility
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      const icon = togglePwdBtn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    errorEl.classList.remove('show', 'shake');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Por favor ingrese usuario y contraseña');
      return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="btn-spinner"></span><span>Ingresando...</span>';

    try {
      const user = await login(username, password);
      if (user) {
        // Success animation
        const card = document.querySelector('.login-card');
        if (card) card.classList.add('login-success');

        setTimeout(() => {
          onLoginSuccess(user);
        }, 400);
      } else {
        showError('Usuario o contraseña incorrectos');
        resetButton();
      }
    } catch (err) {
      showError('Error al iniciar sesión. Intente nuevamente.');
      resetButton();
    }
  });

  function showError(msg) {
    errorEl.innerHTML = `<i class="error-icon" data-lucide="alert-circle"></i> <span>${msg}</span>`;
    errorEl.style.display = 'flex';
    errorEl.classList.add('show');
    if (window.lucide) window.lucide.createIcons();
    // Trigger shake animation
    requestAnimationFrame(() => {
      errorEl.classList.add('shake');
    });
    // Remove shake class after animation
    setTimeout(() => errorEl.classList.remove('shake'), 500);
  }

  function resetButton() {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>Iniciar Sesión</span>';
  }

  // Auto-focus username
  usernameInput.focus();
}
