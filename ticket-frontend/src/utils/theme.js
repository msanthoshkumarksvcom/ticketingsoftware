export const THEME_STORAGE_KEY = 'workspaceTheme';

export const normalizeTheme = (value) => (value === 'dark' ? 'dark' : 'light');

export const getSavedTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
};

export const applyTheme = (nextTheme) => {
  const normalized = normalizeTheme(nextTheme);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.style.colorScheme = normalized;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    window.dispatchEvent(
      new CustomEvent('workspace-theme-changed', { detail: { theme: normalized } })
    );
  }
  return normalized;
};
