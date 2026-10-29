import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckSquare,
  Bell,
  LogOut,
  ChevronDown,
  FolderKanban,
  Ticket,
  BarChart3,
  UsersRound,
  ArrowRight,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import '../../styles/admin.css';
import '../../styles/RoleDashboard.css';
import './QAMemberDashboard.css';

export default function QAMemberDashboard() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || 'QA Member');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || 'qamember@gmail.com');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || 'QA Member');

  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTickets: 0,
    totalUsers: 0,
    pendingApprovals: 0
  });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [meRes, statsRes, ticketsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        axios.get('http://localhost:5000/api/admin/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { totalProjects: 8, totalTickets: 25, totalUsers: 3, pendingApprovals: 0 } })),
        axios.get('http://localhost:5000/api/admin/tickets', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      if (meRes?.data?.user) {
        const u = meRes.data.user;
        setUserName(u.full_name || 'QA Member');
        setUserEmail(u.email || 'qamember@gmail.com');
        setUserRole(u.role || 'QA Member');
        localStorage.setItem('userName', u.full_name || 'QA Member');
        localStorage.setItem('userEmail', u.email || 'qamember@gmail.com');
        localStorage.setItem('userRole', u.role || 'QA Member');
      }

      if (statsRes?.data) {
        setStats({
          totalProjects: Number(statsRes.data.totalProjects) || 0,
          totalTickets: Number(statsRes.data.totalTickets) || 0,
          totalUsers: Number(statsRes.data.totalUsers) || 0,
          pendingApprovals: Number(statsRes.data.pendingApprovals) || 0
        });
      }

      if (Array.isArray(ticketsRes?.data)) {
        setTickets(ticketsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch QA Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    navigate('/', { replace: true });
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'QA Member');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        ticketSearch === '' ||
        t.title?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.ticket_code?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.project_code?.toLowerCase().includes(ticketSearch.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Open' && t.status === 'Open') ||
        (statusFilter === 'In Progress' && t.status === 'In Progress') ||
        (statusFilter === 'Resolved' && (t.status === 'Resolved' || t.status === 'Closed'));

      return matchesSearch && matchesStatus;
    });
  }, [tickets, ticketSearch, statusFilter]);

  // Open defects count
  const openDefectsCount = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  return (
    <div className="admin-layout">
      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}
        >
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon">
              <LogOut size={21} />
            </div>
            <h2 className="modal-title">Sign out of your QA workspace?</h2>
            <p className="modal-text">
              You can sign back in at any time with your QA Member credentials (qamember@gmail.com).
            </p>
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

      {/* Role-Specific Sidebar showing only the 6 allowed sections for QA Member */}
      <RoleSidebar
        roleName="QA Member"
        homeRoute="/qa-member"
        onLogout={() => setShowLogoutModal(true)}
      />

      <main className="main-content">
        {/* Top Header */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>QA Member Dashboard</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchData}
              title="Refresh dashboard data"
              aria-label="Refresh data"
            >
              <RefreshCw size={17} className={loading ? 'refresh-spinning' : ''} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar" style={{ background: '#059669', color: '#ffffff' }}>
                {avatarLabel}
              </div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">QA Member</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="role-dashboard-container">
          <div className="qa-dashboard-layout">
            {/* Welcome Banner */}
            <section
              className="role-welcome-card"
              style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)' }}
            >
              <div className="role-welcome-content">
                <div
                  className="role-eyebrow"
                  style={{
                    color: '#6ee7b7',
                    background: 'rgba(110, 231, 183, 0.12)',
                    borderColor: 'rgba(110, 231, 183, 0.2)'
                  }}
                >
                  <CheckSquare size={13} /> QA Testing Workspace &bull; Quality Management System
                </div>
                <h1>Welcome, QA Member {displayName}!</h1>
                <p>
                  Your QA Member console is active. You have tailored access to view test projects,
                  report bug tickets, review quality metrics, and inspect the team directory.
                </p>
                <div className="role-meta-row">
                  <span className="role-status-live">
                    <span className="role-live-dot" /> Online
                  </span>
                  <span className="role-badge-pill">Role: QA Member</span>
                  <span className="role-badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                    Access: Projects &bull; Tickets &bull; Reports &bull; Users &bull; Settings
                  </span>
                  <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <div
                className="role-card-glow"
                style={{ background: 'radial-gradient(circle, rgba(5, 150, 105, 0.3) 0%, rgba(5, 150, 105, 0) 70%)' }}
              />
            </section>

            {/* 4 Metric KPI Cards */}
            <section className="qa-stats-grid">
              <div className="qa-stat-card" onClick={() => navigate('/admin/projects')}>
                <div className="qa-stat-icon-wrap qa-icon-blue">
                  <FolderKanban size={22} />
                </div>
                <div className="qa-stat-info">
                  <span className="qa-stat-value">{loading ? '—' : stats.totalProjects}</span>
                  <span className="qa-stat-label">Assigned Projects</span>
                </div>
              </div>

              <div className="qa-stat-card" onClick={() => navigate('/admin/tickets')}>
                <div className="qa-stat-icon-wrap qa-icon-emerald">
                  <Ticket size={22} />
                </div>
                <div className="qa-stat-info">
                  <span className="qa-stat-value">{loading ? '—' : stats.totalTickets}</span>
                  <span className="qa-stat-label">Total QA Tickets</span>
                </div>
              </div>

              <div className="qa-stat-card" onClick={() => navigate('/admin/tickets')}>
                <div className="qa-stat-icon-wrap qa-icon-amber">
                  <AlertCircle size={22} />
                </div>
                <div className="qa-stat-info">
                  <span className="qa-stat-value">{loading ? '—' : openDefectsCount}</span>
                  <span className="qa-stat-label">Active / Open Defects</span>
                </div>
              </div>

              <div className="qa-stat-card" onClick={() => navigate('/admin/users')}>
                <div className="qa-stat-icon-wrap qa-icon-purple">
                  <UsersRound size={22} />
                </div>
                <div className="qa-stat-info">
                  <span className="qa-stat-value">{loading ? '—' : stats.totalUsers}</span>
                  <span className="qa-stat-label">Workspace Team Members</span>
                </div>
              </div>
            </section>

            {/* Quick Access QA Action Hub */}
            <section>
              <div className="qa-section-title-row">
                <span className="qa-section-title">
                  <CheckCircle2 size={18} color="#059669" />
                  QA Member Action Hub
                </span>
                <span className="qa-section-badge">6 Authorized Sections</span>
              </div>

              <div className="qa-action-grid">
                {/* 1. Projects */}
                <div className="qa-action-card">
                  <div className="qa-action-card-header">
                    <div className="qa-action-icon qa-icon-blue">
                      <FolderKanban size={20} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>PRJ-VIEW</span>
                  </div>
                  <h3>Projects &amp; Test Suites</h3>
                  <p>Inspect project details, test execution suites, and view spreadsheet sheets.</p>
                  <button className="qa-action-btn" onClick={() => navigate('/admin/projects')}>
                    <span>Open Projects</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* 2. Tickets */}
                <div className="qa-action-card">
                  <div className="qa-action-card-header">
                    <div className="qa-action-icon qa-icon-emerald">
                      <Ticket size={20} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>TCK-LOG</span>
                  </div>
                  <h3>Defects &amp; Tickets</h3>
                  <p>Log bug reports, update ticket test verification statuses, and triage defects.</p>
                  <button className="qa-action-btn" onClick={() => navigate('/admin/tickets')}>
                    <span>Manage Tickets</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* 3. Reports */}
                <div className="qa-action-card">
                  <div className="qa-action-card-header">
                    <div className="qa-action-icon qa-icon-amber">
                      <BarChart3 size={20} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>QA-METRICS</span>
                  </div>
                  <h3>Quality Reports</h3>
                  <p>Analyze test coverage, defect distribution by priority, and project health.</p>
                  <button className="qa-action-btn" onClick={() => navigate('/admin/reports')}>
                    <span>View Reports</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* 4. Users Directory */}
                <div className="qa-action-card">
                  <div className="qa-action-card-header">
                    <div className="qa-action-icon qa-icon-purple">
                      <UsersRound size={20} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>TEAM-DIR</span>
                  </div>
                  <h3>Team Directory</h3>
                  <p>View team member details, assigned developers, project leads, and departments.</p>
                  <button className="qa-action-btn" onClick={() => navigate('/admin/users')}>
                    <span>Open Directory</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </section>

            {/* Live Testing & Defect Queue */}
            <section className="qa-card-box">
              <div className="qa-card-box-header">
                <h2>
                  <Ticket size={18} color="#059669" />
                  Active QA Defect &amp; Ticket Queue
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Search box */}
                  <div className="qa-table-search">
                    <Search size={15} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search ticket code, title..."
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                    />
                  </div>

                  {/* Status filter tabs */}
                  <div className="qa-filter-tabs">
                    {['All', 'Open', 'In Progress', 'Resolved'].map((st) => (
                      <button
                        key={st}
                        className={`qa-tab-btn ${statusFilter === st ? 'active' : ''}`}
                        onClick={() => setStatusFilter(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <button
                    className="qa-action-btn"
                    style={{ width: 'auto', padding: '6px 12px' }}
                    onClick={() => navigate('/admin/tickets')}
                  >
                    <span>Full Tickets View</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              <div className="qa-table-responsive">
                <table className="qa-tickets-table">
                  <thead>
                    <tr>
                      <th>Ticket Code</th>
                      <th>Title</th>
                      <th>Project</th>
                      <th>Priority</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No defect tickets matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.slice(0, 7).map((ticket) => {
                        const priClass = `qa-pill-${ticket.priority?.toLowerCase() || 'medium'}`;
                        const statusClass = `qa-pill-${ticket.status?.toLowerCase().replace(/\s+/g, '-') || 'open'}`;

                        return (
                          <tr key={ticket.id}>
                            <td>
                              <span className="qa-ticket-code">{ticket.ticket_code || `TCK-${ticket.id}`}</span>
                            </td>
                            <td>
                              <div className="qa-ticket-title" title={ticket.title}>
                                {ticket.title}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: '500', color: '#475569' }}>
                                {ticket.project_code || 'PRJ-QA-01'}
                              </span>
                            </td>
                            <td>
                              <span className={`qa-pill ${priClass}`}>
                                {ticket.priority || 'Medium'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {ticket.type || 'Bug'}
                              </span>
                            </td>
                            <td>
                              <span className={`qa-pill ${statusClass}`}>
                                {ticket.status || 'Open'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: '500' }}>
                                {ticket.assigned_to || 'Unassigned'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="qa-action-btn"
                                style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => navigate('/admin/tickets')}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* QA Testing Lifecycle Pipeline */}
            <section className="qa-pipeline-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="qa-section-title">
                  <ShieldCheck size={18} color="#059669" />
                  Standard Quality Assurance Lifecycle
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                  Standard QA Member Operating Procedure
                </span>
              </div>

              <div className="qa-pipeline-steps">
                <div className="qa-step-item">
                  <div className="qa-step-number">1</div>
                  <div className="qa-step-title">Test Planning &amp; Suites</div>
                  <div className="qa-step-desc">
                    Review specifications and requirements under assigned projects.
                  </div>
                </div>

                <div className="qa-step-item">
                  <div className="qa-step-number">2</div>
                  <div className="qa-step-title">Execution &amp; Sheets</div>
                  <div className="qa-step-desc">
                    Execute manual and automated test cases via project sheets.
                  </div>
                </div>

                <div className="qa-step-item">
                  <div className="qa-step-number">3</div>
                  <div className="qa-step-title">Defect Logging &amp; Triage</div>
                  <div className="qa-step-desc">
                    Capture reproduction steps and log bugs with accurate severity.
                  </div>
                </div>

                <div className="qa-step-item">
                  <div className="qa-step-number">4</div>
                  <div className="qa-step-title">Fix Verification &amp; Reports</div>
                  <div className="qa-step-desc">
                    Verify developer fixes, close verified issues, and review reports.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
