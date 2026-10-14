import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell,
  ChevronDown,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import './AdminUsers.css';

const initialFormData = {
  emp_id: '',
  full_name: '',
  email: '',
  password: '',
  department: 'Quality Assurance',
  role: 'Member',
  phone: '',
  status: 'Active'
};

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('Please enter the user full name.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/users',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Prepend newly created user to local list
      setUsers((prev) => [response.data.user, ...prev]);
      setIsModalOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error creating user:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create user. Please try again.'
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

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.emp_id?.toLowerCase().includes(query) ||
      u.department?.toLowerCase().includes(query);

    const matchesDept =
      departmentFilter === 'All' || u.department === departmentFilter;
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {/* Logout Confirmation Modal */}
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

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Users Directory</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchUsers}
              title="Refresh users"
              aria-label="Refresh users list"
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
            {/* Top Header Card */}
            <div className="users-header-row">
              <div className="users-header-info">
                <h2>User Management</h2>
                <p>Add and manage team members, departments, roles, and employee IDs.</p>
              </div>
              <div className="users-header-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => setIsModalOpen(true)}
                >
                  <UserPlus size={18} />
                  <span>Create User</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search by name, email, employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="users-filter-select"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Operations">Operations</option>
                  <option value="Support">Support</option>
                </select>

                <select
                  className="users-filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="QA Lead">QA Lead</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="Developer">Developer</option>
                  <option value="Member">Member</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Emp ID / User ID</th>
                    <th>Name & Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading users directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="user-empty-state">
                          <Users size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                          <p>No users found matching your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className="user-badge-emp">
                            {user.emp_id || `USR-${String(user.id).padStart(3, '0')}`}
                          </span>
                        </td>
                        <td>
                          <div className="user-cell-profile">
                            <div className="user-avatar-circle">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="user-cell-name">
                                {user.full_name || 'Team Member'}
                              </div>
                              <div className="user-cell-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="user-dept-badge">
                            {user.department || 'Quality Assurance'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`user-role-badge ${
                              user.role === 'Admin'
                                ? 'role-admin'
                                : user.role?.includes('QA')
                                ? 'role-qa'
                                : user.role === 'Developer'
                                ? 'role-developer'
                                : 'role-member'
                            }`}
                          >
                            {user.role || 'Member'}
                          </span>
                        </td>
                        <td>
                          <span className="status-indicator">
                            <span
                              className={
                                user.status === 'Inactive'
                                  ? 'status-dot-inactive'
                                  : 'status-dot-active'
                              }
                            />
                            {user.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : 'Recent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Create User Modal Dialog */}
      {isModalOpen && (
        <div
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3>Create New User</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body-user">
                {formError && (
                  <div className="user-error-banner">{formError}</div>
                )}

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Employee ID / User ID</label>
                    <input
                      type="text"
                      name="emp_id"
                      placeholder="e.g. EMP-104 or QA-007"
                      value={formData.emp_id}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      placeholder="e.g. John Doe"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. jdoe@example.com"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Initial Password</label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Default: Welcome@123"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Operations">Operations</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>

                  <div className="form-group-user">
                    <label>Role</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="Member">Member</option>
                      <option value="QA Engineer">QA Engineer</option>
                      <option value="QA Lead">QA Lead</option>
                      <option value="Developer">Developer</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Phone Number (Optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                  {submitting ? 'Saving...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
