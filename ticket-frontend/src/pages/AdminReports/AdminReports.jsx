import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  FolderKanban,
  LogOut,
  PieChart,
  RefreshCw,
  Ticket,
  TrendingUp,
  UsersRound
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import '../AdminProjects/AdminProjects.css';
import './AdminReports.css';

function AdminReports() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    ticketsByPriority: [],
    ticketsByType: [],
    ticketsByStatus: [],
    projectsByStatus: []
  });
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTickets: 0,
    totalUsers: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchReports = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [sumRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/reports-summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/admin/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSummary(sumRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Count'],
      ['Total Team Members', stats.totalUsers],
      ['Total Projects', stats.totalProjects],
      ['Total Tickets', stats.totalTickets],
      ['Pending Approvals', stats.pendingApprovals]
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `qa_reports_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalTicketsCount = stats.totalTickets || 1;

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
            <strong>Quality Reports & Analytics</strong>
          </div>
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchReports}
              title="Refresh reports"
              aria-label="Refresh reports data"
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
          <div className="reports-layout">
            {/* Header Card */}
            <div className="projects-header-row">
              <div className="projects-header-info">
                <h2>Workspace Reports & Analytics</h2>
                <p>Live health indicators, issue breakdown, and release distribution summaries.</p>
              </div>
              <div className="users-header-actions">
                <button className="btn-primary-action" onClick={handleExportCSV}>
                  <Download size={18} />
                  <span>Export CSV Report</span>
                </button>
              </div>
            </div>

            {/* Top KPI Summary Cards */}
            <div className="reports-kpi-grid">
              <div className="report-kpi-card">
                <span className="report-kpi-title">Team Members</span>
                <span className="report-kpi-val">{stats.totalUsers}</span>
                <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>Registered in Database</span>
              </div>
              <div className="report-kpi-card">
                <span className="report-kpi-title">Active Projects</span>
                <span className="report-kpi-val">{stats.totalProjects}</span>
                <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>QA & Engineering Tracks</span>
              </div>
              <div className="report-kpi-card">
                <span className="report-kpi-title">Total Tickets</span>
                <span className="report-kpi-val">{stats.totalTickets}</span>
                <span style={{ fontSize: '0.8rem', color: '#7c3aed' }}>Bugs, Tasks & Features</span>
              </div>
              <div className="report-kpi-card">
                <span className="report-kpi-title">Pending Approvals</span>
                <span className="report-kpi-val">{stats.pendingApprovals}</span>
                <span style={{ fontSize: '0.8rem', color: '#ea580c' }}>Awaiting Action</span>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="reports-charts-grid">
              {/* Tickets by Priority */}
              <div className="report-chart-card">
                <div className="report-chart-title">
                  <span>Tickets by Priority</span>
                  <AlertTriangle size={18} color="#e11d48" />
                </div>
                <div className="breakdown-list">
                  {summary.ticketsByPriority.length > 0 ? (
                    summary.ticketsByPriority.map((item) => {
                      const count = parseInt(item.count, 10);
                      const pct = Math.round((count / totalTicketsCount) * 100);
                      const barColor =
                        item.priority === 'Critical'
                          ? '#ef4444'
                          : item.priority === 'High'
                          ? '#f97316'
                          : item.priority === 'Medium'
                          ? '#eab308'
                          : '#94a3b8';
                      return (
                        <div className="breakdown-row" key={item.priority}>
                          <div className="breakdown-label-row">
                            <span>{item.priority}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="breakdown-bar-bg">
                            <div
                              className="breakdown-bar-fill"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No ticket priority records available.</p>
                  )}
                </div>
              </div>

              {/* Tickets by Status */}
              <div className="report-chart-card">
                <div className="report-chart-title">
                  <span>Tickets by Status</span>
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
                <div className="breakdown-list">
                  {summary.ticketsByStatus.length > 0 ? (
                    summary.ticketsByStatus.map((item) => {
                      const count = parseInt(item.count, 10);
                      const pct = Math.round((count / totalTicketsCount) * 100);
                      const barColor =
                        item.status === 'Resolved'
                          ? '#22c55e'
                          : item.status === 'In Progress'
                          ? '#3b82f6'
                          : item.status === 'Open'
                          ? '#eab308'
                          : '#64748b';
                      return (
                        <div className="breakdown-row" key={item.status}>
                          <div className="breakdown-label-row">
                            <span>{item.status}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="breakdown-bar-bg">
                            <div
                              className="breakdown-bar-fill"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No ticket status records available.</p>
                  )}
                </div>
              </div>

              {/* Tickets by Type */}
              <div className="report-chart-card">
                <div className="report-chart-title">
                  <span>Tickets by Type</span>
                  <PieChart size={18} color="#2563eb" />
                </div>
                <div className="breakdown-list">
                  {summary.ticketsByType.length > 0 ? (
                    summary.ticketsByType.map((item) => {
                      const count = parseInt(item.count, 10);
                      const pct = Math.round((count / totalTicketsCount) * 100);
                      const barColor =
                        item.type === 'Bug'
                          ? '#ef4444'
                          : item.type === 'Incident'
                          ? '#b91c1c'
                          : item.type === 'Feature'
                          ? '#0284c7'
                          : '#64748b';
                      return (
                        <div className="breakdown-row" key={item.type}>
                          <div className="breakdown-label-row">
                            <span>{item.type}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="breakdown-bar-bg">
                            <div
                              className="breakdown-bar-fill"
                              style={{ width: `${pct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No ticket type records available.</p>
                  )}
                </div>
              </div>

              {/* Projects Distribution by Status */}
              <div className="report-chart-card">
                <div className="report-chart-title">
                  <span>Projects Distribution</span>
                  <FolderKanban size={18} color="#7c3aed" />
                </div>
                <div className="breakdown-list">
                  {summary.projectsByStatus.length > 0 ? (
                    summary.projectsByStatus.map((item) => {
                      const count = parseInt(item.count, 10);
                      const totalProj = stats.totalProjects || 1;
                      const pct = Math.round((count / totalProj) * 100);
                      return (
                        <div className="breakdown-row" key={item.status}>
                          <div className="breakdown-label-row">
                            <span>{item.status}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="breakdown-bar-bg">
                            <div
                              className="breakdown-bar-fill"
                              style={{ width: `${pct}%`, background: '#7c3aed' }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No project status records available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminReports;
