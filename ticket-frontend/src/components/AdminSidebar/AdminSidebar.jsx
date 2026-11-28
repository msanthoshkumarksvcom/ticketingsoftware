import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';
import { getRoleHomeRoute, getRolePath } from '../../utils/roleRoutes';
import {
  BarChart3,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Rocket,
  Settings,
  Ticket,
  Users,
  X
} from 'lucide-react';
import './AdminSidebar.css';

// 8 Core Navigation Sections
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

export const ADMIN_NAV = [
  { label: 'Employees', to: '/admin/users', icon: Users, end: true }
];

const mainMenuNav = MAIN_ADMIN_NAV;

export const QA_MEMBER_NAV = [
  { label: 'Dashboard', to: '/qa-member', icon: LayoutDashboard, end: true },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
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
      <path d="M 0 -40 L 34 -20 L 0 0 L -34 -20 Z" fill="#2563EB" />
      <path d="M -34 -20 L -10 -6 L -17 -30 Z" fill="#93C5FD" />
      <path d="M -34 -20 L 0 0 L 0 40 L -34 20 Z" fill="#1D4ED8" />
      <path d="M 0 0 L 34 -20 L 34 20 L 0 40 Z" fill="#0F172A" />
    </g>
  </svg>
);

function AdminSidebar({
  defaultCollapsed = false,
  homeRoute,
  workspaceRole,
  navItems
}) {
  const currentRole = typeof window !== 'undefined' ? (window.localStorage.getItem('userRole') || '') : '';
  const isAdmin = currentRole === 'Admin' || currentRole === 'Super Admin';
  const isQAMember = currentRole === 'QA Member';
  const isProjectLead = currentRole === 'Project Lead';
  const isDeveloper = currentRole === 'Developer';

  let roleHomeRoute = getRoleHomeRoute(currentRole);
  let roleWorkspaceRole = `${currentRole || 'Admin'} console`;
  let roleNavItems = mainMenuNav;

  if (isAdmin) {
    roleWorkspaceRole = 'Admin console';
    roleNavItems = ADMIN_NAV;
  } else if (isProjectLead) {
    roleWorkspaceRole = 'Project Lead console';
    roleNavItems = PROJECT_LEAD_NAV;
  } else if (isDeveloper) {
    roleWorkspaceRole = 'Developer console';
    roleNavItems = DEVELOPER_NAV;
  } else if (isQAMember) {
    roleWorkspaceRole = 'QA Member console';
    roleNavItems = QA_MEMBER_NAV;
  }

  const effectiveHomeRoute = homeRoute || roleHomeRoute;
  const rawNavItems = (navItems && navItems !== mainMenuNav)
    ? navItems
    : roleNavItems;
  const effectiveNavItems = rawNavItems.map((item) => ({
    ...item,
    to: getRolePath(item.to, currentRole),
  }));

  const [collapsed, setCollapsed] = useState(() => {
    const savedState = window.localStorage.getItem('workspaceSidebarCollapsed');
    return defaultCollapsed || (savedState !== null
      ? savedState === 'true'
      : window.matchMedia('(max-width: 1100px) and (min-width: 761px)').matches);
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const hasApprovalsNav = effectiveNavItems.some((item) => item.label === 'Approvals & Requests');

  // Dynamic Approvals Badge: fetch real pending count only for roles that see Approvals & Requests
  useEffect(() => {
    if (!hasApprovalsNav) return undefined;
    let isMounted = true;

    const fetchPendingCount = async () => {
      const token = window.localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/api/admin/approvals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted && Array.isArray(res.data)) {
          const count = res.data.filter(
            (item) => (item.status || '').toLowerCase() === 'pending'
          ).length;
          setPendingApprovalsCount(count);
        }
      } catch {
        // Silently handle unauthorized or offline state
      }
    };

    fetchPendingCount();

    const handleApprovalsUpdated = (e) => {
      if (typeof e?.detail?.pendingCount === 'number') {
        setPendingApprovalsCount(e.detail.pendingCount);
      } else {
        fetchPendingCount();
      }
    };

    // Poll periodically every 60 seconds as fallback (Socket.IO triggers immediate updates)
    const intervalId = setInterval(fetchPendingCount, 60000);

    window.addEventListener('workspace-approvals-updated', handleApprovalsUpdated);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('workspace-approvals-updated', handleApprovalsUpdated);
    };
  }, [hasApprovalsNav]);

  // Listen for toggle events from the floating TopNavbar hamburger button
  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth <= 768) {
        setMobileOpen((prev) => !prev);
      } else {
        setCollapsed((prev) => {
          const next = !prev;
          window.localStorage.setItem('workspaceSidebarCollapsed', String(next));
          window.dispatchEvent(new CustomEvent('workspace-sidebar-toggled', { detail: { collapsed: next } }));
          return next;
        });
      }
    };

    window.addEventListener('workspace-toggle-sidebar', handleToggle);
    return () => window.removeEventListener('workspace-toggle-sidebar', handleToggle);
  }, []);

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

  const handleToggleCollapse = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('workspaceSidebarCollapsed', String(next));
      window.dispatchEvent(new CustomEvent('workspace-sidebar-toggled', { detail: { collapsed: next } }));
      return next;
    });
  };

  return (
    <>
      <button
        id="sidebar-mobile-open-btn"
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
          id="sidebar-mobile-backdrop-btn"
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
        {/* 1. QA Software Clean Header Row */}
        <div className="sidebar-brand-row">
          <Link
            id="sidebar-brand-link"
            className="sidebar-brand"
            to={effectiveHomeRoute}
            aria-label="QA Software dashboard"
          >
            <div className="sidebar-logo-container">
              <SmallCubeLogo />
            </div>
            {!collapsed && (
              <div className="brand-text-col">
                <span className="brand-name">
                  <span className="brand-qa">QA</span> Software
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            id="sidebar-mobile-close-btn"
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Organized 8 Nav Sections - Clean, Evenly Spaced */}
        <nav id="sidebar-nav-menu" className="sidebar-nav" aria-label="Main navigation">
          {effectiveNavItems.map(({ label, to, icon: Icon, end, badge }) => {
            const isApprovals = label === 'Approvals & Requests';
            const effectiveBadge = isApprovals
              ? (pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : null)
              : (badge || null);

            return (
              <NavLink
                id={`sidebar-nav-${to.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                end={end}
                key={label}
                title={collapsed ? (effectiveBadge ? `${label} (${effectiveBadge} pending)` : label) : undefined}
                to={to}
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{label}</span>
                {!collapsed && effectiveBadge && (
                  <span className="sidebar-nav-badge">
                    {effectiveBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 3. Attractive Dedicated Collapse Button in Footer */}
        <div className="sidebar-footer">
          <button
            id="sidebar-collapse-card-btn"
            type="button"
            className={`sidebar-collapse-card-btn${collapsed ? ' collapsed' : ''}`}
            onClick={handleToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="collapse-icon-box">
              {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
            </div>
            {!collapsed && <span className="collapse-text">Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
