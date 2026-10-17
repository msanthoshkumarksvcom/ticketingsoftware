import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  FolderKanban,
  FolderPlus,
  LogOut,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import './AdminProjects.css';

const initialProjectForm = {
  project_code: '',
  name: '',
  description: '',
  lead_name: '',
  department: 'Quality Assurance',
  status: 'In Progress',
  start_date: '',
  end_date: ''
};

const ROWS_PER_PAGE = 5;

function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [formData, setFormData] = useState(initialProjectForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.project_code.trim()) {
      setFormError('Please enter a Project Code (e.g. PRJ-001).');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Please enter the Project Name.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/projects',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProjects((prev) => [response.data.project, ...prev]);
      setIsPanelOpen(false);
      setFormData(initialProjectForm);
    } catch (error) {
      console.error('Error creating project:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create project. Please try again.'
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

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.project_code?.toLowerCase().includes(query) ||
        p.lead_name?.toLowerCase().includes(query) ||
        p.department?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Stats
  const totalProjects = projects.length;
  const inProgressCount = projects.filter((p) => p.status === 'In Progress').length;
  const notStartedCount = projects.filter(
    (p) => p.status === 'Not Started' || p.status === 'Planning'
  ).length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIdx, startIdx + ROWS_PER_PAGE);
  const showingFrom = filteredProjects.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + ROWS_PER_PAGE, filteredProjects.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'All';

  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  const getLeadInitial = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getProgressValue = (project) => {
    if (project.progress !== undefined && project.progress !== null && !isNaN(project.progress)) {
      return Number(project.progress);
    }
    if (project.status === 'Completed') return 100;
    if (project.status === 'Not Started' || project.status === 'Planning') return 0;
    if (project.status === 'In Progress') return 40;
    return 0;
  };

  const getProgressColor = (pct) => {
    if (pct >= 100) return '#16a34a';
    if (pct >= 60) return '#2563eb';
    if (pct >= 30) return '#2563eb';
    return '#94a3b8';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
            <strong>Projects Directory</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchProjects}
              title="Refresh projects"
              aria-label="Refresh projects list"
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
          <div className="pj-layout">
            {/* Header Card */}
            <div className="pj-header-row">
              <div className="pj-header-info">
                <h2>Projects Workspace</h2>
                <p>Organize, schedule, and track projects managed by your QA team.</p>
              </div>
              <button
                className="pj-btn-create"
                onClick={() => setIsPanelOpen(true)}
              >
                <FolderPlus size={18} />
                <span>Create Project</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="pj-stats-grid">
              <div className="pj-stat-card">
                <div className="pj-stat-icon-wrap pj-icon-blue">
                  <Briefcase size={22} />
                </div>
                <div className="pj-stat-content">
                  <span className="pj-stat-label">Total Projects</span>
                  <span className="pj-stat-number">{totalProjects}</span>
                </div>
              </div>

              <div className="pj-stat-card">
                <div className="pj-stat-icon-wrap pj-icon-green">
                  <PlayCircle size={22} />
                </div>
                <div className="pj-stat-content">
                  <span className="pj-stat-label">In Progress</span>
                  <span className="pj-stat-number">{inProgressCount}</span>
                </div>
              </div>

              <div className="pj-stat-card">
                <div className="pj-stat-icon-wrap pj-icon-orange">
                  <PauseCircle size={22} />
                </div>
                <div className="pj-stat-content">
                  <span className="pj-stat-label">Not Started</span>
                  <span className="pj-stat-number">{notStartedCount}</span>
                </div>
              </div>

              <div className="pj-stat-card">
                <div className="pj-stat-icon-wrap pj-icon-teal">
                  <CheckCircle2 size={22} />
                </div>
                <div className="pj-stat-content">
                  <span className="pj-stat-label">Completed</span>
                  <span className="pj-stat-number">{completedCount}</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="pj-filter-bar">
              <div className="pj-search-box">
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search by project code, name, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="pj-filter-selects">
                <div className="pj-select-wrapper">
                  <select
                    className="pj-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Planning">Planning</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <ChevronDown size={14} className="pj-select-chevron" />
                </div>

                {hasActiveFilters && (
                  <button className="pj-clear-filters-btn" onClick={clearFilters}>
                    <Filter size={14} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Projects Table */}
            <div className="pj-table-card">
              <div className="pj-table-scroll">
                <table className="pj-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Department</th>
                      <th>Lead</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="pj-loading-cell">
                          <div className="pj-loading-spinner" />
                          Loading projects...
                        </td>
                      </tr>
                    ) : paginatedProjects.length === 0 ? (
                      <tr>
                        <td colSpan="10">
                          <div className="pj-empty-state">
                            <FolderKanban size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                            <p>No projects found matching your search or filters.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedProjects.map((p, index) => {
                        const progress = getProgressValue(p);
                        const progressColor = getProgressColor(progress);
                        return (
                          <tr key={p.id || index}>
                            <td className="pj-row-num">{startIdx + index + 1}</td>
                            <td>
                              <span className="pj-code-badge">{p.project_code}</span>
                            </td>
                            <td>
                              <div className="pj-name-cell">
                                <span className="pj-name-text">{p.name}</span>
                              </div>
                            </td>
                            <td className="pj-dept-cell">{p.department}</td>
                            <td>
                              <div className="pj-lead-cell">
                                <div className="pj-lead-avatar">
                                  {getLeadInitial(p.lead_name)}
                                </div>
                                <span className="pj-lead-name">{p.lead_name || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`pj-status-pill ${
                                  p.status === 'Completed'
                                    ? 'pj-status-completed'
                                    : p.status === 'In Progress'
                                    ? 'pj-status-in-progress'
                                    : p.status === 'Active'
                                    ? 'pj-status-active'
                                    : 'pj-status-not-started'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td>
                              <div className="pj-progress-cell">
                                <span className="pj-progress-label">{progress}%</span>
                                <div className="pj-progress-track">
                                  <div
                                    className="pj-progress-bar"
                                    style={{
                                      width: `${progress}%`,
                                      background: progressColor
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="pj-date-cell">{formatDate(p.start_date)}</td>
                            <td className="pj-date-cell">{formatDate(p.end_date)}</td>
                            <td>
                              <button className="pj-action-btn" title="More actions">
                                <MoreHorizontal size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && filteredProjects.length > 0 && (
                <div className="pj-pagination">
                  <span className="pj-pagination-info">
                    Showing {showingFrom} to {showingTo} of {filteredProjects.length} projects
                  </span>
                  <div className="pj-pagination-controls">
                    <button
                      className="pj-page-btn"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`pj-page-btn ${safePage === page ? 'pj-page-active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="pj-page-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Right Slide-in Panel: Create New Project */}
      {isPanelOpen && (
        <div
          className="pj-panel-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPanelOpen(false);
          }}
        >
          <aside className="pj-slide-panel" role="dialog" aria-modal="true">
            <div className="pj-panel-header">
              <h3>Create New Project</h3>
              <button
                className="pj-panel-close"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="pj-panel-form">
              <div className="pj-panel-body">
                {formError && <div className="pj-error-banner">{formError}</div>}

                <div className="pj-form-group">
                  <label>Project Code <span className="pj-req">*</span></label>
                  <input
                    type="text"
                    name="project_code"
                    placeholder="e.g. PRJ-QA-04"
                    required
                    value={formData.project_code}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="pj-form-group">
                  <label>Project Name <span className="pj-req">*</span></label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Mobile App Regression"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="pj-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Brief description of the project"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="pj-form-group">
                  <label>Project Lead</label>
                  <select
                    name="lead_name"
                    value={formData.lead_name}
                    onChange={handleInputChange}
                  >
                    <option value="">Select lead</option>
                    <option value="Admin User">Admin User</option>
                    <option value="Manager">Manager</option>
                    <option value="Sathish">Sathish</option>
                    <option value="Pavithra">Pavithra</option>
                    <option value="Ramesh">Ramesh</option>
                    <option value="Karthik">Karthik</option>
                  </select>
                </div>

                <div className="pj-form-group">
                  <label>Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Development">Development</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Backend Team">Backend Team</option>
                    <option value="Product">Product</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>


                <div className="pj-form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="pj-form-group">
                  <label>Start Date</label>
                  <div className="pj-date-input-wrap">
                    <Calendar size={16} className="pj-date-icon" />
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="pj-form-group">
                  <label>Target End Date (Optional)</label>
                  <div className="pj-date-input-wrap">
                    <Calendar size={16} className="pj-date-icon" />
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="pj-panel-footer">
                <button
                  type="button"
                  className="pj-btn-cancel"
                  onClick={() => setIsPanelOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pj-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminProjects;
