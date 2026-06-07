/**
 * SISPAGER-GRD - Helper Utilities
 * Common utility functions used throughout the application
 */

/**
 * Format a Date object to DD/MM/YYYY string.
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date string or empty string if invalid
 */
export function formatDate(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format a Date object to DD/MM/YYYY HH:mm string.
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date-time string or empty string if invalid
 */
export function formatDateTime(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Parse a DD/MM/YYYY string into a Date object.
 * @param {string} str - Date string in DD/MM/YYYY format
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);
  // Verify the date is valid (handles cases like 31/02/2024)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

/**
 * Generate a unique ID string combining timestamp and random characters.
 * @returns {string} Unique identifier
 */
export function generateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const extraRandom = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${randomPart}-${extraRandom}`;
}

/**
 * Create a debounced version of a function.
 * @param {Function} fn - The function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, ms = 300) {
  let timeoutId = null;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
}

/**
 * Escape HTML entities in a string to prevent XSS.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Truncate text to a maximum length with ellipsis.
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length (default 100)
 * @returns {string} Truncated string
 */
export function truncateText(str, maxLen = 100) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen).trimEnd() + '…';
}

/**
 * Convert a string to a URL-safe slug.
 * @param {string} str - String to slugify
 * @returns {string} URL-safe slug
 */
export function slugify(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // Remove non-alphanumeric chars
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-|-$/g, '');           // Trim leading/trailing hyphens
}

/**
 * Trigger a browser file download from a Blob.
 * @param {Blob} blob - The blob data to download
 * @param {string} filename - Name for the downloaded file
 */
export function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob)) {
    console.error('downloadBlob: Invalid blob provided');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);
}

/**
 * Hash a password using SHA-256 via the Web Crypto API.
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
