import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CalendarDays,
  ChevronDown,
  Check,
  CircleCheck,
  Clock3,
  Eye,
  ExternalLink,
  FileText,
  ImageIcon,
  LogOut,
  Plus,
  RotateCcw,
  RefreshCw,
  Search,
  Ticket,
  Upload,
  UserRound,
  Video,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';
import './AdminTickets.css';

const initialTicketForm = {
  title: '',
  description: '',
  project_code: 'PRJ-QA-01',
  assigned_to: 'Admin User',
  priority: 'Medium',
  type: 'Bug',
  status: 'Open',
  attachments: []
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
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';
  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';
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

      setTickets(ticketsRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
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

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const readers = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              url: reader.result,
              mediaType: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file'
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    try {
      const uploadedFiles = await Promise.all(readers);
      setFormData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
      event.target.value = '';
    } catch (error) {
      console.error('Error attaching files:', error);
      setFormError('One or more files could not be attached. Please try again.');
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Please enter the Ticket Title.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/tickets',
        {
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim(),
          attachments: formData.attachments || []
        },
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

  const overviewStats = [
    { label: 'Total Tickets', value: tickets.length, tone: 'total' },
    { label: 'Open', value: tickets.filter((ticket) => ticket.status === 'Open').length, tone: 'open' },
    { label: 'In Progress', value: tickets.filter((ticket) => ticket.status === 'In Progress').length, tone: 'progress' },
    { label: 'Resolved', value: tickets.filter((ticket) => ticket.status === 'Resolved').length, tone: 'resolved' }
  ];

  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout tickets-page">
      {/* Enhanced Defect Resolution & Inspection Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicketId)}
          ticketId={selectedTicketId}
          userRole={currentUserRole}
          onClose={() => {
            setSelectedTicketId(null);
            fetchData();
          }}
          onTicketUpdated={() => fetchData()}
        />
      )}

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

      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

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
                <span className="user-role">{localStorage.getItem('userRole') || 'Administrator'}</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </header>

        <div className="dashboard-container">
          <div className="projects-layout">
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2>{isDeveloper ? 'Assigned Defects & Project Tickets' : isProjectLead ? 'Project Defect Tickets' : 'Tickets Workspace'}</h2>
                <p>{isDeveloper ? 'Investigate defects, apply code fixes, and submit resolution reports for QA signoff.' : 'Track, assign, prioritize, and resolve QA issues and bug reports.'}</p>
              </div>
              {!isDeveloper && (
                <div className="users-header-actions">
                  <button
                    className="btn-primary-action"
                    onClick={() => {
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus size={18} />
                    <span>Raise Ticket</span>
                  </button>
                </div>
              )}
            </div>

            <div className="tickets-overview">
              {overviewStats.map((card) => (
                <div key={card.label} className={`overview-card ${card.tone}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>

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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                        Loading tickets...
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="user-empty-state">
                          <Ticket size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                          <p>No tickets found matching your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr
                        key={t.id}
                        className="ticket-table-row"
                        onClick={() => {
                          setSelectedTicketId(t.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedTicketId(t.id);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`View ticket ${t.ticket_code}: ${t.title}`}
                      >
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
                            {(t.attachments || []).length > 0 && (
                              <span className="ticket-attachment-summary">
                                <Upload size={12} /> {t.attachments.length} attachment{t.attachments.length > 1 ? 's' : ''}
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
                        <td>
                          <button
                            type="button"
                            className="ticket-view-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTicketId(t.id);
                            }}
                            aria-label={`View details for ${t.ticket_code}`}
                          >
                            <Eye size={15} />
                            <span>Details</span>
                          </button>
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

      {isModalOpen && (
        <div
          className="ticket-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="ticket-modal-card" role="dialog" aria-modal="true" aria-labelledby="raise-ticket-title">
            <div className="modal-header-user">
              <div className="ticket-modal-heading">
                <span className="ticket-modal-heading-icon"><Ticket size={18} /></span>
                <div>
                  <h3 id="raise-ticket-title">Raise a ticket</h3>
                  <p>Share the issue details and we’ll add it to your queue.</p>
                </div>
              </div>
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

                <div className="ticket-form-meta">
                  <div className="ticket-code-pill">
                    <FileText size={14} /> Auto-generated ticket ID
                  </div>
                  <span className="ticket-form-note">The system will generate the Ticket ID automatically when saved.</span>
                </div>

                <div className="form-grid-2">
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
                  <textarea
                    name="description"
                    placeholder="Steps to reproduce, expected vs actual behavior..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
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

                <div className="form-group-user">
                  <label>Attachments</label>
                  <label className="ticket-upload-box">
                    <Upload size={16} />
                    <span>Upload image or video</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleAttachmentChange} />
                  </label>

                  {(formData.attachments || []).length > 0 && (
                    <div className="attachment-list">
                      {(formData.attachments || []).map((attachment, index) => (
                        <div className="attachment-chip" key={`${attachment.name}-${index}`}>
                          {attachment.mediaType === 'image' ? <ImageIcon size={14} /> : attachment.mediaType === 'video' ? <Video size={14} /> : <FileText size={14} />}
                          <span>{attachment.name}</span>
                          <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(index)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
