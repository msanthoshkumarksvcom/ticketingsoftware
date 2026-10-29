import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  FolderKanban,
  LogOut,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  UsersRound
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';

const sections = {
  users: {
    title: 'Users',
    category: 'WORKSPACE DIRECTORY',
    description: 'Manage the people who have access to your QA workspace.',
    badge: 'User management',
    placeholderHeading: 'Your user page is ready',
    placeholderDescription: 'Add user records, roles, invitations, and management actions here when you are ready.',
    emptyMessage: 'No user list or user-management actions are connected yet.',
    Icon: UsersRound
  },
  projects: {
    title: 'Projects',
    category: 'PROJECT WORKSPACE',
    description: 'Organize and track the projects managed by your QA team.',
    badge: 'Project management',
    placeholderHeading: 'Your projects page is ready',
    placeholderDescription: 'Add your project list, ownership, status, and project management actions here when you are ready.',
    emptyMessage: 'No project list or project-management actions are connected yet.',
    Icon: FolderKanban
  },
  'roles-permissions': {
    title: 'Roles & permissions',
    category: 'ACCESS CONTROL',
    description: 'Manage workspace roles and the permissions assigned to each role.',
    badge: 'Access management',
    placeholderHeading: 'Your roles page is ready',
    placeholderDescription: 'Add role definitions, permission settings, and access management actions here when you are ready.',
    emptyMessage: 'No roles or permission settings are connected yet.',
    Icon: ShieldCheck
  },
  tickets: {
    title: 'Tickets',
    category: 'ISSUE TRACKING',
    description: 'Track QA issues, requests, and work that needs attention.',
    badge: 'Ticket management',
    placeholderHeading: 'Your tickets page is ready',
    placeholderDescription: 'Add your ticket list, statuses, assignments, and ticket management actions here when you are ready.',
    emptyMessage: 'No ticket list or ticket-management actions are connected yet.',
    Icon: Ticket
  },
  reports: {
    title: 'Reports',
    category: 'WORKSPACE INSIGHTS',
    description: 'Review quality activity and workspace reporting.',
    badge: 'Reporting',
    placeholderHeading: 'Your reports page is ready',
    placeholderDescription: 'Add report summaries, filters, visualizations, and export actions here when you are ready.',
    emptyMessage: 'No reports or reporting data are connected yet.',
    Icon: BarChart3
  },
  approvals: {
    title: 'Approvals & requests',
    category: 'REVIEW WORKFLOW',
    description: 'Review requests and manage items waiting for approval.',
    badge: 'Approval queue',
    placeholderHeading: 'Your approvals page is ready',
    placeholderDescription: 'Add pending requests, review details, and approve or decline actions here when you are ready.',
    emptyMessage: 'No approval queue or request-management actions are connected yet.',
    Icon: CheckSquare
  },
  'deployment-approval': {
    title: 'Deployment approval',
    category: 'RELEASE WORKFLOW',
    description: 'Review deployments and prepare the release approval workflow.',
    badge: 'Deployment workflow',
    placeholderHeading: 'Your deployment page is ready',
    placeholderDescription: 'Add deployment details, release checks, and approval actions here when you are ready.',
    emptyMessage: 'No deployment list or deployment-approval actions are connected yet.',
    Icon: Rocket
  },
  settings: {
    title: 'Workspace settings',
    category: 'WORKSPACE CONFIGURATION',
    description: 'Configure preferences and details for your QA workspace.',
    badge: 'Workspace settings',
    placeholderHeading: 'Your settings page is ready',
    placeholderDescription: 'Add workspace preferences, configuration options, and administrative controls here when you are ready.',
    emptyMessage: 'No workspace settings or configuration options are connected yet.',
    Icon: Settings
  }
};

function AdminWorkspacePage({ section }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const userEmail = localStorage.getItem('userEmail') || 'Administrator';
  const displayName = userEmail.split('@')[0];
  const page = sections[section];

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  if (!page) {
    return null;
  }

  return (
    <div className="admin-layout">
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="workspace-logout-title">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title" id="workspace-logout-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      <main className="main-content">
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{page.title}</strong>
          </div>
          <div className="header-right">
            <label className="header-search">
              <Search className="search-icon" size={17} />
              <input type="search" aria-label={`Search ${page.title.toLowerCase()}`} placeholder={`Search ${page.title.toLowerCase()}...`} disabled />
            </label>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{localStorage.getItem('userRole') || 'Administrator'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-container users-page">
          <section className="users-page-heading">
            <div>
              <span className="section-kicker">{page.category}</span>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
            <span className="users-count">{page.badge}</span>
          </section>

          <section className="users-placeholder">
            <div className="users-placeholder-icon"><page.Icon size={25} /></div>
            <span className="section-kicker">{page.category}</span>
            <h2>{page.placeholderHeading}</h2>
            <p>{page.placeholderDescription}</p>
            <div className="users-placeholder-note">
              <span className="snapshot-dot" />
              {page.emptyMessage}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminWorkspacePage;
