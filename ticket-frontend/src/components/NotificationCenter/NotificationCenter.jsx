import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Bell, Check, CheckCheck, Globe, UserCheck, X, Clock } from 'lucide-react';
import { formatIndianDateTime } from '../../utils/dateFormat';
import './NotificationCenter.css';
import { SOCKET_URL } from '../../utils/apiConfig';
import { getValidToken } from '../../utils/auth';
import { getRolePath } from '../../utils/roleRoutes';

function NotificationDrawerPortal({ isOpen, onClose, children }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return createPortal(
    <div
      className={`notif-drawer-overlay${isOpen ? ' is-open' : ''}`}
      aria-hidden={!isOpen}
      onMouseDown={(event) => {
        if (isOpen && event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}

const TYPE_META = {
  info: { label: 'Info', className: 'notif-type-info' },
  success: { label: 'Success', className: 'notif-type-success' },
  project_assigned: { label: 'Project Assigned', className: 'notif-type-success' },
  warning: { label: 'Warning', className: 'notif-type-warning' },
  urgent: { label: 'Urgent', className: 'notif-type-urgent' }
};

function NotificationCenter({ collapsed = false, hideTrigger = false }) {
  const [notifications, setNotifications] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [liveToast, setLiveToast] = useState(null);
  const [osPermission, setOsPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  // Check and proactively request OS desktop notification permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    setOsPermission(Notification.permission);
    const askPermission = () => {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((perm) => setOsPermission(perm))
          .catch(() => {});
      }
    };
    askPermission();
    if (Notification.permission === 'default') {
      window.addEventListener('click', askPermission, { once: true });
      return () => window.removeEventListener('click', askPermission);
    }
    return undefined;
  }, []);

  // Helper to trigger real OS Desktop Notification outside of browser/site
  const triggerOsNotification = useCallback((incoming) => {
    if (!incoming || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const title = incoming.title || 'QA Software Workspace';
      const body = incoming.message || 'You have received a new notification.';
      const iconUrl = '/favicon.svg';

      const osNotif = new window.Notification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        tag: `qa-notif-${incoming.id || Date.now()}`,
        renotify: true
      });

      osNotif.onclick = () => {
        window.focus();
        if (incoming.link) {
          window.location.hash = `#${getRolePath(incoming.link)}`;
        }
      };
    } catch (err) {
      console.warn('Could not display OS notification:', err);
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('notifications-unread-count', { detail: { unreadCount } })
    );
  }, [unreadCount]);

  const fetchNotifications = useCallback(async () => {
    const token = getValidToken();
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
      if (err.response?.status !== 401) {
        console.warn('Could not load notifications:', err.message);
      }
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
    const token = getValidToken();
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

      const handleIncomingNotification = (incoming) => {
        if (!incoming) return;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        window.dispatchEvent(new Event('notifications-updated'));
        if (
          incoming.type?.includes('approval') ||
          incoming.type?.includes('testing_request') ||
          incoming.link === '/admin/approvals'
        ) {
          window.dispatchEvent(new CustomEvent('workspace-approvals-updated'));
        }
        setLiveToast(incoming);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setLiveToast(null), 6000);

        // Display outside of browser via OS Notification
        triggerOsNotification(incoming);
      };

      socket.on('new_notification', handleIncomingNotification);
      socket.on(`notification_user_${userId}`, handleIncomingNotification);

      socket.on('approval_created', () => {
        window.dispatchEvent(new CustomEvent('workspace-approvals-updated'));
      });
      socket.on('approval_updated', () => {
        window.dispatchEvent(new CustomEvent('workspace-approvals-updated'));
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
      {!hideTrigger && (
        <button
          id="notif-sidebar-trigger-btn"
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
      )}

      {liveToast && (
        <div
          id="notif-toast"
          className="notif-toast"
          role="status"
          aria-live="polite"
          style={liveToast.link ? { cursor: 'pointer' } : undefined}
          onClick={() => {
            if (liveToast.link) {
              window.location.hash = `#${getRolePath(liveToast.link)}`;
              setLiveToast(null);
            }
          }}
        >
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
            id="notif-toast-close-btn"
            type="button"
            className="notif-toast-close"
            onClick={() => setLiveToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <NotificationDrawerPortal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <section
          id="notif-drawer-section"
          className="notif-drawer-card"
          role="dialog"
          aria-modal={drawerOpen}
          aria-labelledby="notif-drawer-title"
        >
          <header id="notif-drawer-header" className="notif-drawer-header">
            <button
              id="notif-drawer-close-btn"
              type="button"
              className="notif-drawer-close-btn"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
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
            {unreadCount > 0 && (
              <div className="notif-drawer-header-actions">
                <button
                  id="notif-mark-all-read-btn"
                  type="button"
                  className="notif-mark-all-btn"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              </div>
            )}
          </header>

          {/* OS Desktop Notification Status Banner */}
          {osPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window ? (
            <div id="notif-os-permission-banner" className="notif-os-banner">
              <div className="notif-os-banner-icon">
                <Globe size={15} />
              </div>
              <div className="notif-os-banner-text">
                <strong>OS Desktop Notifications</strong>
                <span>Get alerts outside the browser when minimized</span>
              </div>
              <button
                id="notif-enable-os-btn"
                type="button"
                className="notif-enable-os-btn"
                onClick={async () => {
                  try {
                    const perm = await Notification.requestPermission();
                    setOsPermission(perm);
                    if (perm === 'granted') {
                      new window.Notification('OS Notifications Enabled! 🎉', {
                        body: 'You will now receive desktop alerts for projects and tickets outside the site.',
                        icon: '/favicon.svg'
                      });
                    }
                  } catch (e) {
                    console.warn('Could not request notification permission:', e);
                  }
                }}
              >
                Enable
              </button>
            </div>
          ) : (
            <div style={{ padding: '0 20px', marginTop: 6, marginBottom: 2 }}>
              <span className="notif-os-active-tag">
                <Check size={11} /> OS Desktop Alerts Active
              </span>
            </div>
          )}

            <div className="notif-drawer-tabs">
              <button
                id="notif-tab-all-btn"
                type="button"
                className={`notif-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({notifications.length})
              </button>
              <button
                id="notif-tab-unread-btn"
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
                      id={`notif-card-${item.id}`}
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
                            id={`notif-read-btn-${item.id}`}
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

                      <h4 id={`notif-title-${item.id}`} className="notif-item-title">{item.title}</h4>
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
                            ? formatIndianDateTime(item.created_at, 'Just now')
                            : 'Just now'}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
        </section>
      </NotificationDrawerPortal>
    </>
  );
}

export default NotificationCenter;
