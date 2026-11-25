import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  List,
  LogOut,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Server,
  X
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
import '../AdminProjects/AdminProjects.css';
import './AdminDeployments.css';

const ENV_FILTER_OPTIONS = [
  { value: 'All', label: 'All Environments' },
  { value: 'Production', label: 'Production' },
  { value: 'Staging', label: 'Staging' },
  { value: 'QA Environment', label: 'QA Environment' },
  { value: 'Development', label: 'Development' }
];

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Deployed', label: 'Deployed' },
  { value: 'Rejected', label: 'Rejected' }
];

const MODAL_ENV_OPTIONS = [
  { value: 'Staging', label: 'Staging' },
  { value: 'Production', label: 'Production' },
  { value: 'QA Environment', label: 'QA Environment' },
  { value: 'Development', label: 'Development' }
];

const MODAL_STATUS_OPTIONS = [
  { value: 'Pending Review', label: 'Pending Review' },
  { value: 'Approved', label: 'Approved' }
];

const initialDeploymentForm = {
  deploy_code: '',
  service_name: '',
  environment: 'Staging',
  version: '',
  requested_by: 'Admin User',
  status: 'Pending Review',
  release_notes: ''
};

function AdminDeployments() {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialDeploymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';

  const fetchDeployments = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/deployments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeployments(response.data);
    } catch (error) {
      console.error('Failed to load deployments:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const silentRefreshDeployments = useCallback(() => {
    fetchDeployments({ silent: true });
  }, [fetchDeployments]);

  useRealtimeSync(['deployments', 'projects'], silentRefreshDeployments);

  // Compute 4 KPI stats
  const stats = useMemo(() => {
    const total = deployments.length;
    const pending = deployments.filter((d) => (d.status || '').toLowerCase() === 'pending review').length;
    const approved = deployments.filter((d) => (d.status || '').toLowerCase() === 'approved').length;
    const deployed = deployments.filter((d) => (d.status || '').toLowerCase() === 'deployed').length;
    return { total, pending, approved, deployed };
  }, [deployments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateDeployment = async (e) => {
    e.preventDefault();
    setFormError('');

    const validationErr = validateFields([
      { value: formData.deploy_code, options: { label: 'Deployment Code', required: true, maxLength: INPUT_LIMITS.CODE } },
      { value: formData.service_name, options: { label: 'Service / Application', required: true, maxLength: INPUT_LIMITS.NAME } },
      { value: formData.version, options: { label: 'Release Version', required: true, maxLength: INPUT_LIMITS.VERSION } },
      { value: formData.release_notes, options: { label: 'Release Notes / Changes', required: false, maxLength: INPUT_LIMITS.DESCRIPTION } },
      { value: formData.requested_by, options: { label: 'Requested By', required: false, maxLength: INPUT_LIMITS.NAME } }
    ]);
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/deployments',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeployments((prev) => [response.data.deployment, ...prev]);
      setIsModalOpen(false);
      setFormData(initialDeploymentForm);
    } catch (error) {
      console.error('Error creating deployment:', error);
      setFormError(
        error.response?.data?.error || 'Failed to submit deployment request.'
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

  const filteredDeployments = deployments.filter((d) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      d.deploy_code?.toLowerCase().includes(query) ||
      d.service_name?.toLowerCase().includes(query) ||
      d.version?.toLowerCase().includes(query) ||
      d.requested_by?.toLowerCase().includes(query);

    const matchesEnv = envFilter === 'All' || d.environment === envFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;

    return matchesSearch && matchesEnv && matchesStatus;
  });

  return (
    <div className="admin-layout">
      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          id="deployments-logout-overlay"
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section id="deployments-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 id="deployments-logout-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button
                id="deployments-logout-cancel-btn"
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button id="deployments-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Role Sidebar Navigation */}
      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Area */}
      <main id="deployments-main-content" className="main-content">
        <TopNavbar pageTitle="Deployment Approvals" />
        <div className="dashboard-container">
          <div className="users-page-layout deployments-page-layout">
            {/* 1. Header Card Container matching Users & Projects */}
            <header id="deployments-header-section" className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <Rocket size={24} color="#2563EB" />
                </div>
                <div className="um-header-titles">
                  <h1 id="deployments-page-heading">Deployment Approvals</h1>
                  <p>
                    Verify release readiness, smoke test gates, and production push requests.
                  </p>
                </div>
              </div>

              <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Segmented View Switcher */}
                <div id="deployments-view-switcher" className="ticket-view-toggle" role="group" aria-label="Deployment view mode">
                  <button
                    id="deployments-view-table-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    <List size={15} />
                    <span>Table View</span>
                  </button>
                  <button
                    id="deployments-view-grid-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={15} />
                    <span>Cards Grid</span>
                  </button>
                </div>

                <button
                  id="deployments-refresh-btn"
                  type="button"
                  className="um-btn-create"
                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                  onClick={fetchDeployments}
                  title="Refresh deployments"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>

                <button
                  id="deployments-request-btn"
                  className="um-btn-create"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  <span>Request Deployment</span>
                </button>
              </div>
            </header>

            {/* 2. 4 Summary KPI Cards matching Users & Projects */}
            <section id="deployments-stats-grid" className="um-stats-grid">
              {/* Card 1: Total Deployments */}
              <div id="deployments-stat-total" className="um-stat-card card-total">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-blue">
                    <Rocket size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Total Deployments</span>
                    <span className="um-stat-number">{stats.total}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-blue">All Releases</span>
              </div>

              {/* Card 2: Pending Review */}
              <div id="deployments-stat-pending" className="um-stat-card card-inactive">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-orange">
                    <Clock size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Pending Review</span>
                    <span className="um-stat-number">{stats.pending}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-orange">Awaiting Gate</span>
              </div>

              {/* Card 3: Approved */}
              <div id="deployments-stat-approved" className="um-stat-card card-active">
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

              {/* Card 4: Deployed */}
              <div id="deployments-stat-deployed" className="um-stat-card card-departments">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-purple">
                    <Server size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Deployed</span>
                    <span className="um-stat-number">{stats.deployed}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-purple">In Production</span>
              </div>
            </section>

            {/* 3. Filter Bar */}
            <div className="um-controls-bar">
              <div className="um-search-container">
                <Search size={16} color="#64748b" />
                <input
                  id="deployments-search-input"
                  type="text"
                  placeholder="Search deployment code, service, version, requester..."
                  autoComplete="off"
                  maxLength={INPUT_LIMITS.SEARCH}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    id="deployments-search-clear-btn"
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
                  id="deployments-env-filter"
                  value={envFilter}
                  onChange={setEnvFilter}
                  options={ENV_FILTER_OPTIONS}
                  variant="filter"
                  placeholder="All Environments"
                />

                <CustomSelect
                  id="deployments-status-filter"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  variant="filter"
                  placeholder="All Statuses"
                />
              </div>
            </div>

            {/* 4. Section Header with Badge */}
            <div className="ticket-folders-section-header" style={{ margin: '4px 0 16px' }}>
              <div className="ticket-folders-section-title">
                <Rocket size={18} color="#2563eb" />
                <span>Deployment Records</span>
                <span className="ticket-folders-total-pill">
                  {filteredDeployments.length} {filteredDeployments.length === 1 ? 'Deployment' : 'Deployments'}
                </span>
              </div>
            </div>

            {/* 5. Deployments Table / Cards Grid */}
            {viewMode === 'table' ? (
              <div className="um-table-card deployments-table-card">
                <div className="um-table-scroll">
                  <table id="deployments-table" className="um-table">
                    <thead>
                      <tr>
                        <th>Deployment Code</th>
                        <th>Service &amp; Release Notes</th>
                        <th>Environment</th>
                        <th>Version</th>
                        <th>Requested By</th>
                        <th>Status</th>
                        <th>Requested On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '12px' }}>
                            <SkeletonLoader variant="table" rows={5} />
                          </td>
                        </tr>
                      ) : filteredDeployments.length === 0 ? (
                        <tr>
                          <td colSpan="7">
                            <div className="um-empty-state-card" style={{ border: 'none', boxShadow: 'none', margin: '24px 0' }}>
                              <div className="um-empty-icon-wrap">
                                <Rocket size={32} />
                              </div>
                              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                                No Deployments Found
                              </h3>
                              <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                {searchQuery || envFilter !== 'All' || statusFilter !== 'All'
                                  ? 'No deployments match your search keywords or filter criteria.'
                                  : 'No deployment requests have been submitted in your workspace yet.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredDeployments.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <span className="project-code-badge">{d.deploy_code}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <strong style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                                  {d.service_name}
                                </strong>
                                {d.release_notes && (
                                  <span
                                    style={{
                                      color: '#64748b',
                                      fontSize: '0.78rem',
                                      maxWidth: '320px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={d.release_notes}
                                  >
                                    {d.release_notes}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`user-dept-badge ${
                                  d.environment === 'Production' ? 'priority-critical' : ''
                                }`}
                              >
                                {d.environment}
                              </span>
                            </td>
                            <td>
                              <span className="user-badge-emp">{d.version}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                                {d.requested_by}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-tag ${
                                  d.status === 'Deployed'
                                    ? 'status-active'
                                    : d.status === 'Approved'
                                    ? 'status-in-progress'
                                    : d.status === 'Rejected'
                                    ? 'priority-critical'
                                    : 'status-planning'
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {formatIndianDate(d.created_at, 'Recent')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Cards Grid View */
              <div className="um-users-cards-grid">
                {loading ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <SkeletonLoader variant="cards" count={4} />
                  </div>
                ) : filteredDeployments.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1' }} className="um-empty-state-card">
                    <div className="um-empty-icon-wrap">
                      <Rocket size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                      No Deployments Found
                    </h3>
                    <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {searchQuery || envFilter !== 'All' || statusFilter !== 'All'
                        ? 'No deployments match your search keywords or filter criteria.'
                        : 'No deployment requests have been submitted in your workspace yet.'}
                    </p>
                  </div>
                ) : (
                  filteredDeployments.map((d) => (
                    <div
                      key={d.id}
                      className="um-user-card"
                      style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="project-code-badge">{d.deploy_code}</span>
                        <span
                          className={`status-tag ${
                            d.status === 'Deployed'
                              ? 'status-active'
                              : d.status === 'Approved'
                              ? 'status-in-progress'
                              : d.status === 'Rejected'
                              ? 'priority-critical'
                              : 'status-planning'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {d.service_name}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                          <span className={`user-dept-badge ${d.environment === 'Production' ? 'priority-critical' : ''}`}>
                            {d.environment}
                          </span>
                          <span className="user-badge-emp">{d.version}</span>
                        </div>
                      </div>
                      {d.release_notes && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, flexGrow: 1 }}>
                          {d.release_notes}
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
                          Req by: <strong style={{ color: '#475569' }}>{d.requested_by}</strong>
                        </span>
                        <span>{formatIndianDate(d.created_at, 'Recent')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Deployment Modal */}
      {isModalOpen && (
        <div
          id="deploy-create-modal-overlay"
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div id="deploy-create-modal" className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3 id="deploy-create-modal-title">Request Deployment Approval</h3>
              <button
                id="deploy-create-modal-close-btn"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form id="deploy-create-form" onSubmit={handleCreateDeployment}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label htmlFor="deploy-code">Deployment Code *</label>
                    <input
                      id="deploy-code"
                      type="text"
                      name="deploy_code"
                      placeholder="e.g. DEP-905"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.CODE}
                      required
                      value={formData.deploy_code}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label htmlFor="deploy-environment">Target Environment</label>
                    <CustomSelect
                      id="deploy-environment"
                      value={formData.environment}
                      onChange={(val) => setFormData((prev) => ({ ...prev, environment: val }))}
                      options={MODAL_ENV_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label htmlFor="deploy-service-name">Service / Application *</label>
                    <input
                      id="deploy-service-name"
                      type="text"
                      name="service_name"
                      placeholder="e.g. Payment Gateway API"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.NAME}
                      required
                      value={formData.service_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label htmlFor="deploy-version">Release Version *</label>
                    <input
                      id="deploy-version"
                      type="text"
                      name="version"
                      placeholder="e.g. v2.4.1"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.VERSION}
                      required
                      value={formData.version}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label htmlFor="deploy-release-notes">Release Notes / Changes</label>
                  <input
                    id="deploy-release-notes"
                    type="text"
                    name="release_notes"
                    placeholder="Summary of bug fixes, performance improvements, or PR links..."
                    autoComplete="off"
                    maxLength={INPUT_LIMITS.DESCRIPTION}
                    value={formData.release_notes}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label htmlFor="deploy-requested-by">Requested By</label>
                    <input
                      id="deploy-requested-by"
                      type="text"
                      name="requested_by"
                      autoComplete="name"
                      maxLength={INPUT_LIMITS.NAME}
                      value={formData.requested_by}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label htmlFor="deploy-status">Initial Status</label>
                    <CustomSelect
                      id="deploy-status"
                      value={formData.status}
                      onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                      options={MODAL_STATUS_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-user">
                <button
                  id="deploy-create-cancel-btn"
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="deploy-create-submit-btn"
                  type="submit"
                  className="btn-primary-action"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Deployment Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDeployments;
