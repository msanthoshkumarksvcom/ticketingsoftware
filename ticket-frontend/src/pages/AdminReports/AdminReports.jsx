import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  FolderKanban,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  AlertTriangle,
  Bug,
  CheckCheck,
  Clock,
  UserCheck,
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Calendar,
  History,
  Eye,
  CalendarDays
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import '../../styles/admin.css';
import './AdminReports.css';

export default function AdminReports() {
  const navigate = useNavigate();

  // Role and Identity
  const [userRole] = useState(() => localStorage.getItem('userRole') || 'Administrator');
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [userName] = useState(() => localStorage.getItem('userName') || '');

  // Strict RBAC: Only Manager, QA Lead, and QA Member can view QA Member execution report
  const canViewQAReport = useMemo(() => {
    const roleLower = userRole.toLowerCase();
    return ['manager', 'qa lead', 'qa member', 'super admin', 'admin', 'administrator'].includes(roleLower);
  }, [userRole]);

  // Exclusive Active Report State: 'projects' or 'qa'
  // When one report is opened, the other is automatically closed
  const [activeReport, setActiveReport] = useState('projects');

  // Daily Work Tracking Filter States for QA Members
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all', 'today', 'yesterday', '7days', '30days', 'custom'
  const [customDate, setCustomDate] = useState('');
  const [activeDailyLogMember, setActiveDailyLogMember] = useState(null);

  // Data States
  const [loading, setLoading] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [qaSearch, setQaSearch] = useState('');
  const [projectReports, setProjectReports] = useState([]);
  const [projectOverall, setProjectOverall] = useState(null);
  const [qaMembersReport, setQaMembersReport] = useState([]);
  const [qaOverall, setQaOverall] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch Reports Data with optional daily period filters
  const fetchReportsData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch project overview (Role-scoped by backend)
      const projPromise = axios.get('http://localhost:5000/api/admin/reports/project-overview', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Fetch QA performance with daily period filter (Strictly QA Members only, only if authorized)
      const qaParams = new URLSearchParams();
      if (selectedPeriod) qaParams.set('period', selectedPeriod);
      if (selectedPeriod === 'custom' && customDate) qaParams.set('date', customDate);

      const qaPromise = canViewQAReport
        ? axios
            .get(`http://localhost:5000/api/admin/reports/qa-execution?${qaParams.toString()}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            .catch((err) => {
              console.warn('QA execution report not accessible:', err.message);
              return { data: { qaMembers: [], summary: null } };
            })
        : Promise.resolve({ data: { qaMembers: [], summary: null } });

      const [projRes, qaRes] = await Promise.all([projPromise, qaPromise]);

      if (projRes.data) {
        setProjectReports(Array.isArray(projRes.data.projects) ? projRes.data.projects : []);
        setProjectOverall(projRes.data.overall || null);
      }

      if (qaRes.data) {
        // Filter safeguard: ensure QA Lead or Manager are strictly excluded
        const rawMembers = Array.isArray(qaRes.data.qaMembers) ? qaRes.data.qaMembers : [];
        const strictlyQAMembers = rawMembers.filter(
          (m) => (m.role || '').toLowerCase() === 'qa member'
        );
        setQaMembersReport(strictlyQAMembers);
        setQaOverall(qaRes.data.summary || null);

        // Update active daily log member modal if open
        if (activeDailyLogMember) {
          const updatedTarget = strictlyQAMembers.find((m) => m.id === activeDailyLogMember.id);
          if (updatedTarget) setActiveDailyLogMember(updatedTarget);
        }
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.clear();
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, canViewQAReport, selectedPeriod, customDate]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Member');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  // Exclusive Toggle Handler: Opening one report closes the other
  const handleToggleReport = (reportKey) => {
    setActiveReport((prev) => (prev === reportKey ? null : reportKey));
  };

  // Filtered Project List
  const filteredProjects = useMemo(() => {
    const q = projectSearch.toLowerCase().trim();
    if (!q) return projectReports;
    return projectReports.filter(
      (p) =>
        p.project_code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.lead_name?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
    );
  }, [projectReports, projectSearch]);

  // Filtered QA Members List (Strictly QA Members only)
  const filteredQAMembers = useMemo(() => {
    const q = qaSearch.toLowerCase().trim();
    if (!q) return qaMembersReport;
    return qaMembersReport.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q)
    );
  }, [qaMembersReport, qaSearch]);

  // CSV Export for Project Report
  const handleExportProjectCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = [
      'Project Code',
      'Project Name',
      'Project Lead',
      'Status',
      'Total Test Cases',
      'Passed',
      'Failed',
      'Recommendations',
      'Untested',
      'Pass Rate %',
      'Total Defect Tickets',
      'Open Defects',
      'In Progress',
      'Resolved Defects',
      'Closed Defects',
      'Resolved By (Developers)',
      'Closed By (QA)'
    ];

    const rows = filteredProjects.map((p) => {
      const resolvedByStr = (p.tickets.resolved_by_breakdown || [])
        .map((d) => `${d.developer_name} (${d.count})`)
        .join('; ');
      const closedByStr = (p.tickets.closed_by_breakdown || [])
        .map((q) => `${q.qa_name} (${q.count})`)
        .join('; ');

      return [
        `"${p.project_code || ''}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${p.lead_name || 'Unassigned'}"`,
        `"${p.status || 'Active'}"`,
        p.test_cases.total,
        p.test_cases.pass,
        p.test_cases.fail,
        p.test_cases.recommendation,
        p.test_cases.untested,
        `${p.test_cases.pass_rate}%`,
        p.tickets.total,
        p.tickets.open,
        p.tickets.in_progress,
        p.tickets.resolved,
        p.tickets.closed,
        `"${resolvedByStr}"`,
        `"${closedByStr}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Project_Quality_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for QA Member Report (Includes Daily & Period Metrics)
  const handleExportQACSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = [
      'QA Member Name',
      'Email',
      'Role',
      'Reporting Period',
      'Cases Tested (Period)',
      'Passed (Period)',
      'Failed (Period)',
      'Recommendations (Period)',
      'Pass Rate % (Period)',
      'Bugs Raised (Period)',
      'Today Tested',
      'Today Passed',
      'Today Bugs',
      'Lifetime Total Tested',
      'Last Active Date'
    ];

    const rows = filteredQAMembers.map((m) => [
      `"${m.full_name || ''}"`,
      `"${m.email || ''}"`,
      `"${m.role || 'QA Member'}"`,
      `"${selectedPeriod}"`,
      m.period_tested,
      m.period_pass,
      m.period_fail,
      m.period_rec,
      `${m.period_pass_rate}%`,
      m.period_bugs_raised,
      m.today_tested,
      m.today_pass,
      m.today_bugs,
      m.total_tested,
      `"${m.last_active_date || 'N/A'}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QA_Member_Daily_Work_Report_${selectedPeriod}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Specific Member's Day-by-Day Activity History
  const handleExportMemberDailyHistoryCSV = (qaMember) => {
    if (!qaMember) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const headers = [
      'Date',
      'QA Member Name',
      'Email',
      'Test Cases Executed',
      'Passed',
      'Failed',
      'Recommendations',
      'In Progress',
      'Pass Rate %',
      'Bugs Raised',
      'Critical Bugs',
      'Projects Worked'
    ];

    const rows = (qaMember.daily_work || []).map((d) => [
      `"${d.date}"`,
      `"${qaMember.full_name}"`,
      `"${qaMember.email}"`,
      d.cases_tested,
      d.pass_count,
      d.fail_count,
      d.recommendation_count,
      d.in_progress_count,
      `${d.pass_rate}%`,
      d.bugs_raised_count,
      d.critical_bugs_count,
      `"${(d.projects || []).join('; ')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QA_Daily_Log_${qaMember.full_name.replace(/\s+/g, '_')}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-layout">
      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}
        >
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon">
              <LogOut size={21} />
            </div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your credentials.</p>
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

      {/* Daily Activity History Modal for Specific QA Member */}
      {activeDailyLogMember && (
        <div
          className="daily-log-modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setActiveDailyLogMember(null)}
        >
          <div className="daily-log-modal-content" role="dialog" aria-modal="true">
            <div className="daily-modal-header">
              <div className="daily-modal-title-stack">
                <h3>Daily Work &amp; Execution Activity Log</h3>
                <p>Day-by-day record of test cases tested and bug tickets raised.</p>
              </div>
              <button
                type="button"
                className="daily-modal-close-btn"
                onClick={() => setActiveDailyLogMember(null)}
                title="Close daily log"
              >
                <X size={18} />
              </button>
            </div>

            <div className="daily-modal-body">
              <div className="daily-user-summary-bar">
                <div className="daily-user-left">
                  <div className="daily-user-avatar">
                    {activeDailyLogMember.full_name?.charAt(0).toUpperCase() || 'Q'}
                  </div>
                  <div className="daily-user-info">
                    <strong>{activeDailyLogMember.full_name}</strong>
                    <span>{activeDailyLogMember.email} &bull; {activeDailyLogMember.department}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="today-chip tested">
                    <strong>{activeDailyLogMember.total_tested}</strong> Lifetime Tested
                  </span>
                  <span className="today-chip passed">
                    <strong>{activeDailyLogMember.pass_rate}%</strong> Pass Rate
                  </span>
                  <span className="today-chip bugs">
                    <strong>{activeDailyLogMember.bugs_raised_count}</strong> Bugs
                  </span>
                </div>
              </div>

              <div className="daily-table-container">
                {(!activeDailyLogMember.daily_work || activeDailyLogMember.daily_work.length === 0) ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                    <Calendar size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0 }}>No daily execution history recorded yet for this QA Member.</p>
                  </div>
                ) : (
                  <table className="daily-log-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Cases Tested</th>
                        <th>Execution Breakdown</th>
                        <th>Pass Rate %</th>
                        <th>Bugs Raised</th>
                        <th>Projects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDailyLogMember.daily_work.map((dw) => {
                        const isToday = dw.date === new Date().toISOString().split('T')[0];
                        const dwPassTier = dw.pass_rate >= 80 ? 'high' : dw.pass_rate >= 60 ? 'medium' : 'low';
                        const total = dw.cases_tested || 0;
                        const passPct = total > 0 ? (dw.pass_count / total) * 100 : 0;
                        const failPct = total > 0 ? (dw.fail_count / total) * 100 : 0;
                        const recPct = total > 0 ? (dw.recommendation_count / total) * 100 : 0;

                        return (
                          <tr key={dw.date} style={isToday ? { background: '#F0FDF4' } : {}}>
                            <td>
                              <span className="daily-date-cell">
                                <Calendar size={13} color={isToday ? '#16A34A' : '#64748B'} />
                                <span>{dw.date}</span>
                                {isToday && (
                                  <span style={{ fontSize: '0.68rem', background: '#DCFCE7', color: '#15803D', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                                    Today
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>
                              <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{dw.cases_tested}</strong>
                            </td>
                            <td>
                              <div style={{ minWidth: '150px' }}>
                                <div className="segmented-progress-track" style={{ height: '6px', marginBottom: '4px' }}>
                                  {passPct > 0 && <div className="seg-slice seg-pass" style={{ width: `${passPct}%` }} />}
                                  {failPct > 0 && <div className="seg-slice seg-fail" style={{ width: `${failPct}%` }} />}
                                  {recPct > 0 && <div className="seg-slice seg-rec" style={{ width: `${recPct}%` }} />}
                                </div>
                                <div className="segmented-legend-row" style={{ fontSize: '0.7rem' }}>
                                  <span className="legend-stat"><span className="legend-dot dot-pass" /> {dw.pass_count} Pass</span>
                                  {dw.fail_count > 0 && <span className="legend-stat stat-fail"><span className="legend-dot dot-fail" /> {dw.fail_count} Fail</span>}
                                  {dw.recommendation_count > 0 && <span className="legend-stat stat-rec"><span className="legend-dot dot-rec" /> {dw.recommendation_count} Rec</span>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`pass-rate-pill rate-${dwPassTier}`} style={{ fontSize: '0.74rem', padding: '2px 8px' }}>
                                {dw.pass_rate}%
                              </span>
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '700', color: dw.bugs_raised_count > 0 ? '#DC2626' : '#64748B' }}>
                                <Bug size={12} /> {dw.bugs_raised_count}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(dw.projects || []).map((prj, pIdx) => (
                                  <span key={pIdx} className="qa-proj-chip" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                                    {prj}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="daily-modal-footer">
              <button
                type="button"
                className="report-btn-export"
                onClick={() => handleExportMemberDailyHistoryCSV(activeDailyLogMember)}
              >
                <Download size={13} />
                <span>Export Member Daily History CSV</span>
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={() => setActiveDailyLogMember(null)}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role-Based Sidebar Navigation */}
      <RoleSidebar roleName={userRole} onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Viewport */}
      <main className="main-content">
        {/* Top Header Navbar */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">&gt;</span>
            <strong>Quality &amp; Defect Analytics</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchReportsData}
              title="Refresh reports data"
              aria-label="Refresh data"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar" style={{ background: '#EFF6FF', color: '#1E3A8A' }}>
                {avatarLabel}
              </div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{userRole}</span>
              </div>
              <ChevronDown size={14} className="profile-chevron" />
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="dashboard-container">
          <div className="reports-layout">
            {/* Executive Summary Header */}
            <div className="reports-header-card">
              <div className="reports-header-text">
                <h2>Quality Assurance &amp; Defect Resolution Reports</h2>
                <p>
                  Executive metrics covering project test execution progress, defect resolutions, and QA daily performance.
                </p>
              </div>
              <div className="reports-header-meta">
                <span className="reports-live-badge">
                  <span className="reports-pulse-dot" /> Live Data Synced
                </span>
              </div>
            </div>

            {/* Top Workspace KPI Grid */}
            <div className="reports-kpi-grid">
              <div className="report-kpi-card">
                <div className="report-kpi-header">
                  <span className="report-kpi-title">Monitored Projects</span>
                  <div className="report-kpi-icon">
                    <FolderKanban size={17} />
                  </div>
                </div>
                <span className="report-kpi-val">{projectOverall?.total_projects || projectReports.length}</span>
                <span className="report-kpi-sub">
                  <span style={{ color: '#10B981', fontWeight: '700' }}>Active Tracks</span>
                </span>
              </div>

              <div className="report-kpi-card kpi-success">
                <div className="report-kpi-header">
                  <span className="report-kpi-title">Total Test Cases</span>
                  <div className="report-kpi-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <CheckCheck size={17} />
                  </div>
                </div>
                <span className="report-kpi-val">{projectOverall?.total_test_cases || 0}</span>
                <span className="report-kpi-sub">
                  <strong style={{ color: '#10B981' }}>{projectOverall?.total_passed || 0} Passed</strong> &bull;{' '}
                  {projectOverall?.total_failed || 0} Failed
                </span>
              </div>

              <div className="report-kpi-card kpi-amber">
                <div className="report-kpi-header">
                  <span className="report-kpi-title">Global Pass Rate</span>
                  <div className="report-kpi-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                    <TrendingUp size={17} />
                  </div>
                </div>
                <span
                  className="report-kpi-val"
                  style={{
                    color: (projectOverall?.global_pass_rate || 0) >= 80 ? '#059669' : '#D97706'
                  }}
                >
                  {projectOverall?.global_pass_rate || 0}%
                </span>
                <span className="report-kpi-sub">Evaluated test execution accuracy</span>
              </div>

              <div className="report-kpi-card kpi-purple">
                <div className="report-kpi-header">
                  <span className="report-kpi-title">Defects Resolved</span>
                  <div className="report-kpi-icon" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                    <Bug size={17} />
                  </div>
                </div>
                <span className="report-kpi-val">
                  {(projectOverall?.total_resolved || 0) + (projectOverall?.total_closed || 0)}
                  <span style={{ fontSize: '1.05rem', color: '#64748B', fontWeight: '500' }}>
                    {' '}
                    / {projectOverall?.total_tickets || 0}
                  </span>
                </span>
                <span className="report-kpi-sub">
                  <strong>{projectOverall?.global_resolution_rate || 0}%</strong> fixed by dev team
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW SELECTOR SWITCHER (Direct One-Click Navigation)     */}
            {/* Opening one report closes the other report below/above   */}
            {/* ======================================================== */}
            <div className="reports-view-selector-bar">
              <div className="reports-tab-group">
                <button
                  type="button"
                  className={`report-nav-tab ${activeReport === 'projects' ? 'active' : ''}`}
                  onClick={() => handleToggleReport('projects')}
                >
                  <FolderKanban size={16} />
                  <span>Projects Quality Overview</span>
                  <span className="tab-count-pill">{projectReports.length}</span>
                </button>

                {canViewQAReport && (
                  <button
                    type="button"
                    className={`report-nav-tab ${activeReport === 'qa' ? 'active' : ''}`}
                    onClick={() => handleToggleReport('qa')}
                  >
                    <UsersRound size={16} />
                    <span>QA Members Performance</span>
                    <span className="tab-count-pill">{qaMembersReport.length}</span>
                  </button>
                )}
              </div>

              <div className="reports-view-hint">
                <Sparkles size={14} color="#3B82F6" />
                <span>Clicking a report opens it and closes the other view</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* REPORT 1: PROJECT-WISE QUALITY & DEFECT OVERVIEW         */}
            {/* Collapsible card: opening this closes Report 2 below     */}
            {/* ======================================================== */}
            <div className={`report-accordion-card ${activeReport === 'projects' ? 'is-expanded' : ''}`}>
              <div
                className="report-accordion-header"
                onClick={() => handleToggleReport('projects')}
                role="button"
                tabIndex={0}
                aria-expanded={activeReport === 'projects'}
              >
                <div className="report-accordion-title-side">
                  <div className="accordion-icon-box">
                    <FolderKanban size={18} />
                  </div>
                  <div className="accordion-title-text">
                    <h3>
                      Project-Wise Quality &amp; Defect Overview
                      <span className="accordion-badge">{filteredProjects.length} Projects</span>
                    </h3>
                    <p>Aggregated test cases, execution progress bar, defect tickets, and developer resolutions.</p>
                  </div>
                </div>

                <div className="report-accordion-meta-side">
                  {projectOverall && (
                    <span className="accordion-quick-stat">
                      <CheckCheck size={14} color="#10B981" />
                      <span>
                        {projectOverall.total_test_cases} Cases &bull; {projectOverall.global_pass_rate}% Pass Rate
                      </span>
                    </span>
                  )}
                  <div className="accordion-chevron-circle">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {activeReport === 'projects' && (
                <div className="report-accordion-body">
                  {/* Clean Search & Export Toolbar */}
                  <div className="report-toolbar-row">
                    <div className="report-search-box">
                      <Search size={15} color="#94A3B8" />
                      <input
                        type="text"
                        placeholder="Search project code, name, lead..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                      {projectSearch && (
                        <button
                          type="button"
                          className="report-search-clear"
                          onClick={() => setProjectSearch('')}
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="report-actions-group">
                      <button
                        type="button"
                        className="report-btn-export"
                        onClick={handleExportProjectCSV}
                      >
                        <Download size={14} />
                        <span>Export Projects CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Modern Table (No Clutter, Segmented Progress Bars) */}
                  <div className="report-table-container">
                    {filteredProjects.length === 0 ? (
                      <div className="report-empty-state">
                        <FolderKanban size={36} color="#94A3B8" />
                        <h4>No Projects Found</h4>
                        <p>
                          {projectSearch
                            ? 'No projects match your search keywords.'
                            : 'No projects have been assigned or configured in your workspace.'}
                        </p>
                      </div>
                    ) : (
                      <table className="report-modern-table">
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Total Cases</th>
                            <th>Execution Progress</th>
                            <th>Pass Rate</th>
                            <th>Defect Tickets</th>
                            <th>Resolved By (Developers)</th>
                            <th>QA Sign-Off</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProjects.map((p) => {
                            const tc = p.test_cases;
                            const tk = p.tickets;
                            const total = tc.total || 0;
                            const passRateTier =
                              tc.pass_rate >= 80 ? 'high' : tc.pass_rate >= 60 ? 'medium' : 'low';

                            // Calculate progress bar slice widths (%)
                            const passPct = total > 0 ? (tc.pass / total) * 100 : 0;
                            const failPct = total > 0 ? (tc.fail / total) * 100 : 0;
                            const recPct = total > 0 ? ((tc.recommendation || 0) / total) * 100 : 0;
                            const inProgPct = total > 0 ? ((tc.in_progress || 0) / total) * 100 : 0;
                            const untestedPct = total > 0 ? ((tc.untested || 0) / total) * 100 : 0;

                            return (
                              <tr key={p.id}>
                                <td>
                                  <div className="proj-info-col">
                                    <span className="proj-code-tag">{p.project_code || `PRJ-${p.id}`}</span>
                                    <span className="proj-title-text">{p.name}</span>
                                    <span className="proj-lead-sub">
                                      Lead: {p.lead_name || 'Unassigned'}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <div className="volume-stat-col">
                                    <span className="volume-number">{total}</span>
                                    <span className="volume-subtext">
                                      {p.sheets_count} sheet{p.sheets_count !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <div className="segmented-progress-cell">
                                    {/* Sleek Segmented Progress Track */}
                                    <div className="segmented-progress-track">
                                      {passPct > 0 && (
                                        <div
                                          className="seg-slice seg-pass"
                                          style={{ width: `${passPct}%` }}
                                          title={`Passed: ${tc.pass}`}
                                        />
                                      )}
                                      {failPct > 0 && (
                                        <div
                                          className="seg-slice seg-fail"
                                          style={{ width: `${failPct}%` }}
                                          title={`Failed: ${tc.fail}`}
                                        />
                                      )}
                                      {recPct > 0 && (
                                        <div
                                          className="seg-slice seg-rec"
                                          style={{ width: `${recPct}%` }}
                                          title={`Recommendation: ${tc.recommendation}`}
                                        />
                                      )}
                                      {inProgPct > 0 && (
                                        <div
                                          className="seg-slice seg-prog"
                                          style={{ width: `${inProgPct}%` }}
                                          title={`In Progress: ${tc.in_progress}`}
                                        />
                                      )}
                                      {untestedPct > 0 && (
                                        <div
                                          className="seg-slice seg-untested"
                                          style={{ width: `${untestedPct}%` }}
                                          title={`Untested: ${tc.untested}`}
                                        />
                                      )}
                                    </div>

                                    {/* Clean Minimal Typography Legend */}
                                    <div className="segmented-legend-row">
                                      <span className="legend-stat">
                                        <span className="legend-dot dot-pass" />
                                        <span>{tc.pass} Pass</span>
                                      </span>
                                      {tc.fail > 0 && (
                                        <span className="legend-stat stat-fail">
                                          <span className="legend-dot dot-fail" />
                                          <span>{tc.fail} Fail</span>
                                        </span>
                                      )}
                                      {tc.recommendation > 0 && (
                                        <span className="legend-stat stat-rec">
                                          <span className="legend-dot dot-rec" />
                                          <span>{tc.recommendation} Rec</span>
                                        </span>
                                      )}
                                      {tc.untested > 0 && (
                                        <span className="legend-stat">
                                          <span className="legend-dot dot-untested" />
                                          <span>{tc.untested} Untested</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <span className={`pass-rate-pill rate-${passRateTier}`}>
                                    {tc.pass_rate}%
                                  </span>
                                </td>

                                <td>
                                  <div className="defect-summary-col">
                                    <span className="defect-count-pill">
                                      <Bug size={13} color="#DC2626" />
                                      <span>{tk.total} Raised</span>
                                    </span>
                                    <div className="defect-meta-breakdown">
                                      {tk.open > 0 ? (
                                        <span className="defect-open-highlight">{tk.open} Open</span>
                                      ) : (
                                        <span style={{ color: '#64748B' }}>0 Open</span>
                                      )}
                                      <span style={{ color: '#CBD5E1' }}>&bull;</span>
                                      <span style={{ color: '#059669', fontWeight: '600' }}>
                                        {tk.resolved + tk.closed} Fixed
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div className="dev-resolutions-col">
                                    {tk.resolved_by_breakdown && tk.resolved_by_breakdown.length > 0 ? (
                                      tk.resolved_by_breakdown.map((dev, idx) => (
                                        <span key={idx} className="dev-resolution-chip">
                                          <span className="dev-avatar-tiny">
                                            {dev.developer_name.charAt(0).toUpperCase()}
                                          </span>
                                          <span>{dev.developer_name}</span>
                                          <span className="dev-resolved-count">{dev.count}</span>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="cell-empty-dash">&mdash;</span>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  <div>
                                    {tk.closed > 0 ? (
                                      <span className="qa-verified-badge">
                                        <ShieldCheck size={13} color="#2563EB" />
                                        <span>{tk.closed} Verified</span>
                                      </span>
                                    ) : (
                                      <span className="qa-verified-badge none">Pending</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* REPORT 2: QA MEMBER TEST EXECUTION & DAILY WORK REPORT    */}
            {/* Visible ONLY to: Manager, QA Lead, QA Member             */}
            {/* Strictly EXCLUDES QA Lead from member rows               */}
            {/* Collapsible card: opening this closes Report 1 above     */}
            {/* ======================================================== */}
            {canViewQAReport && (
              <div className={`report-accordion-card ${activeReport === 'qa' ? 'is-expanded' : ''}`}>
                <div
                  className="report-accordion-header"
                  onClick={() => handleToggleReport('qa')}
                  role="button"
                  tabIndex={0}
                  aria-expanded={activeReport === 'qa'}
                >
                  <div className="report-accordion-title-side">
                    <div className="accordion-icon-box emerald">
                      <UsersRound size={18} />
                    </div>
                    <div className="accordion-title-text">
                      <h3>
                        QA Member Test Execution &amp; Daily Work Report
                        <span className="accordion-badge emerald">{filteredQAMembers.length} QA Members</span>
                      </h3>
                      <p>Track how much each QA member tested today and across daily reporting periods with activity logs.</p>
                    </div>
                  </div>

                  <div className="report-accordion-meta-side">
                    {qaOverall && (
                      <span className="accordion-quick-stat">
                        <Calendar size={14} color="#059669" />
                        <span>
                          <strong>{qaOverall.today_tests_executed || 0}</strong> Tested Today &bull;{' '}
                          <strong>{qaOverall.period_tests_executed || qaOverall.total_tests_executed || 0}</strong> in {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}
                        </span>
                      </span>
                    )}
                    <div className="accordion-chevron-circle">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                {activeReport === 'qa' && (
                  <div className="report-accordion-body">
                    {/* Daily Work Period Selector & Filter Bar */}
                    <div className="qa-daily-filter-card">
                      <div className="qa-period-tabs-bar">
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginRight: '4px' }}>
                          Reporting Period:
                        </span>
                        {[
                          { key: 'all', label: 'All Time' },
                          { key: 'today', label: "Today's Work" },
                          { key: 'yesterday', label: 'Yesterday' },
                          { key: '7days', label: 'Last 7 Days' },
                          { key: '30days', label: 'Last 30 Days' }
                        ].map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            className={`qa-period-btn ${selectedPeriod === t.key ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedPeriod(t.key);
                              setCustomDate('');
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="qa-date-picker-wrap">
                          <CalendarDays size={14} color="#64748B" />
                          <input
                            type="date"
                            value={customDate}
                            onChange={(e) => {
                              setCustomDate(e.target.value);
                              if (e.target.value) setSelectedPeriod('custom');
                            }}
                            title="Filter by specific date"
                          />
                        </div>
                        {selectedPeriod !== 'all' && (
                          <button
                            type="button"
                            className="qa-period-btn"
                            style={{ background: '#F1F5F9' }}
                            onClick={() => {
                              setSelectedPeriod('all');
                              setCustomDate('');
                            }}
                            title="Reset to All Time"
                          >
                            <RefreshCw size={12} /> Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Today Output Quick Banner */}
                    {qaOverall && (
                      <div className="qa-today-output-banner">
                        <div className="today-banner-left">
                          <div className="today-banner-icon">
                            <Clock size={16} />
                          </div>
                          <div className="today-banner-text">
                            <strong>Today&apos;s QA Team Work Output:</strong>
                            <span>Live execution metrics for {new Date().toISOString().split('T')[0]}</span>
                          </div>
                        </div>

                        <div className="today-banner-chips">
                          <span className="today-chip tested">
                            <CheckCheck size={12} /> {qaOverall.today_tests_executed || 0} Cases Executed Today
                          </span>
                          <span className="today-chip passed">
                            <CheckCircle2 size={12} /> {qaOverall.today_passed || 0} Passed Today
                          </span>
                          <span className="today-chip bugs">
                            <Bug size={12} /> {qaOverall.today_bugs_raised || 0} Bugs Raised Today
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Clean Search & Export Toolbar */}
                    <div className="report-toolbar-row">
                      <div className="report-search-box">
                        <Search size={15} color="#94A3B8" />
                        <input
                          type="text"
                          placeholder="Search QA member name, email..."
                          value={qaSearch}
                          onChange={(e) => setQaSearch(e.target.value)}
                        />
                        {qaSearch && (
                          <button
                            type="button"
                            className="report-search-clear"
                            onClick={() => setQaSearch('')}
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <div className="report-actions-group">
                        <button
                          type="button"
                          className="report-btn-export"
                          onClick={handleExportQACSV}
                        >
                          <Download size={14} />
                          <span>Export QA Work CSV ({selectedPeriod})</span>
                        </button>
                      </div>
                    </div>

                    {/* Modern QA Members Performance Table with Daily Work */}
                    <div className="report-table-container">
                      {filteredQAMembers.length === 0 ? (
                        <div className="report-empty-state">
                          <UsersRound size={36} color="#94A3B8" />
                          <h4>No QA Members Found</h4>
                          <p>No active QA Members match your search keyword.</p>
                        </div>
                      ) : (
                        <table className="report-modern-table">
                          <thead>
                            <tr>
                              <th>QA Member</th>
                              <th>
                                {selectedPeriod === 'all'
                                  ? 'Total Tested'
                                  : `Tested (${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'yesterday' ? 'Yesterday' : selectedPeriod})`}
                              </th>
                              <th>Execution Progress</th>
                              <th>Pass Rate %</th>
                              <th>Bugs Raised</th>
                              <th>Daily Activity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredQAMembers.map((qa) => {
                              // Display metrics for currently selected period (or lifetime if 'all')
                              const displayTested = selectedPeriod === 'all' ? qa.total_tested : (qa.period_tested || 0);
                              const displayPass = selectedPeriod === 'all' ? qa.pass_count : (qa.period_pass || 0);
                              const displayFail = selectedPeriod === 'all' ? qa.fail_count : (qa.period_fail || 0);
                              const displayRec = selectedPeriod === 'all' ? qa.recommendation_count : (qa.period_rec || 0);
                              const displayInProgress = selectedPeriod === 'all' ? qa.in_progress_count : (qa.period_in_progress || 0);
                              const displayUntested = selectedPeriod === 'all' ? qa.untested_count : (qa.period_untested || 0);
                              const displayRate = selectedPeriod === 'all' ? qa.pass_rate : (qa.period_pass_rate || 0);
                              const displayBugs = selectedPeriod === 'all' ? qa.bugs_raised_count : (qa.period_bugs_raised || 0);

                              const passRateTier = displayRate >= 80 ? 'high' : displayRate >= 60 ? 'medium' : 'low';
                              const avatar = qa.full_name ? qa.full_name.charAt(0).toUpperCase() : 'Q';
                              const total = displayTested || 0;

                              // Slice percentages
                              const passPct = total > 0 ? (displayPass / total) * 100 : 0;
                              const failPct = total > 0 ? (displayFail / total) * 100 : 0;
                              const recPct = total > 0 ? (displayRec / total) * 100 : 0;
                              const inProgPct = total > 0 ? (displayInProgress / total) * 100 : 0;
                              const untestedPct = total > 0 ? (displayUntested / total) * 100 : 0;

                              const isTodayActive = qa.last_active_date === new Date().toISOString().split('T')[0];

                              return (
                                <tr key={qa.id}>
                                  <td>
                                    <div className="qa-user-cell">
                                      <div className="qa-circle-avatar">{avatar}</div>
                                      <div className="qa-info-stack">
                                        <span className="qa-name-heading">
                                          {qa.full_name}
                                          <span className="qa-role-pill">QA Member</span>
                                        </span>
                                        <span className="qa-email-sub">{qa.email}</span>
                                        {qa.last_active_date && (
                                          <span className={`qa-last-active-tag ${isTodayActive ? 'today' : ''}`}>
                                            <Calendar size={10} />
                                            {isTodayActive ? 'Active Today' : `Last active: ${qa.last_active_date}`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="volume-stat-col">
                                      <span className="volume-number">{displayTested}</span>
                                      <span className="volume-subtext">
                                        Cases Tested
                                        {qa.today_tested > 0 && selectedPeriod === 'all' && (
                                          <span style={{ color: '#16A34A', fontWeight: '700', marginLeft: '4px' }}>
                                            (+{qa.today_tested} today)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </td>

                                  <td>
                                    <div className="segmented-progress-cell">
                                      {/* Sleek Progress Track */}
                                      <div className="segmented-progress-track">
                                        {passPct > 0 && (
                                          <div
                                            className="seg-slice seg-pass"
                                            style={{ width: `${passPct}%` }}
                                            title={`Passed: ${displayPass}`}
                                          />
                                        )}
                                        {failPct > 0 && (
                                          <div
                                            className="seg-slice seg-fail"
                                            style={{ width: `${failPct}%` }}
                                            title={`Failed: ${displayFail}`}
                                          />
                                        )}
                                        {recPct > 0 && (
                                          <div
                                            className="seg-slice seg-rec"
                                            style={{ width: `${recPct}%` }}
                                            title={`Recommendation: ${displayRec}`}
                                          />
                                        )}
                                        {inProgPct > 0 && (
                                          <div
                                            className="seg-slice seg-prog"
                                            style={{ width: `${inProgPct}%` }}
                                            title={`In Progress: ${displayInProgress}`}
                                          />
                                        )}
                                        {untestedPct > 0 && (
                                          <div
                                            className="seg-slice seg-untested"
                                            style={{ width: `${untestedPct}%` }}
                                            title={`Untested: ${displayUntested}`}
                                          />
                                        )}
                                      </div>

                                      {/* Clean Typography Legend */}
                                      <div className="segmented-legend-row">
                                        <span className="legend-stat">
                                          <span className="legend-dot dot-pass" />
                                          <span>{displayPass} Pass</span>
                                        </span>
                                        {displayFail > 0 && (
                                          <span className="legend-stat stat-fail">
                                            <span className="legend-dot dot-fail" />
                                            <span>{displayFail} Fail</span>
                                          </span>
                                        )}
                                        {displayRec > 0 && (
                                          <span className="legend-stat stat-rec">
                                            <span className="legend-dot dot-rec" />
                                            <span>{displayRec} Rec</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td>
                                    <span className={`pass-rate-pill rate-${passRateTier}`}>
                                      {displayRate}%
                                    </span>
                                  </td>

                                  <td>
                                    <div className="defect-summary-col">
                                      <span className="defect-count-pill">
                                        <Bug size={13} color="#DC2626" />
                                        <span>{displayBugs} Raised</span>
                                      </span>
                                      {qa.today_bugs > 0 && selectedPeriod === 'all' && (
                                        <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: '700' }}>
                                          +{qa.today_bugs} today
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      className="btn-view-daily-log"
                                      onClick={() => setActiveDailyLogMember(qa)}
                                      title="Open daily activity breakdown"
                                    >
                                      <History size={13} />
                                      <span>Daily Log ({qa.daily_work?.length || 0}d)</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
