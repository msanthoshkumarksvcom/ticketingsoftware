import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Rocket,
  Settings,
  ShieldCheck,
  Ticket,
  Users
} from 'lucide-react';
import './AdminSidebar.css';

const navigationItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Users', to: '/admin/users', icon: Users, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Roles & permissions', to: '/admin/roles-permissions', icon: ShieldCheck },
  { label: 'Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Approvals & requests', to: '/admin/approvals', icon: CheckSquare },
  { label: 'Deployment approval', to: '/admin/deployment-approval', icon: Rocket },
  { label: 'Workspace settings', to: '/admin/settings', icon: Settings, end: true }
];

export const SmallCubeLogo = () => (
  <svg viewBox="0 0 100 100" className="sidebar-logo" aria-hidden="true">
    <g transform="translate(50, 50)">
      <path d="M 0 -40 L 34 -20 L 0 0 L -34 -20 Z" fill="#ffffff" />
      <path d="M -34 -20 L -10 -6 L -17 -30 Z" fill="#d1f0ff" />
      <path d="M -34 -20 L 0 0 L 0 40 L -34 20 Z" fill="#296df2" />
      <path d="M 0 0 L 34 -20 L 34 20 L 0 40 Z" fill="#1b2a59" />
    </g>
  </svg>
);

function AdminSidebar({ onLogout, hasConnectionError = false }) {
  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" to="/admin" aria-label="QA Software dashboard">
        <SmallCubeLogo />
        <span className="brand-name"><span>QA</span> Software</span>
      </Link>

      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationItems.map(({ label, to, icon: Icon, end }) => (
          to ? (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              end={end}
              key={to}
              to={to}
            >
              <Icon className="nav-icon" /> {label}
            </NavLink>
          ) : (
            <div className="nav-item nav-item-static" key={label}>
              <Icon className="nav-icon" /> {label}
            </div>
          )
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="workspace-card">
          <div className="workspace-card-icon"><Activity size={17} /></div>
          <div>
            <strong>QA workspace</strong>
            <span>Admin console</span>
          </div>
          <span className={`connection-dot${hasConnectionError ? ' connection-dot-error' : ''}`} />
        </div>
        <button className="nav-item nav-logout" onClick={onLogout}>
          <LogOut className="nav-icon" /> Sign out
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
