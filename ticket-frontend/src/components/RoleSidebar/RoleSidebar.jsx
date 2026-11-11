import React from 'react';
import AdminSidebar, {
  MAIN_ADMIN_NAV,
  QA_MEMBER_NAV,
  PROJECT_LEAD_NAV,
  DEVELOPER_NAV
} from '../AdminSidebar/AdminSidebar';

export default function RoleSidebar({ roleName, homeRoute, onLogout, navItems }) {
  const currentRole = roleName || (typeof window !== 'undefined' ? window.localStorage.getItem('userRole') : '');
  const roleLower = (currentRole || '').toLowerCase();
  const isQAMember = roleLower === 'qa member';
  const isProjectLead = roleLower === 'project lead';
  const isDeveloper = roleLower === 'developer';
  const isQALead = roleLower === 'qa lead';
  const isManager = roleLower === 'manager';

  let defaultHome = '/admin';
  if (isQAMember) defaultHome = '/qa-member';
  else if (isProjectLead) defaultHome = '/project-lead';
  else if (isDeveloper) defaultHome = '/developer';
  else if (isQALead || isManager) defaultHome = '/admin';

  const effectiveHome = homeRoute || defaultHome;

  // IMPORTANT FIX: QA Lead, Manager, Admin, and Super Admin MUST receive MAIN_ADMIN_NAV
  // containing "Approvals & Requests" (/admin/approvals) and "Deployment Approval" (/admin/deployment-approval).
  // Only QA Member, Developer, and Project Lead receive their respective scoped navigation menus.
  let defaultNav = MAIN_ADMIN_NAV;
  if (isProjectLead) defaultNav = PROJECT_LEAD_NAV;
  else if (isDeveloper) defaultNav = DEVELOPER_NAV;
  else if (isQAMember) defaultNav = QA_MEMBER_NAV;
  else if (isQALead || isManager) defaultNav = MAIN_ADMIN_NAV;

  const effectiveNav = navItems || defaultNav;

  return (
    <AdminSidebar
      homeRoute={effectiveHome}
      navItems={effectiveNav}
      onLogout={onLogout}
      workspaceRole={`${currentRole || 'Member'} console`}
    />
  );
}
