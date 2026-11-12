import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Layers,
  LogOut,
  Plus,
  Rocket,
  Search,
  Server,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import { formatIndianDate } from '../../utils/dateFormat';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialDeploymentForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fetchDeployments = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateDeployment = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.deploy_code.trim()) {
      setFormError('Please enter a Deployment Code (e.g. DEP-901).');
      return;
    }

    if (!formData.service_name.trim()) {
      setFormError('Please enter the Service or Microservice Name.');
      return;
    }

    if (!formData.version.trim()) {
      setFormError('Please enter the Release Version (e.g. v2.1.0).');
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
        <div className="dashboard-container">
          <div className="projects-layout">
            {/* Header Card */}
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2>Deployment Approvals Queue</h2>
                <p>Verify release readiness, smoke test gates, and production push requests.</p>
              </div>
              <div className="users-header-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Rocket size={18} />
                  <span>Request Deployment</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search deployment code, service, version..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <CustomSelect
                  value={envFilter}
                  onChange={setEnvFilter}
                  options={ENV_FILTER_OPTIONS}
                  variant="filter"
                  placeholder="All Environments"
                />

                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  variant="filter"
                  placeholder="All Statuses"
                />
              </div>
            </div>

            {/* Deployments Table */}
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Deployment Code</th>
                    <th>Service & Release Notes</th>
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
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading deployments...
                      </td>
                    </tr>
                  ) : filteredDeployments.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="user-empty-state">
                          <Rocket size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                          <p>No deployments found matching your filters.</p>
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
                          <div className="project-name-cell">
                            <span>{d.service_name}</span>
                            {d.release_notes && (
                              <span className="project-desc-small" title={d.release_notes}>
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
                        <td style={{ fontWeight: 500 }}>{d.requested_by}</td>
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
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {formatIndianDate(d.created_at, 'Recent')}
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

      {/* Create Deployment Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3>Request Deployment Approval</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateDeployment}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Deployment Code *</label>
                    <input
                      type="text"
                      name="deploy_code"
                      placeholder="e.g. DEP-905"
                      required
                      value={formData.deploy_code}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Target Environment</label>
                    <CustomSelect
                      value={formData.environment}
                      onChange={(val) => setFormData((prev) => ({ ...prev, environment: val }))}
                      options={MODAL_ENV_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Service / Application *</label>
                    <input
                      type="text"
                      name="service_name"
                      placeholder="e.g. Payment Gateway API"
                      required
                      value={formData.service_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Release Version *</label>
                    <input
                      type="text"
                      name="version"
                      placeholder="e.g. v2.4.1"
                      required
                      value={formData.version}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label>Release Notes / Changes</label>
                  <input
                    type="text"
                    name="release_notes"
                    placeholder="Summary of bug fixes, performance improvements, or PR links..."
                    value={formData.release_notes}
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
                    <label>Initial Status</label>
                    <CustomSelect
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
