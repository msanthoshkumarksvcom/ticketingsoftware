import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  FileCheck2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';

const initialApprovalForm = {
  req_code: '',
  title: '',
  requested_by: '',
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
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const currentUserName = (localStorage.getItem('userName') || (userEmail ? userEmail.split('@')[0] : '') || 'Administrator').trim();
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';
  const creatorLabel = `${currentUserName} (${currentUserRole})`;
  const canReviewRequests = ['QA Lead', 'Manager', 'Super Admin', 'Admin'].includes(currentUserRole);
  const canCreateRequest = currentUserRole !== 'QA Lead';

  const openCreateRequestModal = async () => {
    if (!canCreateRequest) return;
    const maxId = approvals.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    const fallbackCode = `REQ-TST-${String(maxId + 1).padStart(3, '0')}`;
    setFormError('');
    setFormData({
      ...initialApprovalForm,
      req_code: fallbackCode,
      requested_by: creatorLabel
    });
    setIsModalOpen(true);

    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/approvals/next-code', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data?.req_code) {
        setFormData((prev) => ({ ...prev, req_code: data.req_code }));
      }
    } catch {
      // Keep optimistic sequential code fallback if preview endpoint is unreachable
    }
  };

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
    if (!canCreateRequest) return;
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Please enter a Project Name.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/approvals',
        {
          title: formData.title.trim(),
          project_name: formData.title.trim(),
          priority: formData.priority,
          details: formData.details
        },
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

  const handleUpdateApprovalStatus = async (approvalId, nextStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdatingId(approvalId);
    setActionError('');
    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/approvals/${approvalId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.approval) {
        setApprovals((prev) =>
          prev.map((item) => (item.id === approvalId ? response.data.approval : item))
        );
      }
    } catch (error) {
      setActionError(error.response?.data?.error || `Failed to mark request as ${nextStatus}.`);
    } finally {
      setUpdatingId(null);
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
      a.details?.toLowerCase().includes(query) ||
      a.title?.toLowerCase().includes(query) ||
      a.requested_by?.toLowerCase().includes(query) ||
      a.category?.toLowerCase().includes(query) ||
      a.project_name?.toLowerCase().includes(query) ||
      a.project_code?.toLowerCase().includes(query);

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
        <div
          className="pj-top-utility-bar"
          style={{ maxWidth: '1440px', padding: '18px clamp(18px, 3vw, 40px) 0' }}
        >
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
                <span className="user-role">{currentUserRole}</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </div>

        <div className="dashboard-container">
          <div className="projects-layout">
            {/* Header Card */}
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.2, margin: 0 }}>
                  Approvals & Requests
                </h2>
              </div>
              {canCreateRequest && (
                <div className="users-header-actions">
                  <button
                    className="btn-primary-action"
                    onClick={openCreateRequestModal}
                  >
                    <Plus size={18} />
                    <span>Create Request</span>
                  </button>
                </div>
              )}
            </div>

            {actionError && (
              <div className="user-error-banner" style={{ marginBottom: '12px' }}>
                {actionError}
              </div>
            )}

            {/* Filter Bar */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search request code, project, request note, requested by..."
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
            <div className="users-table-card approvals-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Request Code</th>
                    <th>Request Note</th>
                    <th>Category</th>
                    <th>Requested By</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading requests...
                      </td>
                    </tr>
                  ) : filteredApprovals.length === 0 ? (
                    <tr>
                      <td colSpan="8">
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
                        <td className="ap-request-note-cell">
                          <span
                            className="ap-request-note-text"
                            title={a.details || a.title || ''}
                          >
                            {a.details?.trim() || a.title || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="user-dept-badge">{a.category}</span>
                        </td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{a.requested_by}</td>
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
                        <td style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                        <td>
                          {a.status === 'Pending' && canReviewRequests ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateApprovalStatus(a.id, 'Approved')}
                                disabled={updatingId === a.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #86EFAC',
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  fontSize: '11.5px',
                                  lineHeight: 1.25,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  cursor: updatingId === a.id ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <CheckCircle2 size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateApprovalStatus(a.id, 'Rejected')}
                                disabled={updatingId === a.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #FCA5A5',
                                  background: '#FEE2E2',
                                  color: '#B91C1C',
                                  fontSize: '11.5px',
                                  lineHeight: 1.25,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  cursor: updatingId === a.id ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <XCircle size={12} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {a.reviewed_by ? `By ${a.reviewed_by}` : '—'}
                            </span>
                          )}
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
      {canCreateRequest && isModalOpen && (
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
                    <label>Request Code</label>
                    <input
                      type="text"
                      name="req_code"
                      value={formData.req_code}
                      readOnly
                      style={{ background: '#F8FAFC', color: '#475569', cursor: 'not-allowed' }}
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

                <div className="form-group-user">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Enter project name"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Notes</label>
                  <input
                    type="text"
                    name="details"
                    placeholder="Enter testing notes or request details..."
                    value={formData.details}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Requested By</label>
                  <input
                    type="text"
                    name="requested_by"
                    value={formData.requested_by || creatorLabel}
                    readOnly
                    style={{ background: '#F8FAFC', color: '#475569', cursor: 'not-allowed' }}
                  />
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
