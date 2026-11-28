import React from 'react';
import AdminSidebar, {
  MAIN_ADMIN_NAV,
  ADMIN_NAV,
  QA_MEMBER_NAV,
  PROJECT_LEAD_NAV,
  DEVELOPER_NAV
} from '../AdminSidebar/AdminSidebar';
import { getRoleHomeRoute, getRolePath } from '../../utils/roleRoutes';

export default function RoleSidebar({ roleName, homeRoute, onLogout, navItems }) {
  const currentRole = roleName || (typeof window !== 'undefined' ? window.localStorage.getItem('userRole') : '');
  const roleLower = (currentRole || '').trim().toLowerCase();
  const isAdmin = roleLower === 'admin' || roleLower === 'super admin' || roleLower === 'system admin' || roleLower === 'administrator';
  const isQAMember = roleLower === 'qa member';
  const isProjectLead = roleLower === 'project lead';
  const isDeveloper = roleLower === 'developer';
  const isQALead = roleLower === 'qa lead';
  const isManager = roleLower === 'manager';

  const effectiveHome = homeRoute || getRoleHomeRoute(currentRole);

  // Admin / Super Admin only see Employee/User Management (ADMIN_NAV).
  // QA Lead and Manager receive MAIN_ADMIN_NAV (including Approvals & Deployment).
  // QA Member, Developer, and Project Lead receive their respective scoped menus.
  let defaultNav = MAIN_ADMIN_NAV;
  if (isAdmin) defaultNav = ADMIN_NAV;
  else if (isProjectLead) defaultNav = PROJECT_LEAD_NAV;
  else if (isDeveloper) defaultNav = DEVELOPER_NAV;
  else if (isQAMember) defaultNav = QA_MEMBER_NAV;
  else if (isQALead || isManager) defaultNav = MAIN_ADMIN_NAV;

  const effectiveNav = (navItems || defaultNav).map((item) => ({
    ...item,
    to: getRolePath(item.to, currentRole),
  }));

  return (
    <AdminSidebar
      homeRoute={effectiveHome}
      navItems={effectiveNav}
      onLogout={onLogout}
      workspaceRole={`${currentRole || 'Member'} console`}
    />
  );
}
