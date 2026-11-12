import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Code2,
  Folder,
  FolderOpen,
  FolderKanban,
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  LogOut,
  Layers,
  ArrowRight,
  ExternalLink,
  Lock
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import '../../styles/admin.css';
import './DeveloperDashboard.css';

const DEV_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved (Pending QA)' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Reopened', label: 'Reopened' }
];

const DEV_SEVERITY_OPTIONS = [
  { value: 'All', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');

  // Ticket Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  // Selected Ticket for detail / resolution modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('http://localhost:5000/api/developer/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load developer stats:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('http://localhost:5000/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch assigned tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.user) {
          setUserName(res.data.user.full_name || '');
          setUserEmail(res.data.user.email || '');
          localStorage.setItem('userName', res.data.user.full_name || '');
          localStorage.setItem('userEmail', res.data.user.email || '');
        }
      } catch (e) {
        // silent
      }
    };

    fetchMe();
    fetchStats();
    fetchTickets();

    // Real-time synchronization for ticket locks and resolutions
    const socket = io('http://localhost:5000', {
      transports: ['polling', 'websocket'],
      reconnection: true,
      timeout: 5000
    });

    socket.on('ticket_lock_changed', (data) => {
      if (data?.ticketId) {
        setTickets((prev) =>
          prev.map((t) => {
            if (String(t.id) === String(data.ticketId)) {
              return {
                ...t,
                locked_by: data.locked_by,
                locked_by_id: data.locked_by_id,
                locked_at: data.locked_at,
                status: data.status || t.status
              };
            }
            return t;
          })
        );
      }
    });

    socket.on('ticket_updated', (updatedTicket) => {
      if (updatedTicket?.id) {
        setTickets((prev) =>
          prev.map((t) => (String(t.id) === String(updatedTicket.id) ? { ...t, ...updatedTicket } : t))
        );
        fetchStats();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Developer');

  const assignedProjects = stats?.projects || [];

  const getTicketProjectKey = (ticket) => {
    if (ticket.project_id) return `id-${ticket.project_id}`;
    if (ticket.project_code && ticket.project_code.toLowerCase() !== 'general') {
      return `code-${ticket.project_code.trim().toLowerCase()}`;
    }
    return 'general';
  };

  const projectFolderTabs = useMemo(() => {
    const map = new Map();
    assignedProjects.forEach((p) => {
      const key = `id-${p.id}`;
      map.set(key, {
        key,
        projectId: p.id,
        name: p.name || p.project_code || 'Project',
        code: p.project_code || 'N/A',
        count: 0
      });
    });

    tickets.forEach((t) => {
      const key = getTicketProjectKey(t);
      if (!map.has(key)) {
        map.set(key, {
          key,
          projectId: t.project_id || null,
          name: t.project_name || (key === 'general' ? 'General Tickets' : t.project_code || 'Project'),
          code: t.project_code || 'General',
          count: 0
        });
      }
      map.get(key).count += 1;
    });

    return Array.from(map.values());
  }, [assignedProjects, tickets]);

  const devProjectOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Projects' },
      ...projectFolderTabs.map((pf) => ({
        value: pf.key,
        label: `${pf.name} (${pf.code})`
      }))
    ];
  }, [projectFolderTabs]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.ticket_code?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.test_case_id?.toLowerCase().includes(q) ||
        t.module?.toLowerCase().includes(q) ||
        t.project_name?.toLowerCase().includes(q) ||
        t.project_code?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesSeverity = severityFilter === 'All' || t.severity === severityFilter;
      const matchesProj = projectFilter === 'All' || getTicketProjectKey(t) === projectFilter;

      return matchesSearch && matchesStatus && matchesSeverity && matchesProj;
    });
  }, [tickets, searchQuery, statusFilter, severityFilter, projectFilter]);

  const summary = stats?.summary || {
    totalAssignedProjects: 0,
    totalAssignedTickets: tickets.length,
    openTickets: tickets.filter((t) => t.status === 'Open').length,
    inProgressTickets: tickets.filter((t) => t.status === 'In Progress').length,
    resolvedTickets: tickets.filter((t) => t.status === 'Resolved').length,
    closedTickets: tickets.filter((t) => t.status === 'Closed').length,
    reopenedTickets: tickets.filter((t) => t.status === 'Reopened').length
  };

  return (
    <div className="admin-layout">
      {/* Sign Out Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your developer credentials.</p>
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

      {/* Role-Specific Sidebar */}
      <RoleSidebar
        roleName="Developer"
        homeRoute="/developer"
        onLogout={() => setShowLogoutModal(true)}
      />

      <main className="main-content">
        {/* Developer Dashboard Container */}
        <div className="dev-container">
          {/* Welcome Banner */}
          <section className="dev-welcome-banner">
            <div className="dev-welcome-content">
              <div className="dev-eyebrow">
                <Code2 size={13} /> Developer Engineering Console
              </div>
              <h1>Welcome back, Developer {displayName}!</h1>
              <p>
                Inspect assigned defect tickets raised from failed QA test executions, investigate root causes, apply code fixes, and submit resolution reports for verification.
              </p>
              <div className="dev-welcome-meta">
                <span className="dev-meta-pill live">
                  <span className="dev-live-dot" /> Online
                </span>
                <span className="dev-meta-pill">Assigned Projects: {summary.totalAssignedProjects}</span>
                <span className="dev-meta-pill">Active Tickets: {summary.openTickets + summary.inProgressTickets + summary.reopenedTickets}</span>
              </div>
            </div>
          </section>

          {/* Metric Summary Cards Grid */}
          <div className="dev-metrics-grid">
            <div className="dev-metric-card primary">
              <div className="dev-mc-top">
                <span className="dev-mc-label">Assigned Projects</span>
                <div className="dev-mc-icon"><FolderKanban size={18} color="#2563EB" /></div>
              </div>
              <div className="dev-mc-val">{summary.totalAssignedProjects}</div>
              <div className="dev-mc-sub">Assigned by Project Leads</div>
            </div>

            <div className="dev-metric-card warning">
              <div className="dev-mc-top">
                <span className="dev-mc-label">Assigned Defects</span>
                <div className="dev-mc-icon"><Ticket size={18} color="#D97706" /></div>
              </div>
              <div className="dev-mc-val">{summary.totalAssignedTickets}</div>
              <div className="dev-mc-sub amber">{summary.openTickets} Open &bull; {summary.reopenedTickets} Reopened</div>
            </div>

            <div className="dev-metric-card info">
              <div className="dev-mc-top">
                <span className="dev-mc-label">In Progress</span>
                <div className="dev-mc-icon"><Clock size={18} color="#0284C7" /></div>
              </div>
              <div className="dev-mc-val">{summary.inProgressTickets}</div>
              <div className="dev-mc-sub blue">Under active investigation</div>
            </div>

            <div className="dev-metric-card success">
              <div className="dev-mc-top">
                <span className="dev-mc-label">Resolved (Pending QA)</span>
                <div className="dev-mc-icon"><CheckCircle2 size={18} color="#16A34A" /></div>
              </div>
              <div className="dev-mc-val">{summary.resolvedTickets}</div>
              <div className="dev-mc-sub green">{summary.closedTickets} Verified & Closed</div>
            </div>
          </div>

          {/* Section A: Assigned Projects */}
          {assignedProjects.length > 0 && (
            <section className="dev-section">
              <div className="dev-section-header">
                <div>
                  <h2>My Assigned Projects</h2>
                  <p>Select a project folder to filter your bug tickets below, or open its dedicated Ticket Folder workspace.</p>
                </div>
              </div>
              <div className="dev-projects-grid">
                {assignedProjects.map((proj) => {
                  const projKey = `id-${proj.id}`;
                  const isSelected = projectFilter === projKey;
                  const projTickets = tickets.filter((t) => getTicketProjectKey(t) === projKey);

                  return (
                    <div
                      key={proj.id}
                      className={`dev-proj-card ${isSelected ? 'is-selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setProjectFilter((prev) => (prev === projKey ? 'All' : projKey))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setProjectFilter((prev) => (prev === projKey ? 'All' : projKey));
                        }
                      }}
                    >
                      <div className="dev-proj-top">
                        <span className="dev-proj-code" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isSelected ? <FolderOpen size={12} /> : <Folder size={12} />}
                          {proj.project_code}
                        </span>
                        <span className={`dev-badge ${(proj.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                          {proj.status || 'Active'}
                        </span>
                      </div>
                      <h4>{proj.name}</h4>
                      <div className="dev-proj-lead-info">
                        <span>Project Lead:</span>
                        <strong>{proj.project_lead_name || proj.lead_name || 'Unassigned'}</strong>
                      </div>
                      <div className="dev-proj-card-footer">
                        <span className="dev-proj-ticket-count">
                          <Ticket size={12} /> {projTickets.length} Ticket{projTickets.length === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          className="dev-proj-open-folder-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/tickets?projectId=${proj.id}`);
                          }}
                        >
                          <FolderOpen size={12} />
                          <span>Open Folder</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section B: Assigned Bug Tickets Queue */}
          <section className="dev-section">
            <div className="dev-section-header">
              <div>
                <h2>My Assigned Bug Tickets</h2>
                <p>
                  Defects organized by project folder. Select a project folder tab or open any ticket to review steps and submit your resolution.
                </p>
              </div>
              <div className="dev-ticket-count-pill">{filteredTickets.length} Tickets</div>
            </div>

            {/* Project Folder Tabs */}
            {projectFolderTabs.length > 0 && (
              <div className="dev-folder-tabs" role="tablist" aria-label="Filter tickets by project folder">
                <button
                  type="button"
                  role="tab"
                  aria-selected={projectFilter === 'All'}
                  className={`dev-folder-tab ${projectFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setProjectFilter('All')}
                >
                  <Folder size={14} />
                  <span>All Project Folders</span>
                  <span className="dev-folder-tab-count">{tickets.length}</span>
                </button>
                {projectFolderTabs.map((pf) => {
                  const isActive = projectFilter === pf.key;
                  return (
                    <button
                      key={pf.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`dev-folder-tab ${isActive ? 'active' : ''}`}
                      onClick={() => setProjectFilter(isActive ? 'All' : pf.key)}
                    >
                      {isActive ? <FolderOpen size={14} /> : <Folder size={14} />}
                      <span>{pf.name}</span>
                      <span className="dev-folder-tab-code">{pf.code}</span>
                      <span className="dev-folder-tab-count">{pf.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter Bar */}
            <div className="dev-filters-bar">
              <div className="dev-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by ticket ID, defect title, module, test case, project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="dev-filter-selects" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={DEV_STATUS_OPTIONS}
                  variant="filter"
                  placeholder="All Statuses"
                />

                <CustomSelect
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={DEV_SEVERITY_OPTIONS}
                  variant="filter"
                  placeholder="All Severities"
                />

                {projectFolderTabs.length > 1 && (
                  <CustomSelect
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={devProjectOptions}
                    variant="filter"
                    placeholder="All Projects"
                  />
                )}
              </div>
            </div>

            {/* Tickets Table */}
            {filteredTickets.length === 0 ? (
              <div className="dev-empty-card">
                <Ticket size={36} color="#94A3B8" />
                <h3>No Defect Tickets Assigned</h3>
                <p>
                  {searchQuery || statusFilter !== 'All' || severityFilter !== 'All'
                    ? 'No tickets match the selected filters.'
                    : 'You currently have no bug tickets assigned. When a QA or Project Lead assigns a defect to you, it will appear here.'}
                </p>
              </div>
            ) : (
              <div className="dev-table-wrap">
                <table className="dev-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Project</th>
                      <th>Defect Title & Module</th>
                      <th>Test Case ID</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Raised By</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket) => {
                      const isPendingFix = ticket.status === 'Open' || ticket.status === 'In Progress' || ticket.status === 'Reopened';
                      return (
                        <tr key={ticket.id}>
                          <td>
                            <span className="dev-ticket-code-tag">{ticket.ticket_code}</span>
                          </td>
                          <td>
                            <div className="dev-ticket-proj-stack">
                              <span className="dev-ticket-proj-name">{ticket.project_name || 'General'}</span>
                              {ticket.project_code && (
                                <span className="dev-ticket-proj-code">{ticket.project_code}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="dev-ticket-title-col">
                              <strong>{ticket.title}</strong>
                              <span>{ticket.module || 'General'} {ticket.sub_module ? `· ${ticket.sub_module}` : ''}</span>
                            </div>
                          </td>
                          <td>
                            <span className="dev-tc-pill">{ticket.test_case_id || 'TC-GEN'}</span>
                          </td>
                          <td>
                            <span className={`dev-sev-badge ${(ticket.severity || 'medium').toLowerCase()}`}>
                              {ticket.severity || 'Medium'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`dev-status-badge ${(ticket.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                {ticket.status}
                              </span>
                              {ticket.locked_by && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10.5px',
                                    fontWeight: '600',
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    borderRadius: '4px',
                                    padding: '1px 6px',
                                    width: 'fit-content'
                                  }}
                                  title={`Locked by ${ticket.locked_by}`}
                                >
                                  <Lock size={10} /> {ticket.locked_by}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="dev-raised-by">{ticket.raised_by || 'QA Member'}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className={`dev-btn-action-ticket ${isPendingFix ? 'action-work' : 'action-view'}`}
                              onClick={() => setSelectedTicketId(ticket.id)}
                            >
                              <Eye size={13} />
                              <span>
                                {isPendingFix
                                  ? ticket.locked_by && ticket.locked_by.toLowerCase() !== displayName.toLowerCase()
                                    ? `Locked (${ticket.locked_by.split(' ')[0]})`
                                    : 'Work on Defect'
                                  : 'View Report'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Ticket Detail / Resolution Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          ticketId={selectedTicketId}
          userRole="Developer"
          onTicketUpdated={() => {
            fetchStats();
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
