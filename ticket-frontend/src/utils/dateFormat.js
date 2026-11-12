/**
 * Formats a date value using the Indian standard DD/MM/YYYY format.
 * Preserves pure YYYY-MM-DD strings without timezone shifting.
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatIndianDate(value, fallback = '—') {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day}/${month}/${year}`;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a timestamp into DD/MM/YYYY, hh:mm am/pm using the Indian locale.
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatIndianDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = formatIndianDate(date, fallback);
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart}, ${timePart}`;
}

/**
 * Formats a time value in 12-hour Indian locale notation (hh:mm am/pm).
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatIndianTime(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
