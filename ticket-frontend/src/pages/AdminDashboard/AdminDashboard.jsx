import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  Bell,
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

  const refreshStats = useCallback(async (signal) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
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
      if (!signal?.aborted) setLoading(false);
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

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  const metricCards = [
    {
      key: 'totalProjects',
      label: 'Total projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      tone: 'blue'
    },
    {
      key: 'totalTickets',
      label: 'Total tickets',
      value: stats.totalTickets,
      icon: Ticket,
      tone: 'violet'
    },
    {
      key: 'totalUsers',
      label: 'Team members',
      value: stats.totalUsers,
      icon: UsersRound,
      tone: 'mint'
    },
    {
      key: 'pendingApprovals',
      label: 'Pending approvals',
      value: stats.pendingApprovals,
      icon: Clock3,
      tone: 'amber'
    }
  ];
  const chartData = metricCards.map(({ label, value }) => ({
    name: label.replace('Total ', ''),
    value
  }));
  const maxChartValue = Math.max(...chartData.map(({ value }) => value), 1);
  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const focusApprovals = () => {
    document.getElementById('pending-approvals')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  return (
    <div className="admin-layout">
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLogoutModal(false);
        }}>
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title" id="logout-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
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

      <AdminSidebar
        hasConnectionError={Boolean(errorMessage)}
        onLogout={() => setShowLogoutModal(true)}
      />

      <main className="main-content">
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Overview</strong>
          </div>
          <div className="header-right">
            <button className="notification-bell" onClick={focusApprovals} aria-label="View pending approvals">
              <Bell size={19} />
              {stats.pendingApprovals > 0 && <span className="notification-count">{stats.pendingApprovals}</span>}
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
          <section className="welcome-banner">
            <div className="welcome-content">
              <span className="eyebrow"><span className="eyebrow-dot" /> QA OPERATIONS</span>
              <h1>Good to see you, {displayName}</h1>
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
            <button className="refresh-button" onClick={() => refreshStats()} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'refresh-spinning' : ''} />
              {loading ? 'Refreshing' : 'Refresh data'}
            </button>
          </section>

          {errorMessage && (
            <div className="error-banner" role="alert">
              <span>{errorMessage}</span>
              <button onClick={() => refreshStats()}>Try again</button>
            </div>
          )}

          <section className="section-heading">
            <div>
              <span className="section-kicker">AT A GLANCE</span>
              <h2>Workspace overview</h2>
            </div>
            <span className="snapshot-label"><span className="snapshot-dot" /> Current totals</span>
          </section>

          <section className="stats-grid" aria-label="Workspace totals" aria-live="polite">
            {metricCards.map(({ key, label, value, icon: Icon, tone }) => (
              <article
                className={`stat-card stat-${tone}`}
                id={key === 'pendingApprovals' ? 'pending-approvals' : undefined}
                key={key}
              >
                <div className="stat-topline">
                  <div className="stat-icon-wrapper"><Icon size={19} strokeWidth={1.8} /></div>
                  <span className="stat-period">CURRENT</span>
                </div>
                <div className="stat-value">{loading ? '—' : value.toLocaleString()}</div>
                <div className="stat-bottomline">
                  <span className="stat-label">{label}</span>
                  <span className="stat-arrow"><ChevronDown size={14} /></span>
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-panels">
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">INVENTORY</span>
                  <h2>Workspace totals</h2>
                  <p>Current record counts across your workspace</p>
                </div>
                <span className="panel-icon"><BarChart3 size={18} /></span>
              </div>
              <div className="chart-wrap" role="img" aria-label="Bar chart of current workspace record counts">
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
                  <h2>Review queue</h2>
                </div>
                <span className="panel-icon panel-icon-amber"><Clock3 size={18} /></span>
              </div>
              <div className="queue-count">{loading ? '—' : stats.pendingApprovals.toLocaleString()}</div>
              <p className="queue-description">items are waiting for an approval</p>
              <div className="queue-divider" />
              <div className="queue-note">
                <span className="queue-note-icon"><ShieldCheck size={16} /></span>
                <span>Review pending requests to keep work moving.</span>
              </div>
              <button className="queue-button" onClick={focusApprovals}>
                View approval total <ChevronDown size={15} />
              </button>
            </article>
          </section>

          <footer className="dashboard-footer">
            <span><span className={`footer-status-dot${errorMessage ? ' footer-status-error' : ''}`} />{errorMessage ? 'Data could not be refreshed' : 'Dashboard data is up to date'}</span>
            <span>Counts are provided by your workspace API</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
