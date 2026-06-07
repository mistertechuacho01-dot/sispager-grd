/**
 * SISPAGER-GRD - Validators
 * Form and field validation utilities
 */

/**
 * Validate that a value is not empty.
 * @param {*} value - The value to check
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {{ valid: boolean, message: string }}
 */
export function validateRequired(value, fieldName = 'Campo') {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed === null || trimmed === undefined || trimmed === '') {
    return { valid: false, message: `${fieldName} es obligatorio.` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate that a string value meets a minimum length.
 * @param {string} value - The string to check
 * @param {number} min - Minimum length required
 * @param {string} fieldName - Human-readable field name for error messages
 * @returns {{ valid: boolean, message: string }}
 */
export function validateMinLength(value, min, fieldName = 'Campo') {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: `${fieldName} debe tener al menos ${min} caracteres.` };
  }
  if (value.trim().length < min) {
    return { valid: false, message: `${fieldName} debe tener al menos ${min} caracteres.` };
  }
  return { valid: true, message: '' };
}

/**
 * Validate that a string is a valid email address.
 * @param {string} value - The email string to validate
 * @returns {{ valid: boolean, message: string }}
 */
export function validateEmail(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: 'El correo electrónico es inválido.' };
  }
  // RFC 5322 simplified pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(value.trim())) {
    return { valid: false, message: 'El correo electrónico es inválido.' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate that a string represents a valid date in DD/MM/YYYY format.
 * @param {string} value - The date string to validate
 * @returns {{ valid: boolean, message: string }}
 */
export function validateDate(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: 'La fecha es inválida.' };
  }

  const trimmed = value.trim();

  // Accept HTML date input format (YYYY-MM-DD) as well
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dMyRegex = /^\d{2}\/\d{2}\/\d{4}$/;

  let day, month, year;

  if (dMyRegex.test(trimmed)) {
    const parts = trimmed.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (isoRegex.test(trimmed)) {
    const parts = trimmed.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return { valid: false, message: 'La fecha debe tener el formato DD/MM/YYYY.' };
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { valid: false, message: 'La fecha contiene valores no numéricos.' };
  }

  if (month < 1 || month > 12) {
    return { valid: false, message: 'El mes debe estar entre 1 y 12.' };
  }

  // Validate the day by constructing a Date and checking consistency
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { valid: false, message: 'La fecha no es válida.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validate an entire form data object against a set of rules.
 *
 * Rules format:
 * {
 *   fieldName: ['required', 'minLength:10', 'email', 'date'],
 *   anotherField: ['required']
 * }
 *
 * Supported rules:
 * - 'required'       → validateRequired
 * - 'minLength:N'    → validateMinLength with N characters
 * - 'email'          → validateEmail
 * - 'date'           → validateDate
 *
 * @param {Object} data - Form data object { fieldName: value, ... }
 * @param {Object} rules - Validation rules { fieldName: ['rule1', 'rule2'], ... }
 * @returns {{ valid: boolean, errors: Object }} Validation result with per-field errors
 */
export function validateForm(data, rules) {
  const errors = {};
  let valid = true;

  // Map of friendly field names (optional, falls back to key)
  const fieldLabels = {
    subprocess: 'Subproceso',
    region: 'Región',
    province: 'Provincia',
    district: 'Distrito',
    date: 'Fecha',
    problem: 'Problema/Situación',
    impact: 'Impacto',
    lesson: 'Lección aprendida',
    recommendations: 'Recomendaciones',
    approvedBy: 'Aprobado por',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    fullName: 'Nombre completo',
    email: 'Correo electrónico',
    role: 'Rol',
    authorName: 'Nombre del autor'
  };

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (!Array.isArray(fieldRules)) continue;

    const value = data[field];
    const label = fieldLabels[field] || field;

    for (const rule of fieldRules) {
      let result = { valid: true, message: '' };

      if (rule === 'required') {
        result = validateRequired(value, label);
      } else if (rule.startsWith('minLength:')) {
        const min = parseInt(rule.split(':')[1], 10);
        if (!isNaN(min)) {
          result = validateMinLength(value, min, label);
        }
      } else if (rule === 'email') {
        // Only validate email if value is present (use 'required' rule to enforce presence)
        if (value && typeof value === 'string' && value.trim() !== '') {
          result = validateEmail(value);
        }
      } else if (rule === 'date') {
        // Only validate date if value is present
        if (value && typeof value === 'string' && value.trim() !== '') {
          result = validateDate(value);
        }
      }

      if (!result.valid) {
        errors[field] = result.message;
        valid = false;
        break; // Stop at first error for this field
      }
    }
  }

  return { valid, errors };
}
