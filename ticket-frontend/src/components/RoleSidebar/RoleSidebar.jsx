import { LayoutDashboard } from 'lucide-react';
import AdminSidebar from '../AdminSidebar/AdminSidebar';

export default function RoleSidebar({ roleName = 'Member', homeRoute = '/admin', onLogout }) {
  return (
    <AdminSidebar
      homeRoute={homeRoute}
      navItems={[{ label: 'Dashboard', to: homeRoute, icon: LayoutDashboard, end: true }]}
      onLogout={onLogout}
      workspaceRole={`${roleName} console`}
    />
  );
}
