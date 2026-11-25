import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  CheckCircle2,
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
  Calendar,
  History,
  Eye,
  CalendarDays
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import { formatIndianDate } from '../../utils/dateFormat';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import './AdminReports.css';

export default function AdminReports() {
  const navigate = useNavigate();

  // Role and Identity
  const [userRole] = useState(() => localStorage.getItem('userRole') || 'Administrator');

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
  const fetchReportsData = useCallback(async ({ silent = false } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) setLoading(true);
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
        let strictlyQAMembers = rawMembers.filter(
          (m) => (m.role || '').toLowerCase() === 'qa member'
        );

        // If logged in as a QA Member, show ONLY their own report
        if (userRole.toLowerCase() === 'qa member') {
          const currentUserId = localStorage.getItem('userId');
          const currentUserEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
          strictlyQAMembers = strictlyQAMembers.filter(
            (m) =>
              (currentUserId && String(m.id) === String(currentUserId)) ||
              (currentUserEmail && (m.email || '').toLowerCase().trim() === currentUserEmail)
          );
        }

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
      if (!silent) setLoading(false);
    }
  }, [navigate, canViewQAReport, selectedPeriod, customDate]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const silentRefreshReports = useCallback(() => {
    fetchReportsData({ silent: true });
  }, [fetchReportsData]);

  useRealtimeSync(['reports', 'projects', 'sheets', 'tickets', 'users'], silentRefreshReports);

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  // Direct Tab Switcher: Clicking a navigation tab switches to that report view
  const handleToggleReport = (reportKey) => {
    setActiveReport(reportKey);
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
      `"${m.last_active_date ? formatIndianDate(m.last_active_date) : 'N/A'}"`
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
      `"${formatIndianDate(d.date, d.date)}"`,
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
          id="reports-logout-modal-overlay"
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}
        >
          <section id="reports-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon">
              <LogOut size={21} />
            </div>
            <h2 id="reports-logout-modal-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your credentials.</p>
            <div className="modal-actions">
              <button id="reports-logout-cancel-btn" className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button id="reports-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Daily Activity History Modal for Specific QA Member */}
      {activeDailyLogMember && (
        <div
          id="reports-daily-log-modal-overlay"
          className="daily-log-modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setActiveDailyLogMember(null)}
        >
          <div id="reports-daily-log-modal" className="daily-log-modal-content" role="dialog" aria-modal="true">
            <div className="daily-modal-header">
              <div className="daily-modal-title-stack">
                <h3 id="reports-daily-log-modal-title">Daily Work &amp; Execution Activity Log</h3>
                <p>Day-by-day record of test cases tested and bug tickets raised.</p>
              </div>
              <button
                id="reports-daily-log-close-btn"
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
                  <table id="reports-daily-log-table" className="daily-log-table">
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
                                <span>{formatIndianDate(dw.date, dw.date)}</span>
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
                id="reports-daily-log-export-btn"
                type="button"
                className="report-btn-export"
                onClick={() => handleExportMemberDailyHistoryCSV(activeDailyLogMember)}
              >
                <Download size={13} />
                <span>Export Member Daily History CSV</span>
              </button>
              <button
                id="reports-daily-log-footer-close-btn"
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
      <main id="reports-main-content" className="main-content">
        <TopNavbar pageTitle="Quality & Defect Reports" />
        {/* Dashboard Body */}
        <div className="dashboard-container">
          <div className="users-page-layout reports-page-layout">
            {/* Executive Summary Header matching User Module */}
            <header id="reports-header-section" className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <BarChart3 size={24} color="#2563EB" />
                </div>
                <div className="um-header-titles">
                  <h1 id="reports-page-heading">Quality Assurance &amp; Defect Resolution Reports</h1>
                  <p>
                    Executive QA metrics, test case execution progress, daily member productivity, and developer defect resolution analytics.
                  </p>
                </div>
              </div>

              <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="reports-live-badge">
                  <span className="reports-pulse-dot" /> Live Data Synced
                </span>
                <button
                  id="reports-refresh-btn"
                  type="button"
                  className="um-btn-create"
                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none' }}
                  onClick={fetchReportsData}
                  title="Refresh report analytics"
                >
                  <RefreshCw size={14} />
                  <span>Refresh Data</span>
                </button>
              </div>
            </header>

            {/* Top Workspace KPI Grid matching User Module (.um-stats-grid) */}
            <section id="reports-kpi-grid" className="um-stats-grid">
              {/* Card 1: Monitored Projects */}
              <div id="reports-kpi-projects-card" className="um-stat-card card-total">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-blue">
                    <FolderKanban size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Monitored Projects</span>
                    <span className="um-stat-number">{projectOverall?.total_projects || projectReports.length}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-blue">Active Tracks</span>
              </div>

              {/* Card 2: Total Test Cases */}
              <div id="reports-kpi-cases-card" className="um-stat-card card-active">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-green">
                    <CheckCheck size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Total Test Cases</span>
                    <span className="um-stat-number">{projectOverall?.total_test_cases || 0}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-green">
                  {projectOverall?.total_passed || 0} Passed
                </span>
              </div>

              {/* Card 3: Global Pass Rate */}
              <div id="reports-kpi-rate-card" className="um-stat-card card-inactive">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-orange">
                    <TrendingUp size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Global Pass Rate</span>
                    <span
                      className="um-stat-number"
                      style={{
                        color: (projectOverall?.global_pass_rate || 0) >= 80 ? '#16a34a' : '#ea580c'
                      }}
                    >
                      {projectOverall?.global_pass_rate || 0}%
                    </span>
                  </div>
                </div>
                <span className="um-stat-badge badge-orange">Pass Ratio</span>
              </div>

              {/* Card 4: Defects Resolved */}
              <div id="reports-kpi-defects-card" className="um-stat-card card-departments">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-purple">
                    <Bug size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Defects Resolved</span>
                    <span className="um-stat-number">
                      {(projectOverall?.total_resolved || 0) + (projectOverall?.total_closed || 0)}
                      <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '500' }}>
                        {' '}/ {projectOverall?.total_tickets || 0}
                      </span>
                    </span>
                  </div>
                </div>
                <span className="um-stat-badge badge-purple">
                  {projectOverall?.global_resolution_rate || 0}% Fixed
                </span>
              </div>
            </section>

            {/* ======================================================== */}
            {/* VIEW SELECTOR SWITCHER (Direct One-Click Navigation)     */}
            {/* Opening one report closes the other report below/above   */}
            {/* ======================================================== */}
            <div className="reports-view-selector-bar">
              <div className="reports-tab-group">
                <button
                  id="reports-tab-projects-btn"
                  type="button"
                  className={`report-nav-tab ${activeReport === 'projects' ? 'active' : ''}`}
                  onClick={() => handleToggleReport('projects')}
                >
                  <FolderKanban size={16} />
                  <span>Projects Quality Overview</span>
                </button>

                {canViewQAReport && (
                  <button
                    id="reports-tab-qa-btn"
                    type="button"
                    className={`report-nav-tab ${activeReport === 'qa' ? 'active' : ''}`}
                    onClick={() => handleToggleReport('qa')}
                  >
                    <UsersRound size={16} />
                    <span>QA Members Performance</span>
                  </button>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* REPORT 1: PROJECT-WISE QUALITY & DEFECT OVERVIEW         */}
            {/* Dedicated page view controlled by top navigation tab     */}
            {/* ======================================================== */}
            {activeReport === 'projects' && (
              <section id="reports-projects-section" className="report-accordion-card is-expanded">
                <div
                  id="reports-projects-accordion-toggle"
                  className="report-accordion-header"
                  style={{ cursor: 'default' }}
                >
                  <div className="report-accordion-title-side">
                    <div className="accordion-icon-box">
                      <FolderKanban size={18} />
                    </div>
                    <div className="accordion-title-text">
                      <h3 id="reports-projects-heading">
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
                  </div>
                </div>

                <div className="report-accordion-body">
                  {/* Clean Search & Export Controls matching User Module */}
                  <div className="um-controls-bar" style={{ marginBottom: '16px' }}>
                    <div className="um-search-container">
                      <Search size={16} color="#64748b" />
                      <input
                        id="reports-project-search"
                        type="text"
                        placeholder="Search project code, name, lead..."
                        autoComplete="off"
                        maxLength={100}
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                      {projectSearch && (
                        <button
                          id="reports-project-search-clear-btn"
                          type="button"
                          className="um-search-clear-btn"
                          onClick={() => setProjectSearch('')}
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="um-filter-selects">
                      <button
                        id="reports-export-projects-csv-btn"
                        type="button"
                        className="um-btn-create"
                        onClick={handleExportProjectCSV}
                      >
                        <Download size={15} />
                        <span>Export Projects CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Modern Table (No Clutter, Segmented Progress Bars) */}
                  <div className="report-table-container">
                    {loading && projectReports.length === 0 ? (
                      <SkeletonLoader variant="table" rows={5} />
                    ) : filteredProjects.length === 0 ? (
                      <div className="um-empty-state-card" style={{ border: 'none', boxShadow: 'none', margin: '24px 0' }}>
                        <div className="um-empty-icon-wrap">
                          <FolderKanban size={32} />
                        </div>
                        <h3 id="reports-projects-empty-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                          No Projects Found
                        </h3>
                        <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          {projectSearch
                            ? 'No projects match your search keywords. Try adjusting your search query.'
                            : 'No projects have been assigned or configured in your workspace.'}
                        </p>
                        {projectSearch && (
                          <button
                            id="reports-projects-clear-btn"
                            type="button"
                            className="um-btn-create"
                            style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none', marginTop: 8 }}
                            onClick={() => setProjectSearch('')}
                          >
                            <X size={15} />
                            <span>Clear Search</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <table id="reports-projects-table" className="report-modern-table">
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
                                        <ShieldCheck size={13} />
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
              </section>
            )}

            {/* ======================================================== */}
            {/* REPORT 2: QA MEMBER TEST EXECUTION & DAILY WORK REPORT    */}
            {/* Visible ONLY to: Manager, QA Lead, QA Member             */}
            {/* Strictly EXCLUDES QA Lead from member rows               */}
            {/* Dedicated page view controlled by top navigation tab     */}
            {/* ======================================================== */}
            {canViewQAReport && activeReport === 'qa' && (
              <section id="reports-qa-section" className="report-accordion-card is-expanded">
                <div
                  id="reports-qa-accordion-toggle"
                  className="report-accordion-header"
                  style={{ cursor: 'default' }}
                >
                  <div className="report-accordion-title-side">
                    <div className="accordion-icon-box emerald">
                      <UsersRound size={18} />
                    </div>
                    <div className="accordion-title-text">
                      <h3 id="reports-qa-heading">
                        QA Member Test Execution &amp; Daily Work Report
                        <span className="accordion-badge emerald">
                          {filteredQAMembers.length} QA {filteredQAMembers.length === 1 ? 'Member' : 'Members'}
                        </span>
                      </h3>
                      <p>Track how much each QA member tested today and across daily reporting periods with activity logs.</p>
                    </div>
                  </div>

                  <div className="report-accordion-meta-side">
                    {qaOverall && (
                      <span className="accordion-quick-stat">
                        <Calendar size={14} color="#059669" />
                        <span>
                          <strong>
                            {userRole.toLowerCase() === 'qa member'
                              ? filteredQAMembers[0]?.today_tested || 0
                              : qaOverall.today_tests_executed || 0}
                          </strong>{' '}
                          Tested Today &bull;{' '}
                          <strong>
                            {userRole.toLowerCase() === 'qa member'
                              ? selectedPeriod === 'all'
                                ? filteredQAMembers[0]?.total_tested || 0
                                : filteredQAMembers[0]?.period_tested || 0
                              : qaOverall.period_tests_executed || qaOverall.total_tests_executed || 0}
                          </strong>{' '}
                          in {selectedPeriod === 'all' ? 'All Time' : selectedPeriod}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

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
                            id={`reports-qa-period-${t.key}-btn`}
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
                            id="reports-qa-date"
                            type="date"
                            autoComplete="off"
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
                            id="reports-qa-period-reset-btn"
                            type="button"
                            className="qa-period-btn qa-period-reset-btn"
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

                    {/* Today Output Quick Banner with Integrated Export Button */}
                    <div className="qa-today-output-banner" style={{ marginBottom: '16px' }}>
                      <div className="today-banner-left">
                        <div className="today-banner-icon">
                          <Clock size={16} />
                        </div>
                        <div className="today-banner-text">
                          <strong>
                            {userRole.toLowerCase() === 'qa member'
                              ? "Today's My QA Work Output:"
                              : "Today's QA Team Work Output:"}
                          </strong>
                          <span>Live execution metrics for {formatIndianDate(new Date())}</span>
                        </div>
                      </div>

                      <div className="today-banner-chips" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="today-chip tested">
                          <CheckCheck size={12} />{' '}
                          {userRole.toLowerCase() === 'qa member'
                            ? filteredQAMembers[0]?.today_tested || 0
                            : qaOverall?.today_tests_executed || 0}{' '}
                          Cases Executed Today
                        </span>
                        <span className="today-chip passed">
                          <CheckCircle2 size={12} />{' '}
                          {userRole.toLowerCase() === 'qa member'
                            ? filteredQAMembers[0]?.today_passed || 0
                            : qaOverall?.today_passed || 0}{' '}
                          Passed Today
                        </span>
                        <span className="today-chip bugs">
                          <Bug size={12} />{' '}
                          {userRole.toLowerCase() === 'qa member'
                            ? filteredQAMembers[0]?.today_bugs || 0
                            : qaOverall?.today_bugs_raised || 0}{' '}
                          Bugs Raised Today
                        </span>
                        <button
                          id="reports-export-qa-csv-btn"
                          type="button"
                          className="um-btn-create"
                          style={{ height: '32px', padding: '0 12px', fontSize: '0.78rem' }}
                          onClick={handleExportQACSV}
                        >
                          <Download size={14} />
                          <span>Export QA Work CSV ({selectedPeriod})</span>
                        </button>
                      </div>
                    </div>

                    {/* Modern QA Members Performance Table with Daily Work */}
                    <div className="report-table-container">
                      {loading && qaMembersReport.length === 0 ? (
                        <SkeletonLoader variant="table" rows={4} />
                      ) : filteredQAMembers.length === 0 ? (
                        <div className="um-empty-state-card" style={{ border: 'none', boxShadow: 'none', margin: '24px 0' }}>
                          <div className="um-empty-icon-wrap">
                            <UsersRound size={32} />
                          </div>
                          <h3 id="reports-qa-empty-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                            No QA Members Found
                          </h3>
                          <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            {qaSearch
                              ? 'No active QA Members match your search keyword. Try searching for a different name or email.'
                              : 'No QA Members found for the selected reporting period.'}
                          </p>
                          {qaSearch && (
                            <button
                              id="reports-qa-clear-btn"
                              type="button"
                              className="um-btn-create"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none', marginTop: 8 }}
                              onClick={() => setQaSearch('')}
                            >
                              <X size={15} />
                              <span>Clear Search</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <table id="reports-qa-table" className="report-modern-table">
                          <thead>
                            <tr>
                              <th>QA Member Name</th>
                              <th>Total Test Case</th>
                              <th>Pass</th>
                              <th>Fail</th>
                              <th>Recommendation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredQAMembers.map((qa) => {
                              // Display metrics for currently selected period (or lifetime if 'all')
                              const displayTested = selectedPeriod === 'all' ? qa.total_tested : (qa.period_tested || 0);
                              const displayPass = selectedPeriod === 'all' ? qa.pass_count : (qa.period_pass || 0);
                              const displayFail = selectedPeriod === 'all' ? qa.fail_count : (qa.period_fail || 0);
                              const displayRec = selectedPeriod === 'all' ? qa.recommendation_count : (qa.period_rec || 0);

                              const avatar = qa.full_name ? qa.full_name.charAt(0).toUpperCase() : 'Q';
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
                                            {isTodayActive ? 'Active Today' : `Last active: ${formatIndianDate(qa.last_active_date, qa.last_active_date)}`}
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
                                    <span className="legend-stat" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16A34A' }}>
                                      <span className="legend-dot dot-pass" />
                                      <span>{displayPass}</span>
                                    </span>
                                  </td>

                                  <td>
                                    <span className="legend-stat stat-fail" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#DC2626' }}>
                                      <span className="legend-dot dot-fail" />
                                      <span>{displayFail}</span>
                                    </span>
                                  </td>

                                  <td>
                                    <span className="legend-stat stat-rec" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#D97706' }}>
                                      <span className="legend-dot dot-rec" />
                                      <span>{displayRec}</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
