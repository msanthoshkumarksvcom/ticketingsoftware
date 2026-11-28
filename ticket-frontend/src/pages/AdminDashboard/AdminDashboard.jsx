import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Clock3,
  FolderKanban,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Ticket,
  UsersRound
} from 'lucide-react';
import AdminSidebar, { SmallCubeLogo } from '../../components/AdminSidebar/AdminSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import { formatIndianDate } from '../../utils/dateFormat';
import { getRolePath } from '../../utils/roleRoutes';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import '../../styles/admin.css';

const initialStats = {
  totalProjects: 0,
  totalTickets: 0,
  totalUsers: 0,
  pendingApprovals: 0
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const refreshStats = useCallback(async (signal, silent = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) setLoading(true);
    setErrorMessage('');
    try {
      const response = await axios.get('http://localhost:5000/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      const nextStats = response.data;
      const keys = Object.keys(initialStats);
      if (!nextStats || keys.some((key) => !Number.isFinite(Number(nextStats[key])))) {
        throw new Error('The dashboard stats response is incomplete.');
      }
      setStats(Object.fromEntries(keys.map((key) => [key, Number(nextStats[key])])));
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        navigate('/', { replace: true });
        return;
      }
      console.error('Failed to fetch dashboard stats:', error);
      setErrorMessage('We could not load the latest dashboard data. Please try again.');
    } finally {
      if (!signal?.aborted && !silent) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return undefined;
    }

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      setShowLogoutModal(true);
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    const controller = new AbortController();
    const refreshTask = window.setTimeout(() => refreshStats(controller.signal), 0);

    return () => {
      window.clearTimeout(refreshTask);
      controller.abort();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, refreshStats]);

  useRealtimeSync(['dashboard', 'projects', 'tickets', 'users', 'approvals'], () => {
    refreshStats(undefined, true);
  });

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  const metricCards = [
    {
      key: 'totalProjects',
      label: 'Total projects',
      actionLabel: 'View Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      tone: 'blue',
      path: getRolePath('/projects')
    },
    {
      key: 'totalTickets',
      label: 'Total tickets',
      actionLabel: 'View Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      tone: 'violet',
      path: getRolePath('/tickets')
    },
    {
      key: 'totalUsers',
      label: 'Team members',
      actionLabel: 'View Members',
      value: stats.totalUsers,
      icon: UsersRound,
      tone: 'mint',
      path: getRolePath('/users')
    },
    {
      key: 'pendingApprovals',
      label: 'Pending approvals',
      actionLabel: 'View Approvals',
      value: stats.pendingApprovals,
      icon: Clock3,
      tone: 'amber',
      path: getRolePath('/approvals')
    }
  ];
  const chartData = metricCards.map(({ label, value }) => ({
    name: label.replace('Total ', ''),
    value
  }));
  const maxChartValue = Math.max(...chartData.map(({ value }) => value), 1);
  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const formattedDate = formatIndianDate(new Date());

  const focusApprovals = () => {
    document.getElementById('pending-approvals')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  return (
    <div className="admin-layout">
      {showLogoutModal && (
        <div id="dash-logout-overlay" className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLogoutModal(false);
        }}>
          <section id="dash-logout-modal" className="modal-content" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title" id="logout-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button id="dash-logout-cancel-btn" className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button id="dash-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      <AdminSidebar
        hasConnectionError={Boolean(errorMessage)}
        onLogout={() => setShowLogoutModal(true)}
      />

      <main id="dash-main-content" className="main-content">
        <TopNavbar pageTitle="Dashboard" />
        <div className="dashboard-container">
          <section id="dash-welcome-banner" className="welcome-banner">
            <div className="welcome-content">
              <span className="eyebrow"><span className="eyebrow-dot" /> QA OPERATIONS</span>
              <h1 id="dash-welcome-heading">Good to see you, {displayName}</h1>
              <p>Your team’s quality workspace, all in one place.</p>
              <div className="welcome-meta">
                <span className="welcome-date">{formattedDate}</span>
                <span className="meta-separator" />
                <span className={`status-label${errorMessage ? ' status-label-error' : ''}`}>
                  <span className="status-dot" />
                  {loading ? 'Syncing workspace' : errorMessage ? 'Connection issue' : 'Workspace connected'}
                </span>
              </div>
            </div>
            <div className="banner-decoration banner-decoration-one" />
            <div className="banner-decoration banner-decoration-two" />
            <div className="banner-mark"><SmallCubeLogo /></div>
            <button id="dash-refresh-btn" className="refresh-button" onClick={() => refreshStats()} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'refresh-spinning' : ''} />
              {loading ? 'Refreshing' : 'Refresh data'}
            </button>
          </section>

          {errorMessage && (
            <div id="dash-error-banner" className="error-banner" role="alert">
              <span>{errorMessage}</span>
              <button id="dash-retry-btn" onClick={() => refreshStats()}>Try again</button>
            </div>
          )}

          <section id="dash-overview-section" className="section-heading">
            <div>
              <span className="section-kicker">AT A GLANCE</span>
              <h2 id="dash-overview-heading">Workspace overview</h2>
            </div>
            <span className="snapshot-label"><span className="snapshot-dot" /> Current totals</span>
          </section>

          <section id="dash-stats-grid" className="stats-grid" aria-label="Workspace totals" aria-live="polite">
            {metricCards.map(({ key, label, actionLabel, value, icon: Icon, tone, path }) => (
              <article
                className={`stat-card stat-${tone} stat-card-clickable`}
                id={key === 'pendingApprovals' ? 'pending-approvals' : `dash-stat-card-${key}`}
                key={key}
                onClick={() => path && navigate(path)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${label}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (path) navigate(path);
                  }
                }}
              >
                <div className="stat-topline">
                  <div className="stat-icon-wrapper"><Icon size={19} strokeWidth={1.8} /></div>
                  <span className="stat-period">CURRENT</span>
                </div>
                <div className="stat-value">{loading ? <SkeletonLoader variant="inline" width={54} height={28} /> : value.toLocaleString()}</div>
                <div className="stat-bottomline">
                  <span className="stat-label">{label}</span>
                  {path && (
                    <button
                      type="button"
                      className="stat-quick-nav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(path);
                      }}
                      title={`Go to ${label}`}
                      aria-label={`Go to ${label}`}
                    >
                      <span>View</span>
                      <ArrowRight size={13} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>

          <section id="dash-panels-section" className="dashboard-panels">
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">INVENTORY</span>
                  <h2 id="dash-chart-heading">Workspace totals</h2>
                  <p>Current record counts across your workspace</p>
                </div>
                <span className="panel-icon"><BarChart3 size={18} /></span>
              </div>
              <div id="dash-chart-wrap" className="chart-wrap" role="img" aria-label="Bar chart of current workspace record counts">
                {chartData.map(({ name, value }) => (
                  <div className="chart-row" key={name}>
                    <span className="chart-label">{name}</span>
                    <div className="chart-track">
                      <span
                        className="chart-bar"
                        style={{ width: `${Math.max((value / maxChartValue) * 100, 1)}%` }}
                      />
                    </div>
                    <span className="chart-value">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel approvals-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">ACTION REQUIRED</span>
                  <h2 id="dash-queue-heading">Review queue</h2>
                </div>
                <span className="panel-icon panel-icon-amber"><Clock3 size={18} /></span>
              </div>
              <div className="queue-count">{loading ? <SkeletonLoader variant="inline" width={64} height={36} /> : stats.pendingApprovals.toLocaleString()}</div>
              <p className="queue-description">items are waiting for an approval</p>
              <div className="queue-divider" />
              <div className="queue-note">
                <span className="queue-note-icon"><ShieldCheck size={16} /></span>
                <span>Review pending requests to keep work moving.</span>
              </div>
              <button
                id="dash-view-approvals-btn"
                type="button"
                className="queue-button"
                onClick={() => navigate(getRolePath('/approvals'))}
                title="Go to Pending Approvals"
                aria-label="Go to Pending Approvals"
              >
                <span>View approval queue</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </button>
            </article>
          </section>

          <footer id="dash-footer" className="dashboard-footer">
            <span><span className={`footer-status-dot${errorMessage ? ' footer-status-error' : ''}`} />{errorMessage ? 'Data could not be refreshed' : 'Dashboard data is up to date'}</span>
            <span>Counts are provided by your workspace API</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
