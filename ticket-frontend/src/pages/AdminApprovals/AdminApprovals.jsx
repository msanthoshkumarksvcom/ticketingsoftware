import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckSquare,
  ChevronDown,
  Clock,
  FileCheck2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';

const initialApprovalForm = {
  req_code: '',
  title: '',
  category: 'Access Request',
  requested_by: 'Admin User',
  priority: 'Medium',
  status: 'Pending',
  details: ''
};

function AdminApprovals() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialApprovalForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchApprovals = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovals(response.data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateApproval = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.req_code.trim()) {
      setFormError('Please enter a Request Code (e.g. REQ-501).');
      return;
    }

    if (!formData.title.trim()) {
      setFormError('Please enter a Title for the request.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/approvals',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setApprovals((prev) => [response.data.approval, ...prev]);
      setIsModalOpen(false);
      setFormData(initialApprovalForm);
    } catch (error) {
      console.error('Error creating approval:', error);
      setFormError(
        error.response?.data?.error || 'Failed to submit approval request.'
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

  const filteredApprovals = approvals.filter((a) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      a.req_code?.toLowerCase().includes(query) ||
      a.title?.toLowerCase().includes(query) ||
      a.requested_by?.toLowerCase().includes(query) ||
      a.category?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || a.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
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

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Approvals & Requests</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchApprovals}
              title="Refresh approvals"
              aria-label="Refresh approvals list"
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
          <div className="projects-layout">
            {/* Header Card */}
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2>Approvals & Requests</h2>
                <p>Manage access escalations, infrastructure allocations, and permission changes.</p>
              </div>
              <div className="users-header-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  <span>Create Request</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search request code, title, requested by..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="users-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  className="users-filter-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Approvals Table */}
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Request Code</th>
                    <th>Request Summary</th>
                    <th>Category</th>
                    <th>Requested By</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading requests...
                      </td>
                    </tr>
                  ) : filteredApprovals.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="user-empty-state">
                          <CheckSquare size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                          <p>No approval requests found matching your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredApprovals.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="project-code-badge">{a.req_code}</span>
                        </td>
                        <td>
                          <div className="project-name-cell">
                            <span>{a.title}</span>
                            {a.details && (
                              <span className="project-desc-small" title={a.details}>
                                {a.details}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="user-dept-badge">{a.category}</span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{a.requested_by}</td>
                        <td>
                          <span
                            className={`priority-badge ${
                              a.priority === 'Critical'
                                ? 'priority-critical'
                                : a.priority === 'High'
                                ? 'priority-high'
                                : a.priority === 'Low'
                                ? 'priority-low'
                                : 'priority-medium'
                            }`}
                          >
                            {a.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-tag ${
                              a.status === 'Approved'
                                ? 'status-active'
                                : a.status === 'Rejected'
                                ? 'priority-critical'
                                : 'status-in-progress'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent'}
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

      {/* Create Request Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3>Create Approval Request</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateApproval}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Request Code *</label>
                    <input
                      type="text"
                      name="req_code"
                      placeholder="e.g. REQ-504"
                      required
                      value={formData.req_code}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="Access Request">Access Request</option>
                      <option value="Permission Change">Permission Change</option>
                      <option value="Resource Allocation">Resource Allocation</option>
                      <option value="Data Access">Data Access</option>
                      <option value="Budget Approval">Budget Approval</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-user">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Short description of the item needing approval"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Justification & Details</label>
                  <input
                    type="text"
                    name="details"
                    placeholder="Provide context or links for the approver..."
                    value={formData.details}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Requested By</label>
                    <input
                      type="text"
                      name="requested_by"
                      value={formData.requested_by}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
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
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminApprovals;
