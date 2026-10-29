import { LayoutDashboard } from 'lucide-react';
import AdminSidebar, { QA_MEMBER_NAV } from '../AdminSidebar/AdminSidebar';

export default function RoleSidebar({ roleName = 'Member', homeRoute, onLogout, navItems }) {
  const isQAMember = roleName === 'QA Member' || (typeof window !== 'undefined' && window.localStorage.getItem('userRole') === 'QA Member');
  const effectiveHome = homeRoute || (isQAMember ? '/qa-member' : '/admin');
  const effectiveNav = navItems || (isQAMember ? QA_MEMBER_NAV : [{ label: 'Dashboard', to: effectiveHome, icon: LayoutDashboard, end: true }]);

  return (
    <AdminSidebar
      homeRoute={effectiveHome}
      navItems={effectiveNav}
      onLogout={onLogout}
      workspaceRole={`${roleName} console`}
    />
  );
}
