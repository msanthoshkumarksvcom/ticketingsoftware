import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  FileCheck2,
  LayoutGrid,
  List,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
  AlertCircle
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import { formatIndianDate } from '../../utils/dateFormat';
import { INPUT_LIMITS, validateFields } from '../../utils/inputValidation';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import './AdminApprovals.css';

const APPROVAL_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' }
];

const APPROVAL_PRIORITY_OPTIONS = [
  { value: 'All', label: 'All Priorities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const MODAL_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const initialApprovalForm = {
  req_code: '',
  title: '',
  requested_by: '',
  priority: 'Medium',
  status: 'Pending',
  details: ''
};

export default function AdminApprovals() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
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

  // KPI Calculations
  const stats = useMemo(() => {
    const total = approvals.length;
    const pending = approvals.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const approved = approvals.filter((a) => (a.status || '').toLowerCase() === 'approved').length;
    const rejected = approvals.filter((a) => (a.status || '').toLowerCase() === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [approvals]);

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

  const fetchApprovals = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovals(response.data);
      if (Array.isArray(response.data)) {
        const pending = response.data.filter(
          (item) => (item.status || '').toLowerCase() === 'pending'
        ).length;
        window.dispatchEvent(
          new CustomEvent('workspace-approvals-updated', { detail: { pendingCount: pending } })
        );
      }
    } catch (error) {
      console.error('Failed to load approvals:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  const silentRefreshApprovals = useCallback(() => {
    fetchApprovals({ silent: true });
  }, [fetchApprovals]);

  useRealtimeSync(['approvals', 'projects'], silentRefreshApprovals);

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

    const validationErr = validateFields([
      { value: formData.title, options: { label: 'Project Name', required: true, maxLength: INPUT_LIMITS.NAME } },
      { value: formData.details, options: { label: 'Notes', required: false, maxLength: INPUT_LIMITS.DESCRIPTION } }
    ]);
    if (validationErr) {
      setFormError(validationErr);
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

      setApprovals((prev) => {
        const next = [response.data.approval, ...prev];
        const pending = next.filter((item) => (item.status || '').toLowerCase() === 'pending').length;
        window.dispatchEvent(
          new CustomEvent('workspace-approvals-updated', { detail: { pendingCount: pending } })
        );
        return next;
      });
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
        setApprovals((prev) => {
          const next = prev.map((item) => (item.id === approvalId ? response.data.approval : item));
          const pending = next.filter((item) => (item.status || '').toLowerCase() === 'pending').length;
          window.dispatchEvent(
            new CustomEvent('workspace-approvals-updated', { detail: { pendingCount: pending } })
          );
          return next;
        });
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

  const filteredApprovals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return approvals.filter((a) => {
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
  }, [approvals, searchQuery, statusFilter, priorityFilter]);

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || priorityFilter !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
  };

  return (
    <div className="admin-layout approvals-page">
      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div
          id="approvals-logout-overlay"
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section id="approvals-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 id="approvals-logout-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account credentials.</p>
            <div className="modal-actions">
              <button
                id="approvals-logout-cancel-btn"
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button id="approvals-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Role Sidebar Navigation */}
      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Area */}
      <main id="approvals-main-content" className="main-content">
        <TopNavbar pageTitle="Approvals & Requests" />
        <div className="dashboard-container">
          <div className="users-page-layout approvals-page-layout">
            {/* Executive Header Container matching Users, Tickets, Reports */}
            <header id="approvals-header-section" className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <FileCheck2 size={24} color="#2563EB" />
                </div>
                <div className="um-header-titles">
                  <h1 id="approvals-page-heading">Approvals &amp; Requests</h1>
                  <p>
                    Review, verify, and approve workspace deployment and project testing requests.
                  </p>
                </div>
              </div>

              <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Segmented View Switcher matching Tickets & Users */}
                <div id="approvals-view-switcher" className="ticket-view-toggle" role="group" aria-label="Approval view mode">
                  <button
                    id="approvals-view-table-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    <List size={15} />
                    <span>Table View</span>
                  </button>
                  <button
                    id="approvals-view-grid-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={15} />
                    <span>Cards Grid</span>
                  </button>
                </div>

                <span className="reports-live-badge">
                  <span className="reports-pulse-dot" /> Live Data Synced
                </span>
                <button
                  id="approvals-refresh-btn"
                  type="button"
                  className="um-btn-create"
                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                  onClick={fetchApprovals}
                  title="Refresh approvals"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
                {canCreateRequest && (
                  <button
                    id="approvals-create-request-btn"
                    type="button"
                    className="um-btn-create"
                    onClick={openCreateRequestModal}
                  >
                    <Plus size={18} />
                    <span>Create Request</span>
                  </button>
                )}
              </div>
            </header>

            {/* Top Workspace KPI Grid matching Users & Tickets (.um-stats-grid) */}
            <section id="approvals-stats-grid" className="um-stats-grid">
              {/* Card 1: Total Requests */}
              <div id="approvals-stat-total" className="um-stat-card card-total">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-blue">
                    <FileCheck2 size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Total Requests</span>
                    <span className="um-stat-number">{stats.total}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-blue">All Submissions</span>
              </div>

              {/* Card 2: Pending Review */}
              <div id="approvals-stat-pending" className="um-stat-card card-inactive">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-orange">
                    <Clock size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Pending Review</span>
                    <span className="um-stat-number">{stats.pending}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-orange">Requires Action</span>
              </div>

              {/* Card 3: Approved */}
              <div id="approvals-stat-approved" className="um-stat-card card-active">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-green">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Approved</span>
                    <span className="um-stat-number">{stats.approved}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-green">Authorized</span>
              </div>

              {/* Card 4: Rejected */}
              <div id="approvals-stat-rejected" className="um-stat-card card-departments">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-purple">
                    <XCircle size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Rejected</span>
                    <span className="um-stat-number">{stats.rejected}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-purple">Declined</span>
              </div>
            </section>

            {/* Action/Error Alert */}
            {actionError && (
              <div className="user-error-banner" style={{ margin: 0 }}>
                <AlertCircle size={16} />
                <span>{actionError}</span>
              </div>
            )}

            {/* Filter & Search Bar matching Users & Tickets */}
            <div className="um-controls-bar">
              <div className="um-search-container">
                <Search size={16} color="#64748b" />
                <input
                  id="approvals-search-input"
                  type="text"
                  placeholder="Search request code, project, note, requester..."
                  autoComplete="off"
                  maxLength={INPUT_LIMITS.SEARCH}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    id="approvals-search-clear-btn"
                    type="button"
                    className="um-search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="um-filter-selects">
                <CustomSelect
                  id="approvals-status-filter"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={APPROVAL_STATUS_OPTIONS}
                  variant="filter"
                  placeholder="All Statuses"
                />

                <CustomSelect
                  id="approvals-priority-filter"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={APPROVAL_PRIORITY_OPTIONS}
                  variant="filter"
                  placeholder="All Priorities"
                />
              </div>
            </div>

            {/* Section Header with Pill Badge matching Tickets, Projects & Users */}
            <div className="ticket-folders-section-header" style={{ margin: '4px 0 16px' }}>
              <div className="ticket-folders-section-title">
                <FileCheck2 size={18} color="#2563eb" />
                <span>Approval Requests</span>
                <span className="ticket-folders-total-pill">
                  {filteredApprovals.length} {filteredApprovals.length === 1 ? 'Request' : 'Requests'}
                </span>
              </div>
            </div>

            {/* Approvals Table Card / Cards Grid */}
            {viewMode === 'table' ? (
              <div className="um-table-card approvals-table-card">
                {loading ? (
                  <SkeletonLoader variant="table" rows={5} />
                ) : filteredApprovals.length === 0 ? (
                  <div className="um-empty-state-card" style={{ border: 'none', boxShadow: 'none', margin: '24px 0' }}>
                    <div className="um-empty-icon-wrap">
                      <FileCheck2 size={32} />
                    </div>
                    <h3 id="approvals-empty-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                      No Approval Requests Found
                    </h3>
                    <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {hasActiveFilters
                        ? 'No requests match your search keywords or filter criteria. Try resetting the filters.'
                        : 'No approval requests have been submitted in your workspace yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        id="approvals-reset-filters-btn"
                        type="button"
                        className="um-btn-create"
                        style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none', marginTop: 8 }}
                        onClick={resetFilters}
                      >
                        <X size={15} />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="um-table-scroll">
                    <table id="approvals-table" className="um-table">
                      <thead>
                        <tr>
                          <th>Request Code</th>
                          <th>Project Name</th>
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
                        {filteredApprovals.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <span className="project-code-badge">{a.req_code}</span>
                            </td>
                            <td>
                              <strong style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                                {a.project_name || a.title || '—'}
                              </strong>
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
                              <span className="user-dept-badge">{a.category || 'General'}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                                {a.requested_by}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`priority-badge priority-${(a.priority || 'medium').toLowerCase()}`}
                              >
                                {a.priority}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-tag status-${(a.status || 'pending').toLowerCase()}`}
                              >
                                {a.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {formatIndianDate(a.created_at, 'Recent')}
                              </span>
                            </td>
                            <td>
                              {a.status === 'Pending' && canReviewRequests ? (
                                <div className="ap-actions-group">
                                  <button
                                    id={`approval-approve-btn-${a.id}`}
                                    type="button"
                                    className="ap-btn-approve"
                                    onClick={() => handleUpdateApprovalStatus(a.id, 'Approved')}
                                    disabled={updatingId === a.id}
                                    title="Approve this request"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    id={`approval-reject-btn-${a.id}`}
                                    type="button"
                                    className="ap-btn-reject"
                                    onClick={() => handleUpdateApprovalStatus(a.id, 'Rejected')}
                                    disabled={updatingId === a.id}
                                    title="Reject this request"
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="ap-reviewer-tag">
                                  {a.reviewed_by ? `By ${a.reviewed_by}` : '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Cards Grid View */
              <div className="um-users-cards-grid">
                {loading ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SkeletonLoader variant="cards" count={4} />
                  </div>
                ) : filteredApprovals.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1' }} className="um-empty-state-card">
                    <div className="um-empty-icon-wrap">
                      <FileCheck2 size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                      No Approval Requests Found
                    </h3>
                    <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {hasActiveFilters
                        ? 'No requests match your search keywords or filter criteria.'
                        : 'No approval requests have been submitted in your workspace yet.'}
                    </p>
                  </div>
                ) : (
                  filteredApprovals.map((a) => (
                    <div
                      key={a.id}
                      className="um-user-card"
                      style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="project-code-badge">{a.req_code}</span>
                        <span className={`status-tag status-${(a.status || 'pending').toLowerCase()}`}>
                          {a.status}
                        </span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {a.project_name || a.title || 'General Request'}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                          <span className="user-dept-badge">{a.category || 'General'}</span>
                          <span className={`priority-badge priority-${(a.priority || 'medium').toLowerCase()}`}>
                            {a.priority}
                          </span>
                        </div>
                      </div>
                      {(a.details || a.title) && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, flexGrow: 1 }}>
                          {a.details?.trim() || a.title}
                        </p>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '10px',
                          borderTop: '1px solid #f1f5f9',
                          fontSize: '0.78rem',
                          color: '#94a3b8'
                        }}
                      >
                        <span>
                          Req by: <strong style={{ color: '#475569' }}>{a.requested_by}</strong>
                        </span>
                        <span>{formatIndianDate(a.created_at, 'Recent')}</span>
                      </div>
                      {a.status === 'Pending' && canReviewRequests ? (
                        <div className="ap-actions-group" style={{ marginTop: '4px' }}>
                          <button
                            type="button"
                            className="ap-btn-approve"
                            style={{ flex: 1, justifyContent: 'center', padding: '6px 12px' }}
                            onClick={() => handleUpdateApprovalStatus(a.id, 'Approved')}
                            disabled={updatingId === a.id}
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="ap-btn-reject"
                            style={{ flex: 1, justifyContent: 'center', padding: '6px 12px' }}
                            onClick={() => handleUpdateApprovalStatus(a.id, 'Rejected')}
                            disabled={updatingId === a.id}
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : a.reviewed_by ? (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                          Reviewed by <strong style={{ color: '#0f172a' }}>{a.reviewed_by}</strong>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modern Create Request Modal matching Design System */}
      {canCreateRequest && isModalOpen && (
        <div
          id="approval-create-modal-overlay"
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div id="approval-create-modal" className="um-modal-card" role="dialog" aria-modal="true">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="approval-create-modal-title">Create Approval Request</h3>
                <p>Submit a project testing or deployment approval request for lead review.</p>
              </div>
              <button
                id="approval-create-modal-close-btn"
                className="um-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form id="approval-create-form" className="um-modal-form" onSubmit={handleCreateApproval}>
              <div className="um-modal-body">
                {formError && (
                  <div className="user-error-banner" style={{ margin: 0 }}>
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <label htmlFor="approval-req-code">Request Code</label>
                    <div className="um-input-box um-input-box-disabled">
                      <input
                        id="approval-req-code"
                        type="text"
                        name="req_code"
                        value={formData.req_code}
                        readOnly
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="approval-priority">Priority</label>
                    <CustomSelect
                      id="approval-priority"
                      value={formData.priority}
                      onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                      options={MODAL_PRIORITY_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="um-form-group">
                  <label htmlFor="approval-project-name">
                    Project Name <span className="req-star">*</span>
                  </label>
                  <div className="um-input-box">
                    <input
                      id="approval-project-name"
                      type="text"
                      name="title"
                      placeholder="Enter project name"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.NAME}
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="um-form-group">
                  <label htmlFor="approval-notes">
                    Notes <span className="opt-text">(Optional)</span>
                  </label>
                  <div className="um-input-box">
                    <input
                      id="approval-notes"
                      type="text"
                      name="details"
                      placeholder="Enter testing notes or request details..."
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.DESCRIPTION}
                      value={formData.details}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="um-form-group">
                  <label htmlFor="approval-requested-by">Requested By</label>
                  <div className="um-input-box um-input-box-disabled">
                    <input
                      id="approval-requested-by"
                      type="text"
                      name="requested_by"
                      autoComplete="name"
                      value={formData.requested_by || creatorLabel}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="um-modal-footer">
                <button
                  id="approval-create-cancel-btn"
                  type="button"
                  className="um-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="approval-create-submit-btn"
                  type="submit"
                  className="um-btn-primary"
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
