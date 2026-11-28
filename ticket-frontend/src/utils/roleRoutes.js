export const ROLE_PREFIX_MAP = {
  Admin: '/admin',
  'Super Admin': '/admin',
  Manager: '/manager',
  'QA Lead': '/qa-lead',
  'QA Member': '/qa-member',
  'Project Lead': '/project-lead',
  Developer: '/developer',
};

export function getRolePrefix(role) {
  const r = (
    role ||
    (typeof window !== 'undefined' ? window.localStorage.getItem('userRole') : '') ||
    ''
  ).trim();
  return ROLE_PREFIX_MAP[r] || '/admin';
}

export function getRoleHomeRoute(role) {
  const r = (
    role ||
    (typeof window !== 'undefined' ? window.localStorage.getItem('userRole') : '') ||
    ''
  ).trim();
  if (r === 'Admin' || r === 'Super Admin') return '/admin/users';
  return getRolePrefix(r);
}

/**
 * Resolves a shared module path (e.g. '/admin/projects' or '/projects')
 * to the active role's prefix (e.g. '/manager/projects' for Manager).
 */
export function getRolePath(subPath = '', role) {
  const prefix = getRolePrefix(role);
  const clean = String(subPath || '').replace(
    /^\/(admin|manager|qa-lead|qa-member|project-lead|developer)(?=\/|$)/,
    ''
  );
  if (!clean || clean === '/') return prefix;
  return `${prefix}${clean.startsWith('/') ? clean : `/${clean}`}`;
}
