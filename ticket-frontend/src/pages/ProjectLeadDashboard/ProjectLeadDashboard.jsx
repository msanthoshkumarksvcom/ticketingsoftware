import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FolderKanban,
  FileSpreadsheet,
  Ticket,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  Plus,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  X,
  UserPlus,
  Trash2,
  History,
  ShieldCheck,
  Check,
  Bell,
  LogOut
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import '../../styles/admin.css';
import './ProjectLeadDashboard.css';

const PLD_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved (Ready for QA)' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Reopened', label: 'Reopened' }
];

const PLD_SEVERITY_OPTIONS = [
  { value: 'All', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

export default function ProjectLeadDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');

  // Ticket Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  // Selected Ticket for Detail / Preview Modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Developer Assignment Modal
  const [devModalProject, setDevModalProject] = useState(null);
  const [availableDevelopers, setAvailableDevelopers] = useState([]);
  const [projectAssignedDevs, setProjectAssignedDevs] = useState([]);
  const [selectedDevIdsToAssign, setSelectedDevIdsToAssign] = useState([]);
  const [devAssignmentNotes, setDevAssignmentNotes] = useState('');
  const [assigningDevsLoading, setAssigningDevsLoading] = useState(false);
  const [devModalError, setDevModalError] = useState('');
  const [devModalSuccess, setDevModalSuccess] = useState('');
  const [devHistory, setDevHistory] = useState([]);
  const [showDevHistory, setShowDevHistory] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    fetchDashboardStats();
    fetchTickets();
    fetchAvailableDevelopers();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/project-lead/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error fetching project lead stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  const fetchAvailableDevelopers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/developers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableDevelopers(res.data || []);
    } catch (err) {
      console.error('Error fetching developers:', err);
    }
  };

  const openDevModal = async (project) => {
    setDevModalProject(project);
    setDevModalError('');
    setDevModalSuccess('');
    setSelectedDevIdsToAssign([]);
    setDevAssignmentNotes('');
    setShowDevHistory(false);

    try {
      const token = localStorage.getItem('token');
      const [devsRes, histRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/admin/projects/${project.id}/developers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/admin/projects/${project.id}/developer-history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setProjectAssignedDevs(devsRes.data || []);
      setDevHistory(histRes.data || []);
    } catch (err) {
      console.error('Error loading project developers:', err);
    }
  };

  const handleAssignDevsToProject = async (e) => {
    e.preventDefault();
    if (selectedDevIdsToAssign.length === 0) {
      setDevModalError('Please select at least one developer to assign.');
      return;
    }
    setAssigningDevsLoading(true);
    setDevModalError('');
    setDevModalSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/admin/projects/${devModalProject.id}/developers`,
        { developer_ids: selectedDevIdsToAssign, notes: devAssignmentNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDevModalSuccess(res.data.message || 'Developers assigned successfully.');
      setSelectedDevIdsToAssign([]);
      setDevAssignmentNotes('');

      // Refresh list
      const updated = await axios.get(`http://localhost:5000/api/admin/projects/${devModalProject.id}/developers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectAssignedDevs(updated.data || []);
      fetchDashboardStats();
    } catch (err) {
      setDevModalError(err.response?.data?.error || 'Failed to assign developers.');
    } finally {
      setAssigningDevsLoading(false);
    }
  };

  const handleRemoveDevFromProject = async (developerId) => {
    if (!window.confirm('Remove this developer from the project?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/projects/${devModalProject.id}/developers/${developerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjectAssignedDevs((prev) => prev.filter((d) => d.developer_id !== developerId));
      fetchDashboardStats();
    } catch (err) {
      setDevModalError(err.response?.data?.error || 'Failed to remove developer.');
    }
  };

  const toggleSelectDev = (devId) => {
    setSelectedDevIdsToAssign((prev) =>
      prev.includes(devId) ? prev.filter((id) => id !== devId) : [...prev, devId]
    );
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Project Lead');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.ticket_code?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.test_case_id?.toLowerCase().includes(q) ||
        t.module?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || t.severity === severityFilter;
      const matchesProj = projectFilter === 'All' || String(t.project_id) === projectFilter;

      return matchesSearch && matchesStatus && matchesSeverity && matchesProj;
    });
  }, [tickets, searchQuery, statusFilter, severityFilter, projectFilter]);

  const pldProjectOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Projects' },
      ...projects.map((p) => ({ value: String(p.id), label: p.name }))
    ];
  }, [projects]);

  const summary = dashboardData?.summary || {
    totalAssignedProjects: 0,
    totalTestCases: 0,
    passedTestCases: 0,
    failedTestCases: 0,
    blockedTestCases: 0,
    totalSheets: 0,
    totalBugTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    reopenedTickets: 0
  };

  const projects = dashboardData?.projects || [];

  return (
    <div className="admin-layout">
      {/* Sign Out Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your project lead account.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Role Sidebar */}
      <RoleSidebar
        roleName="Project Lead"
        homeRoute="/project-lead"
        onLogout={() => setShowLogoutModal(true)}
      />

      <main className="main-content">
        {/* Top Navbar */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">&gt;</span>
            <strong>Project Lead Dashboard</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={() => { fetchDashboardStats(); fetchTickets(); }}
              title="Refresh dashboard data"
              aria-label="Refresh data"
            >
              <RefreshCw size={17} className={loading ? 'tdm-spin' : ''} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar" style={{ background: '#EFF6FF', color: '#1E3A8A' }}>{avatarLabel}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Project Lead</span>
              </div>
              <ChevronDown size={14} className="profile-chevron" />
            </div>
          </div>
        </header>

        {/* Dashboard Container */}
        <div className="pld-container">
          {/* Welcome Banner */}
          <section className="pld-welcome-banner">
            <div className="pld-welcome-content">
              <div className="pld-eyebrow">
                <FolderKanban size={13} /> Project Lead Workspace Console
              </div>
              <h1>Welcome, Project Lead {displayName}!</h1>
              <p>
                Direct roadmap execution, assign engineering developers to your projects, inspect complete test case sheets, and triage bug tickets through to closure.
              </p>
              <div className="pld-welcome-meta">
                <span className="pld-meta-pill live">
                  <span className="pld-live-dot" /> Online
                </span>
                <span className="pld-meta-pill">Assigned Projects: {summary.totalAssignedProjects}</span>
                <span className="pld-meta-pill">Active Tickets: {summary.openTickets + summary.inProgressTickets + summary.reopenedTickets}</span>
              </div>
            </div>
          </section>

          {/* Metric Summary Cards Grid (Section 3) */}
          <div className="pld-metrics-grid">
            <div className="pld-metric-card primary">
              <div className="pld-mc-top">
                <span className="pld-mc-label">Assigned Projects</span>
                <div className="pld-mc-icon"><FolderKanban size={18} /></div>
              </div>
              <div className="pld-mc-val">{summary.totalAssignedProjects}</div>
              <div className="pld-mc-sub">{summary.totalSheets} Test Case Sheets</div>
            </div>

            <div className="pld-metric-card">
              <div className="pld-mc-top">
                <span className="pld-mc-label">Total Test Cases</span>
                <div className="pld-mc-icon"><FileSpreadsheet size={18} color="#2563EB" /></div>
              </div>
              <div className="pld-mc-val">{summary.totalTestCases}</div>
              <div className="pld-mc-sub green">{summary.passedTestCases} Passed ({summary.totalTestCases ? Math.round((summary.passedTestCases / summary.totalTestCases) * 100) : 0}%)</div>
            </div>

            <div className="pld-metric-card danger">
              <div className="pld-mc-top">
                <span className="pld-mc-label">Failed Test Cases</span>
                <div className="pld-mc-icon"><AlertCircle size={18} color="#DC2626" /></div>
              </div>
              <div className="pld-mc-val">{summary.failedTestCases}</div>
              <div className="pld-mc-sub red">{summary.blockedTestCases} Blocked Cases</div>
            </div>

            <div className="pld-metric-card warning">
              <div className="pld-mc-top">
                <span className="pld-mc-label">Total Bug Tickets</span>
                <div className="pld-mc-icon"><Ticket size={18} color="#D97706" /></div>
              </div>
              <div className="pld-mc-val">{summary.totalBugTickets}</div>
              <div className="pld-mc-sub amber">{summary.openTickets} Open &bull; {summary.inProgressTickets} In Progress</div>
            </div>

            <div className="pld-metric-card success">
              <div className="pld-mc-top">
                <span className="pld-mc-label">Resolved (Ready for QA)</span>
                <div className="pld-mc-icon"><CheckCircle2 size={18} color="#16A34A" /></div>
              </div>
              <div className="pld-mc-val">{summary.resolvedTickets}</div>
              <div className="pld-mc-sub green">{summary.closedTickets} Verified & Closed</div>
            </div>
          </div>

          {/* Section A: Assigned Projects Overview */}
          <section className="pld-section">
            <div className="pld-section-header">
              <div>
                <h2>Assigned Projects Overview</h2>
                <p>Projects allocated under your leadership. Click to access complete test case sheets or manage developers.</p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="pld-empty-card">
                <FolderKanban size={36} color="#94A3B8" />
                <h3>No Projects Assigned Yet</h3>
                <p>When an administrator or QA Manager assigns you as Project Lead on a project, it will appear here.</p>
              </div>
            ) : (
              <div className="pld-projects-table-wrap">
                <table className="pld-table">
                  <thead>
                    <tr>
                      <th>Project Code & Name</th>
                      <th>Status & Priority</th>
                      <th>Progress</th>
                      <th>Developers</th>
                      <th>Test Cases</th>
                      <th>Bug Tickets</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((proj) => (
                      <tr key={proj.id}>
                        <td>
                          <div className="pld-proj-col">
                            <strong>{proj.name}</strong>
                            <span>{proj.project_code}</span>
                          </div>
                        </td>
                        <td>
                          <div className="pld-status-cell">
                            <span className={`pld-badge ${(proj.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                              {proj.status || 'Active'}
                            </span>
                            <span className="pld-sub-text">{proj.priority || 'Medium'} Priority</span>
                          </div>
                        </td>
                        <td>
                          <div className="pld-progress-col">
                            <div className="pld-progress-bar-bg">
                              <div
                                className="pld-progress-bar-fill"
                                style={{ width: `${proj.progress || 0}%` }}
                              />
                            </div>
                            <span>{proj.progress || 0}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="pld-devs-count-chip">
                            <Users size={13} />
                            <span>{proj.assigned_devs_count || 0} Devs</span>
                          </div>
                        </td>
                        <td>
                          <div className="pld-tc-stat">
                            <span>{proj.sheets_count || 0} Sheets</span>
                          </div>
                        </td>
                        <td>
                          <div className="pld-tickets-stat">
                            <strong>{proj.tickets_count || 0} Total</strong>
                            <small className="red">{proj.open_tickets || 0} Open</small>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="pld-actions-group">
                            <button
                              type="button"
                              className="pld-btn-action sheet"
                              onClick={() => navigate(`/admin/projects/${proj.id}/sheet`, { state: { project: proj } })}
                              title="Open complete Google Sheets-style test execution matrix"
                            >
                              <FileSpreadsheet size={13} />
                              <span>Test Sheet</span>
                            </button>
                            <button
                              type="button"
                              className="pld-btn-action devs"
                              onClick={() => openDevModal(proj)}
                              title="Assign or remove developers for this project"
                            >
                              <UserPlus size={13} />
                              <span>Developers</span>
                            </button>
                            <button
                              type="button"
                              className="pld-btn-action details"
                              onClick={() => navigate(`/admin/projects/${proj.id}`, { state: { project: proj } })}
                              title="Open Project Workspace Details"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section B: Project Bug Tickets & Developer Assignment */}
          <section className="pld-section">
            <div className="pld-section-header">
              <div>
                <h2>Project Bug Tickets Management</h2>
                <p>Monitor defects raised from failed test cases, assign project developers, review resolution evidence, and track fixes.</p>
              </div>
              <div className="pld-ticket-count-pill">{filteredTickets.length} Tickets</div>
            </div>

            {/* Filter Bar */}
            <div className="pld-filters-bar">
              <div className="pld-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by ticket ID, title, module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="pld-filter-selects" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={PLD_STATUS_OPTIONS}
                  variant="filter"
                  placeholder="All Statuses"
                />

                <CustomSelect
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={PLD_SEVERITY_OPTIONS}
                  variant="filter"
                  placeholder="All Severities"
                />

                {projects.length > 1 && (
                  <CustomSelect
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={pldProjectOptions}
                    variant="filter"
                    placeholder="All Projects"
                  />
                )}
              </div>
            </div>

            {/* Tickets Table */}
            {filteredTickets.length === 0 ? (
              <div className="pld-empty-card">
                <Ticket size={34} color="#94A3B8" />
                <h3>No Bug Tickets Found</h3>
                <p>No tickets match the selected filters or search query.</p>
              </div>
            ) : (
              <div className="pld-projects-table-wrap">
                <table className="pld-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Project</th>
                      <th>Defect Title & Module</th>
                      <th>Test Case ID</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Assigned Developer</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <span className="pld-ticket-code-tag">{ticket.ticket_code}</span>
                        </td>
                        <td>
                          <span className="pld-ticket-proj">{ticket.project_name || ticket.project_code}</span>
                        </td>
                        <td>
                          <div className="pld-ticket-title-col">
                            <strong>{ticket.title}</strong>
                            <span>{ticket.module || 'General'} {ticket.sub_module ? `· ${ticket.sub_module}` : ''}</span>
                          </div>
                        </td>
                        <td>
                          <span className="pld-tc-pill">{ticket.test_case_id || 'TC-GEN'}</span>
                        </td>
                        <td>
                          <span className={`pld-sev-badge ${(ticket.severity || 'medium').toLowerCase()}`}>
                            {ticket.severity || 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span className={`pld-status-badge ${(ticket.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td>
                          <span className="pld-dev-name-pill">
                            {ticket.assigned_to && ticket.assigned_to !== 'Unassigned'
                              ? ticket.assigned_to
                              : '— Unassigned'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="pld-btn-preview-ticket"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            title="Preview complete bug report, assign developer, or inspect resolution"
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Developer Assignment to Project Modal (Section 4) */}
      {devModalProject && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDevModalProject(null)}>
          <div className="pld-dev-modal-card">
            <div className="pld-modal-header">
              <div>
                <span className="pld-modal-badge"><Users size={14} /> DEVELOPER MANAGEMENT</span>
                <h3>Assign Developers: {devModalProject.name}</h3>
                <p className="pld-modal-sub">
                  Project Code: <strong>{devModalProject.project_code}</strong> &bull; Assigned Project Lead: <strong>{displayName}</strong>
                </p>
              </div>
              <button
                type="button"
                className="rbt-close-btn"
                onClick={() => setDevModalProject(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pld-modal-body">
              {devModalError && (
                <div className="rbt-error-alert" style={{ marginBottom: 12 }}>
                  <AlertCircle size={15} />
                  <span>{devModalError}</span>
                </div>
              )}
              {devModalSuccess && (
                <div className="tdm-alert-box success" style={{ marginBottom: 12 }}>
                  <CheckCircle2 size={15} />
                  <span>{devModalSuccess}</span>
                </div>
              )}

              {/* Top: Currently Assigned Developers */}
              <div className="pld-dev-section">
                <div className="pld-dev-section-title">
                  <span>Currently Assigned Engineering Developers ({projectAssignedDevs.length})</span>
                  {devHistory.length > 0 && (
                    <button
                      type="button"
                      className="pld-btn-hist-toggle"
                      onClick={() => setShowDevHistory(!showDevHistory)}
                    >
                      <History size={13} />
                      <span>{showDevHistory ? 'Hide History' : 'Assignment History'}</span>
                    </button>
                  )}
                </div>

                {projectAssignedDevs.length === 0 ? (
                  <p className="pld-empty-hint">No developers assigned to this project yet. Select developers below.</p>
                ) : (
                  <div className="pld-assigned-devs-list">
                    {projectAssignedDevs.map((d) => (
                      <div key={d.developer_id} className="pld-dev-item-card">
                        <div className="pld-dev-avatar">
                          {d.developer_name ? d.developer_name.charAt(0).toUpperCase() : 'D'}
                        </div>
                        <div className="pld-dev-info">
                          <strong>{d.developer_name}</strong>
                          <span>{d.emp_id || 'EMP'} &bull; {d.developer_email}</span>
                          <small>Assigned on {new Date(d.assigned_at).toLocaleDateString()}</small>
                        </div>
                        <button
                          type="button"
                          className="pld-btn-remove-dev"
                          onClick={() => handleRemoveDevFromProject(d.developer_id)}
                          title="Remove from project"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History view if toggled */}
              {showDevHistory && (
                <div className="pld-dev-section pld-history-box">
                  <div className="pld-dev-section-title">Developer Assignment History</div>
                  <div className="pld-history-list">
                    {devHistory.map((h) => (
                      <div key={h.id} className="pld-hist-row">
                        <span><strong>{h.developer_name}</strong> ({h.developer_email})</span>
                        <span className={`pld-hist-status ${h.status.toLowerCase()}`}>{h.status}</span>
                        <small>Assigned by {h.assigned_by} on {new Date(h.assigned_at).toLocaleDateString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom: Assign New Developers Form */}
              <form onSubmit={handleAssignDevsToProject} className="pld-assign-form">
                <div className="pld-dev-section-title">Available Developers</div>
                <div className="pld-avail-devs-grid">
                  {availableDevelopers.map((dev) => {
                    const isAlreadyAssigned = projectAssignedDevs.some((d) => d.developer_id === dev.id);
                    const isSelected = selectedDevIdsToAssign.includes(dev.id);

                    return (
                      <div
                        key={dev.id}
                        className={`pld-avail-dev-card ${isSelected ? 'selected' : ''} ${isAlreadyAssigned ? 'assigned' : ''}`}
                        onClick={() => !isAlreadyAssigned && toggleSelectDev(dev.id)}
                      >
                        <div className="pld-avail-check">
                          {isSelected ? <Check size={14} color="#fff" /> : null}
                        </div>
                        <div className="pld-avail-info">
                          <strong>{dev.full_name}</strong>
                          <span>{dev.email}</span>
                          {isAlreadyAssigned && <span className="pld-tag-already">Already on Project</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pld-notes-input-wrap">
                  <label>Assignment Notes / Role Focus (Optional)</label>
                  <input
                    type="text"
                    className="rbt-input"
                    placeholder="e.g. Frontend bug fixes, API endpoint investigation"
                    value={devAssignmentNotes}
                    onChange={(e) => setDevAssignmentNotes(e.target.value)}
                  />
                </div>

                <div className="pld-modal-actions">
                  <button
                    type="button"
                    className="rbt-btn-cancel"
                    onClick={() => setDevModalProject(null)}
                  >
                    Done
                  </button>
                  <button
                    type="submit"
                    className="rbt-btn-submit"
                    disabled={selectedDevIdsToAssign.length === 0 || assigningDevsLoading}
                  >
                    <UserPlus size={15} />
                    <span>{assigningDevsLoading ? 'Assigning...' : `Assign ${selectedDevIdsToAssign.length} Developer(s)`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Preview & Management Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          ticketId={selectedTicketId}
          userRole="Project Lead"
          onTicketUpdated={() => {
            fetchTickets();
            fetchDashboardStats();
          }}
        />
      )}
    </div>
  );
}
