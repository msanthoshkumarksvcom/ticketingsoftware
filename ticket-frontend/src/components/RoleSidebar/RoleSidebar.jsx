import React from 'react';
import AdminSidebar, { QA_MEMBER_NAV, PROJECT_LEAD_NAV, DEVELOPER_NAV } from '../AdminSidebar/AdminSidebar';

export default function RoleSidebar({ roleName, homeRoute, onLogout, navItems }) {
  const currentRole = roleName || (typeof window !== 'undefined' ? window.localStorage.getItem('userRole') : '');
  const isQAMember = currentRole === 'QA Member';
  const isProjectLead = currentRole === 'Project Lead';
  const isDeveloper = currentRole === 'Developer';

  let defaultHome = '/admin';
  if (isQAMember) defaultHome = '/qa-member';
  else if (isProjectLead) defaultHome = '/project-lead';
  else if (isDeveloper) defaultHome = '/developer';

  const effectiveHome = homeRoute || defaultHome;

  let defaultNav = QA_MEMBER_NAV;
  if (isProjectLead) defaultNav = PROJECT_LEAD_NAV;
  else if (isDeveloper) defaultNav = DEVELOPER_NAV;
  else if (isQAMember) defaultNav = QA_MEMBER_NAV;

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
