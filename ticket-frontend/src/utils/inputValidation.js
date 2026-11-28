/**
 * Shared input length limits and meaningful-text validation helpers.
 * Ensures text fields do not accept:
 * - only special characters
 * - only numbers (except dedicated number fields)
 * - unbounded ("n") number of characters
 */

export const INPUT_LIMITS = {
  CODE: 30,
  VERSION: 30,
  PHONE: 20,
  NAME: 100,
  TITLE: 120,
  SHORT_TEXT: 120,
  SEARCH: 100,
  EMAIL: 150,
  PASSWORD: 100,
  URL: 300,
  CELL: 500,
  DESCRIPTION: 1000,
};

/**
 * Validates that a text value is within length bounds and contains meaningful text
 * (i.e. not solely special characters or solely numbers, unless explicitly allowed).
 *
 * @param {string} value
 * @param {object} [options]
 * @param {string} [options.label='This field']
 * @param {boolean} [options.required=false]
 * @param {number} [options.minLength=1]
 * @param {number} [options.maxLength=INPUT_LIMITS.TITLE]
 * @param {boolean} [options.allowNumbersOnly=false]
 * @param {boolean} [options.isEmail=false]
 * @param {boolean} [options.isUrl=false]
 * @returns {string} Empty string if valid, otherwise a user-friendly error message.
 */
export function validateMeaningfulText(
  value,
  {
    label = 'This field',
    required = false,
    minLength = 1,
    maxLength = INPUT_LIMITS.TITLE,
    allowNumbersOnly = false,
    isEmail = false,
    isUrl = false,
  } = {}
) {
  const raw = String(value ?? '');
  const trimmed = raw.trim();

  if (!trimmed) {
    return required ? `${label} is required.` : '';
  }

  if (trimmed.length > maxLength) {
    return `${label} must not exceed ${maxLength} characters.`;
  }

  if (minLength > 0 && trimmed.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }

  if (isEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return `Please enter a valid ${label.toLowerCase()}.`;
    }
    return '';
  }

  if (isUrl) {
    if (!/[a-zA-Z]/.test(trimmed)) {
      return `${label} cannot contain only numbers or special characters.`;
    }
    if (!/^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(:\d+)?(\/.*)?$/.test(trimmed)) {
      return `Please enter a valid URL for ${label}.`;
    }
    return '';
  }

  if (!allowNumbersOnly && !/[a-zA-Z]/.test(trimmed)) {
    if (/^\d+$/.test(trimmed)) {
      return `${label} cannot contain only numbers.`;
    }
    if (/^[^a-zA-Z0-9]+$/.test(trimmed)) {
      return `${label} cannot contain only special characters.`;
    }
    return `${label} must include at least one letter (cannot be only numbers or special characters).`;
  }

  return '';
}

/**
 * Validates multiple fields in sequence and returns the first error message, or '' if all valid.
 * @param {Array<{ value: string, options: object }>} checks
 * @returns {string}
 */
export function validateFields(checks) {
  for (const { value, options } of checks) {
    const err = validateMeaningfulText(value, options);
    if (err) return err;
  }
  return '';
}

/**
 * Validates that a newly created or reset password meets complexity requirements:
 * - Minimum 8 characters (max 128)
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character
 */
export function validateStrongPassword(value, label = 'New password') {
  const pwd = String(value ?? '');
  if (!pwd) return `${label} is required.`;
  if (pwd.length < 8) return `${label} must be at least 8 characters long.`;
  if (pwd.length > 128) return `${label} must be 128 characters or fewer.`;
  if (!/[A-Z]/.test(pwd)) return `${label} must include at least one uppercase letter (A-Z).`;
  if (!/[a-z]/.test(pwd)) return `${label} must include at least one lowercase letter (a-z).`;
  if (!/[0-9]/.test(pwd)) return `${label} must include at least one number (0-9).`;
  if (!/[^A-Za-z0-9]/.test(pwd)) return `${label} must include at least one special character (e.g. !@#$%^&*).`;
  return '';
}
