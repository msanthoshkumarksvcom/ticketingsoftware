import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import axios from 'axios';
import {
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
  Ticket,
  Users,
  X
} from 'lucide-react';
import NotificationCenter from '../NotificationCenter/NotificationCenter';
import './AdminSidebar.css';

export const MAIN_ADMIN_NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Users', to: '/admin/users', icon: Users, end: true },
  { label: 'Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Approvals & Requests', to: '/admin/approvals', icon: CheckSquare },
  { label: 'Deployment Approval', to: '/admin/deployment-approval', icon: Rocket },
  { label: 'Application Settings', to: '/admin/settings', icon: Settings, end: true }
];

const mainMenuNav = MAIN_ADMIN_NAV;

export const QA_MEMBER_NAV = [
  { label: 'Dashboard', to: '/qa-member', icon: LayoutDashboard, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Users', to: '/admin/users', icon: Users, end: true },
  { label: 'Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Application Settings', to: '/admin/settings', icon: Settings, end: true }
];

export const PROJECT_LEAD_NAV = [
  { label: 'Dashboard', to: '/project-lead', icon: LayoutDashboard, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Bug Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Application Settings', to: '/admin/settings', icon: Settings, end: true }
];

export const DEVELOPER_NAV = [
  { label: 'Dashboard', to: '/developer', icon: LayoutDashboard, end: true },
  { label: 'Assigned Tickets', to: '/admin/tickets', icon: Ticket },
  { label: 'My Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Project Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Application Settings', to: '/admin/settings', icon: Settings, end: true }
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
  homeRoute,
  workspaceRole,
  navItems
}) {
  const currentRole = typeof window !== 'undefined' ? (window.localStorage.getItem('userRole') || '') : '';
  const isQAMember = currentRole === 'QA Member';
  const isProjectLead = currentRole === 'Project Lead';
  const isDeveloper = currentRole === 'Developer';

  let roleHomeRoute = '/admin';
  let roleWorkspaceRole = 'Admin console';
  let roleNavItems = mainMenuNav;

  if (isProjectLead) {
    roleHomeRoute = '/project-lead';
    roleWorkspaceRole = 'Project Lead console';
    roleNavItems = PROJECT_LEAD_NAV;
  } else if (isDeveloper) {
    roleHomeRoute = '/developer';
    roleWorkspaceRole = 'Developer console';
    roleNavItems = DEVELOPER_NAV;
  } else if (isQAMember) {
    roleHomeRoute = '/qa-member';
    roleWorkspaceRole = 'QA Member console';
    roleNavItems = QA_MEMBER_NAV;
  }

  const effectiveHomeRoute = homeRoute || roleHomeRoute;
  const effectiveWorkspaceRole = workspaceRole || roleWorkspaceRole;
  const effectiveNavItems = (navItems && navItems !== mainMenuNav)
    ? navItems
    : roleNavItems;
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = window.localStorage.getItem('workspaceSidebarCollapsed');
    return defaultCollapsed || (savedState !== null
      ? savedState === 'true'
      : window.matchMedia('(max-width: 1100px) and (min-width: 761px)').matches);
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: typeof window !== 'undefined' ? (window.localStorage.getItem('userName') || '') : '',
    email: typeof window !== 'undefined' ? (window.localStorage.getItem('userEmail') || '') : '',
    avatar: typeof window !== 'undefined' ? (window.localStorage.getItem('userAvatar') || '') : ''
  }));
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile.avatar]);

  useEffect(() => {
    const syncFromStorage = () => {
      setProfile({
        name: window.localStorage.getItem('userName') || '',
        email: window.localStorage.getItem('userEmail') || '',
        avatar: window.localStorage.getItem('userAvatar') || ''
      });
    };

    const handleProfileUpdated = (event) => {
      const updated = event?.detail?.user;
      if (updated) {
        setProfile({
          name: updated.full_name || window.localStorage.getItem('userName') || '',
          email: updated.email || window.localStorage.getItem('userEmail') || '',
          avatar: updated.avatar || ''
        });
      } else {
        syncFromStorage();
      }
    };

    window.addEventListener('workspace-profile-updated', handleProfileUpdated);
    window.addEventListener('storage', syncFromStorage);

    let active = true;
    const token = window.localStorage.getItem('token');
    if (token) {
      axios
        .get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(({ data }) => {
          if (!active || !data?.user) return;
          const u = data.user;
          if (u.id) window.localStorage.setItem('userId', String(u.id));
          if (u.full_name) window.localStorage.setItem('userName', u.full_name);
          if (u.email) window.localStorage.setItem('userEmail', u.email);
          if (u.avatar) window.localStorage.setItem('userAvatar', u.avatar);
          else window.localStorage.removeItem('userAvatar');
          setProfile({
            name: u.full_name || '',
            email: u.email || '',
            avatar: u.avatar || ''
          });
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      window.removeEventListener('workspace-profile-updated', handleProfileUpdated);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const profileName =
    profile.name.trim() ||
    (profile.email ? profile.email.split('@')[0] : '') ||
    currentRole ||
    'User';
  const profileEmail = profile.email.trim() || effectiveWorkspaceRole;
  const profileInitial = profileName.charAt(0).toUpperCase();

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
          <Link className="sidebar-brand" to={effectiveHomeRoute} aria-label="QA Software dashboard">
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
          {effectiveNavItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              end={end}
              key={label}
              title={collapsed ? label : undefined}
              to={to}
              onClick={() => {
                setMobileOpen(false);
              }}
            >
              <Icon className="nav-icon" /> <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NotificationCenter collapsed={collapsed} />
          <Link
            className="workspace-card workspace-profile-card"
            to="/admin/settings"
            title={profile.email ? `${profileName} (${profile.email})` : profileName}
            onClick={() => setMobileOpen(false)}
          >
            <div className="workspace-profile-avatar">
              {profile.avatar && !avatarLoadFailed ? (
                <img
                  src={profile.avatar}
                  alt={profileName}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span className="workspace-profile-initial">{profileInitial}</span>
              )}
            </div>
            <div className="workspace-profile-info">
              <strong>{profileName}</strong>
              <span className="workspace-profile-email">{profileEmail}</span>
            </div>
            <span
              className={`connection-dot${hasConnectionError ? ' connection-dot-error' : ''}`}
              aria-hidden="true"
            />
          </Link>
          <button className="nav-item nav-logout" onClick={onLogout}>
            <LogOut className="nav-icon" /> <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
