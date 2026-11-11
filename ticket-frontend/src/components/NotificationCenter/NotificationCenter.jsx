import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Bell, Check, CheckCheck, Globe, UserCheck, X, Clock } from 'lucide-react';
import './NotificationCenter.css';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const TYPE_META = {
  info: { label: 'Info', className: 'notif-type-info' },
  success: { label: 'Success', className: 'notif-type-success' },
  warning: { label: 'Warning', className: 'notif-type-warning' },
  urgent: { label: 'Urgent', className: 'notif-type-urgent' }
};

function NotificationCenter({ collapsed = false }) {
  const [notifications, setNotifications] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('notifications-unread-count', { detail: { unreadCount } })
    );
  }, [unreadCount]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleOpen = () => {
      setDrawerOpen(true);
      fetchNotifications();
    };
    const handleRefresh = () => fetchNotifications();

    window.addEventListener('open-notifications-drawer', handleOpen);
    window.addEventListener('notifications-refresh', handleRefresh);
    return () => {
      window.removeEventListener('open-notifications-drawer', handleOpen);
      window.removeEventListener('notifications-refresh', handleRefresh);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    let socket = null;
    let active = true;
    let toastTimer = null;

    const connectSocket = async () => {
      let userId = Number(localStorage.getItem('userId'));
      if (!userId) {
        try {
          const { data } = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (data?.user?.id) {
            userId = Number(data.user.id);
            localStorage.setItem('userId', String(userId));
          }
        } catch {
          return;
        }
      }

      if (!active || !userId) return;

      socket = io(SOCKET_URL, { transports: ['polling', 'websocket'] });
      socket.on('connect', () => {
        socket.emit('join_user_room', { userId });
      });

      socket.on('new_notification', (incoming) => {
        if (!incoming) return;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        window.dispatchEvent(new Event('notifications-updated'));
        setLiveToast(incoming);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setLiveToast(null), 6000);
      });
    };

    connectSocket();

    return () => {
      active = false;
      clearTimeout(toastTimer);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.warn('Mark read error:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token');
    if (!token || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await axios.put(
        'http://localhost:5000/api/notifications/read-all',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.warn('Mark all read error:', err.message);
    }
  };

  const visibleItems =
    filterTab === 'unread'
      ? notifications.filter((item) => !item.is_read)
      : notifications;

  return (
    <>
      <button
        type="button"
        className="nav-item sidebar-notif-trigger"
        onClick={() => {
          setDrawerOpen(true);
          fetchNotifications();
        }}
        title={collapsed ? `Notifications (${unreadCount} unread)` : 'Open Notifications Inbox'}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="nav-icon" />
        <span className="nav-label">Notifications</span>
        {unreadCount > 0 && (
          <span className="sidebar-notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {liveToast && (
        <div className="notif-toast" role="status" aria-live="polite">
          <div className="notif-toast-icon">
            <Bell size={16} />
          </div>
          <div className="notif-toast-body">
            <div className="notif-toast-top">
              <strong>{liveToast.title}</strong>
              <span className={`notif-type-pill ${(TYPE_META[liveToast.type] || TYPE_META.info).className}`}>
                {(TYPE_META[liveToast.type] || TYPE_META.info).label}
              </span>
            </div>
            <p>{liveToast.message}</p>
            {liveToast.sender_name && (
              <span className="notif-toast-sender">
                From {liveToast.sender_name}
                {liveToast.audience === 'all' ? ' · Common to All' : ''}
              </span>
            )}
          </div>
          <button
            type="button"
            className="notif-toast-close"
            onClick={() => setLiveToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {drawerOpen && (
        <div
          className="notif-drawer-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawerOpen(false);
          }}
        >
          <section
            className="notif-drawer-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-drawer-title"
          >
            <header className="notif-drawer-header">
              <div className="notif-drawer-title-group">
                <div className="notif-drawer-icon-box">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 id="notif-drawer-title">Notifications Inbox</h3>
                  <p>
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="notif-drawer-header-actions">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notif-mark-all-btn"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  className="notif-drawer-close-btn"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="notif-drawer-tabs">
              <button
                type="button"
                className={`notif-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={`notif-filter-tab ${filterTab === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterTab('unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div className="notif-drawer-list">
              {loading && notifications.length === 0 ? (
                <div className="notif-empty-state">Loading notifications...</div>
              ) : visibleItems.length === 0 ? (
                <div className="notif-empty-state">
                  <Bell size={34} style={{ opacity: 0.35 }} />
                  <p>
                    {filterTab === 'unread'
                      ? 'No unread notifications right now.'
                      : 'No notifications yet.'}
                  </p>
                </div>
              ) : (
                visibleItems.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.info;
                  return (
                    <article
                      key={item.id}
                      className={`notif-item-card ${item.is_read ? 'read' : 'unread'}`}
                    >
                      <div className="notif-item-top">
                        <div className="notif-item-badges">
                          <span className={`notif-type-pill ${meta.className}`}>{meta.label}</span>
                          {item.audience === 'all' ? (
                            <span className="notif-audience-pill all">
                              <Globe size={11} /> Common to All
                            </span>
                          ) : item.audience === 'selected' ? (
                            <span className="notif-audience-pill direct">
                              <UserCheck size={11} /> Selected User
                            </span>
                          ) : null}
                        </div>
                        {!item.is_read && (
                          <button
                            type="button"
                            className="notif-read-single-btn"
                            onClick={() => handleMarkAsRead(item.id)}
                            title="Mark as read"
                          >
                            <Check size={13} />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>

                      <h4 className="notif-item-title">{item.title}</h4>
                      {item.message && <p className="notif-item-message">{item.message}</p>}

                      <div className="notif-item-meta">
                        <span>
                          {item.sender_name
                            ? `From ${item.sender_name}${item.sender_role ? ` (${item.sender_role})` : ''}`
                            : 'Workspace System'}
                        </span>
                        <span className="notif-item-time">
                          <Clock size={11} />
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : 'Just now'}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default NotificationCenter;
