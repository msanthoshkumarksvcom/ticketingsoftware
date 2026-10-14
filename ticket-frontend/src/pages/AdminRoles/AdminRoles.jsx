import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Check,
  ChevronDown,
  Key,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import './AdminRoles.css';

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage Users', desc: 'Create, edit, or disable team members' },
  { id: 'manage_projects', label: 'Manage Projects', desc: 'Create and update workspace projects' },
  { id: 'manage_roles', label: 'Manage Roles', desc: 'Configure permissions and custom roles' },
  { id: 'manage_tickets', label: 'Manage Tickets', desc: 'Create, update, assign, and close tickets' },
  { id: 'view_tickets', label: 'View Tickets', desc: 'Read-only ticket catalog visibility' },
  { id: 'view_reports', label: 'View Reports', desc: 'Access analytics and quality summaries' },
  { id: 'approve_deployments', label: 'Approve Releases', desc: 'Approve deployment check gates' }
];

const initialRoleForm = {
  role_name: '',
  description: '',
  permissions: ['manage_tickets']
};

function AdminRoles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialRoleForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchRoles = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to load roles:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleTogglePermission = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      const nextPerms = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.role_name.trim()) {
      setFormError('Please enter a role name.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/roles',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRoles((prev) => [...prev, response.data.role]);
      setIsModalOpen(false);
      setFormData(initialRoleForm);
    } catch (error) {
      console.error('Error creating role:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create role. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  const filteredRoles = roles.filter((r) => {
    const query = searchQuery.trim().toLowerCase();
    return (
      !query ||
      r.role_name?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    );
  });

  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Admin Sidebar Navigation */}
      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Roles & Permissions</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchRoles}
              title="Refresh roles"
              aria-label="Refresh roles list"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar">{avatarLabel}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Administrator</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </header>

        <div className="dashboard-container">
          <div className="users-layout">
            {/* Header Card */}
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2>Roles & Permissions Directory</h2>
                <p>Define custom roles and allocate access capabilities across your workspace.</p>
              </div>
              <div className="users-header-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => setIsModalOpen(true)}
                >
                  <ShieldCheck size={18} />
                  <span>Create Role</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search role name or capability..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Roles Grid Cards */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                Loading roles & permissions...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="users-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <ShieldAlert size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                <p style={{ color: '#64748b' }}>No roles found matching your search.</p>
              </div>
            ) : (
              <div className="roles-grid">
                {filteredRoles.map((role) => (
                  <div className="role-card" key={role.id}>
                    <div className="role-card-header">
                      <div className="role-title-row">
                        <div className="role-icon-box">
                          <Shield size={20} />
                        </div>
                        <div>
                          <h3 className="role-name-text">{role.role_name}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            ID: #{role.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="role-description-text">
                      {role.description || 'No description provided for this role.'}
                    </p>

                    <div className="permissions-container">
                      <span className="permissions-title">
                        Granted Capabilities ({role.permissions?.length || 0})
                      </span>
                      <div className="permission-tags-list">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.map((perm) => (
                            <span className="permission-chip" key={perm}>
                              {perm.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            No active permissions assigned.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Role Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3>Create New Role</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="form-group-user">
                  <label>Role Name *</label>
                  <input
                    type="text"
                    name="role_name"
                    placeholder="e.g. Release Manager or Security Auditor"
                    required
                    value={formData.role_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Description</label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Brief description of this role's purpose..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Assign Permissions</label>
                  <div className="permission-checkbox-grid">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="permission-checkbox-item">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                        />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.84rem' }}>
                            {perm.label}
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {perm.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-user">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRoles;
