import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ChevronDown,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';
import './AdminTickets.css';

const initialTicketForm = {
  ticket_code: '',
  title: '',
  description: '',
  project_code: 'PRJ-QA-01',
  assigned_to: 'Admin User',
  priority: 'Medium',
  type: 'Bug',
  status: 'Open'
};

function AdminTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialTicketForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [ticketsRes, projectsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/tickets', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      setTickets(ticketsRes.data);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.ticket_code.trim()) {
      setFormError('Please enter a Ticket Code (e.g. TCK-201).');
      return;
    }

    if (!formData.title.trim()) {
      setFormError('Please enter the Ticket Title.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/tickets',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTickets((prev) => [response.data.ticket, ...prev]);
      setIsModalOpen(false);
      setFormData(initialTicketForm);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create ticket. Please try again.'
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

  const filteredTickets = tickets.filter((t) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      t.ticket_code?.toLowerCase().includes(query) ||
      t.title?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.assigned_to?.toLowerCase().includes(query) ||
      t.project_code?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    const matchesType = typeFilter === 'All' || t.type === typeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
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
            <strong>Tickets Queue</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchData}
              title="Refresh tickets"
              aria-label="Refresh tickets list"
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
                <h2>Tickets Workspace</h2>
                <p>Track, assign, prioritize, and resolve QA issues and bug reports.</p>
              </div>
              <div className="users-header-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={18} />
                  <span>Create Ticket</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search ticket code, title, assignee, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  className="users-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
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

                <select
                  className="users-filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Bug">Bug</option>
                  <option value="Incident">Incident</option>
                  <option value="Feature">Feature</option>
                  <option value="Task">Task</option>
                </select>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Title & Description</th>
                    <th>Project</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading tickets...
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="user-empty-state">
                          <Ticket size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                          <p>No tickets found matching your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span className="project-code-badge">{t.ticket_code}</span>
                        </td>
                        <td>
                          <div className="ticket-title-cell">
                            <span className="ticket-title-text">{t.title}</span>
                            {t.description && (
                              <span className="ticket-desc-sub" title={t.description}>
                                {t.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="user-dept-badge">{t.project_code}</span>
                        </td>
                        <td>
                          <span
                            className={`ticket-type-badge ${
                              t.type === 'Bug'
                                ? 'type-bug'
                                : t.type === 'Incident'
                                ? 'type-incident'
                                : t.type === 'Feature'
                                ? 'type-feature'
                                : 'type-task'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`priority-badge ${
                              t.priority === 'Critical'
                                ? 'priority-critical'
                                : t.priority === 'High'
                                ? 'priority-high'
                                : t.priority === 'Low'
                                ? 'priority-low'
                                : 'priority-medium'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-tag ${
                              t.status === 'Open'
                                ? 'ticket-status-open'
                                : t.status === 'In Progress'
                                ? 'ticket-status-in-progress'
                                : t.status === 'Resolved'
                                ? 'ticket-status-resolved'
                                : 'ticket-status-closed'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: '#334155' }}>
                          {t.assigned_to || 'Unassigned'}
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

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay-user"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card-user" role="dialog" aria-modal="true">
            <div className="modal-header-user">
              <h3>Create New Ticket</h3>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Ticket Code *</label>
                    <input
                      type="text"
                      name="ticket_code"
                      placeholder="e.g. TCK-205"
                      required
                      value={formData.ticket_code}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Issue Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="Bug">Bug</option>
                      <option value="Incident">Incident</option>
                      <option value="Feature">Feature</option>
                      <option value="Task">Task</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-user">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Short summary of the issue or requirement"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Description</label>
                  <input
                    type="text"
                    name="description"
                    placeholder="Steps to reproduce, expected vs actual behavior..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Related Project</label>
                    <select
                      name="project_code"
                      value={formData.project_code}
                      onChange={handleInputChange}
                    >
                      {projects.length > 0 ? (
                        projects.map((p) => (
                          <option key={p.id} value={p.project_code}>
                            {p.project_code} - {p.name}
                          </option>
                        ))
                      ) : (
                        <option value="PRJ-QA-01">PRJ-QA-01 - Automation Suite</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group-user">
                    <label>Assign To</label>
                    <select
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleInputChange}
                    >
                      {users.length > 0 ? (
                        users.map((u) => (
                          <option key={u.id} value={u.full_name || u.email}>
                            {u.full_name || u.email} ({u.role || 'Member'})
                          </option>
                        ))
                      ) : (
                        <option value="Admin User">Admin User</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
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

                  <div className="form-group-user">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
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
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTickets;
