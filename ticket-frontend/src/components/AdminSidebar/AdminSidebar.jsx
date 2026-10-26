import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  X
} from 'lucide-react';
import './AdminSidebar.css';

const mainMenuNav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Users', to: '/admin/users', icon: Users, end: true },
  { label: 'Roles & Permissions', to: '/admin/roles-permissions', icon: ShieldCheck },
  { label: 'Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Approvals & Requests', to: '/admin/approvals', icon: CheckSquare },
  { label: 'Deployment Approval', to: '/admin/deployment-approval', icon: Rocket },
  { label: 'Workspace Settings', to: '/admin/settings', icon: Settings, end: true }
];

export const SmallCubeLogo = () => (
  <svg viewBox="0 0 100 100" className="sidebar-logo" aria-hidden="true">
    <g transform="translate(50, 50)">
      <path d="M 0 -40 L 34 -20 L 0 0 L -34 -20 Z" fill="#ffffff" />
      <path d="M -34 -20 L -10 -6 L -17 -30 Z" fill="#d1f0ff" />
      <path d="M -34 -20 L 0 0 L 0 40 L -34 20 Z" fill="#2563eb" />
      <path d="M 0 0 L 34 -20 L 34 20 L 0 40 Z" fill="#1e293b" />
    </g>
  </svg>
);

function AdminSidebar({
  onLogout,
  defaultCollapsed = false,
  hasConnectionError = false,
  homeRoute = '/admin',
  workspaceRole = 'Admin console',
  navItems = mainMenuNav
}) {
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = window.localStorage.getItem('workspaceSidebarCollapsed');
    return defaultCollapsed || (savedState !== null
      ? savedState === 'true'
      : window.matchMedia('(max-width: 1100px) and (min-width: 761px)').matches);
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('nav-drawer-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('nav-drawer-open');
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-controls="workspace-sidebar"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <aside
        className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' sidebar-open-mobile' : ''}`}
        id="workspace-sidebar"
      >
        <div className="sidebar-brand-row">
          <Link className="sidebar-brand" to={homeRoute} aria-label="QA Software dashboard">
            <SmallCubeLogo />
            <div className="brand-text-col">
              <span className="brand-name"><span>QA</span> Software</span>
              <span className="brand-tagline">Quality Management System</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((current) => {
              const next = !current;
              window.localStorage.setItem('workspaceSidebarCollapsed', String(next));
              return next;
            })}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">MAIN MENU</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              end={end}
              key={label}
              title={collapsed ? label : undefined}
              to={to}
              onClick={() => {
                setMobileOpen(false);
                window.localStorage.setItem('workspaceSidebarCollapsed', 'true');
                setCollapsed(true);
              }}
            >
              <Icon className="nav-icon" /> <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="workspace-card">
            <div className="workspace-card-icon"><Activity size={17} /></div>
            <div>
              <strong>QA Workspace</strong>
              <span>{workspaceRole}</span>
            </div>
            <span className={`connection-dot${hasConnectionError ? ' connection-dot-error' : ''}`} />
          </div>
          <button className="nav-item nav-logout" onClick={onLogout}>
            <LogOut className="nav-icon" /> <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
