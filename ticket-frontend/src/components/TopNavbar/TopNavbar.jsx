import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { getSavedTheme, applyTheme } from '../../utils/theme';
import { getRolePath } from '../../utils/roleRoutes';
import NotificationCenter from '../NotificationCenter/NotificationCenter';
import './TopNavbar.css';

export default function TopNavbar({
  pageTitle = 'Dashboard',
  breadcrumbs = [],
  actions = null
}) {
  const [profile, setProfile] = useState(() => ({
    name: typeof window !== 'undefined' ? (window.localStorage.getItem('userName') || '') : '',
    email: typeof window !== 'undefined' ? (window.localStorage.getItem('userEmail') || '') : '',
    role: typeof window !== 'undefined' ? (window.localStorage.getItem('userRole') || '') : '',
    avatar: typeof window !== 'undefined' ? (window.localStorage.getItem('userAvatar') || '') : ''
  }));
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [theme, setTheme] = useState(() => getSavedTheme());
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Listen to unread notification count updates
  useEffect(() => {
    const handleCount = (e) => {
      if (typeof e?.detail?.unreadCount === 'number') {
        setUnreadNotifCount(e.detail.unreadCount);
      }
    };
    window.addEventListener('notifications-unread-count', handleCount);
    return () => window.removeEventListener('notifications-unread-count', handleCount);
  }, []);

  // Keep live time ticking smoothly every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatar]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!dropdownOpen) return undefined;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Close logout confirmation modal on Escape
  useEffect(() => {
    if (!showLogoutModal) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowLogoutModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setDropdownOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDepartment');
    localStorage.removeItem('userBio');
    localStorage.removeItem('userAvatar');
    navigate('/', { replace: true });
  };

  const handleRequestLogout = () => {
    confirmLogout();
  };

  // Sync theme changes
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e?.detail?.theme) {
        setTheme(e.detail.theme);
      }
    };
    window.addEventListener('workspace-theme-changed', handleThemeChange);
    return () => window.removeEventListener('workspace-theme-changed', handleThemeChange);
  }, []);

  // Sync profile details
  useEffect(() => {
    const syncProfile = () => {
      setProfile({
        name: window.localStorage.getItem('userName') || '',
        email: window.localStorage.getItem('userEmail') || '',
        role: window.localStorage.getItem('userRole') || '',
        avatar: window.localStorage.getItem('userAvatar') || ''
      });
    };

    const handleProfileUpdated = (e) => {
      const u = e?.detail?.user;
      if (u) {
        setProfile({
          name: u.full_name || window.localStorage.getItem('userName') || '',
          email: u.email || window.localStorage.getItem('userEmail') || '',
          role: u.role || window.localStorage.getItem('userRole') || '',
          avatar: u.avatar || ''
        });
      } else {
        syncProfile();
      }
    };

    window.addEventListener('workspace-profile-updated', handleProfileUpdated);
    window.addEventListener('storage', syncProfile);

    return () => {
      window.removeEventListener('workspace-profile-updated', handleProfileUpdated);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const handleOpenNotifications = () => {
    window.dispatchEvent(new CustomEvent('open-notifications-drawer'));
  };

  const displayName = profile.name.trim() || (profile.email ? profile.email.split('@')[0] : 'QA Lead');
  // Two-letter initials or single uppercase initial
  const getInitials = (name) => {
    if (!name) return 'QA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const initials = getInitials(displayName);

  // Formatted date (e.g., "Tue, Nov 24, 2026") and time (e.g., "03:45 PM")
  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="top-navbar-sticky-wrapper" id="workspace-top-header-wrapper">
      <header className="top-header-navbar" id="workspace-top-header">
        {/* Left Area: Breadcrumbs & Live Date / Time Badge */}
        <div className="top-nav-left">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="top-nav-breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.to || crumb.label || idx}>
                  {idx > 0 && <span className="top-nav-breadcrumb-sep">/</span>}
                  {crumb.to ? (
                    <Link to={crumb.to} className="top-nav-breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="top-nav-breadcrumb-current">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Sleek Enterprise Live Date & Time Pill */}
          <div
            className="top-nav-datetime-pill"
            id="top-nav-live-clock"
            title={`Workspace Time: ${formattedDate} ${formattedTime}`}
          >
            <div className="top-nav-date-section">
              <Calendar size={13} className="top-nav-datetime-icon" aria-hidden="true" />
              <span className="top-nav-date-val">{formattedDate}</span>
            </div>
            <span className="top-nav-datetime-dot" aria-hidden="true" />
            <div className="top-nav-time-section">
              <Clock size={13} className="top-nav-datetime-icon time-icon" aria-hidden="true" />
              <span className="top-nav-time-val">{formattedTime}</span>
              <span className="top-nav-live-pulse" title="System clock synced" aria-hidden="true" />
            </div>
          </div>
        </div>

      {/* Right Area: Custom Actions, Theme Switcher, Notifications & User Pill */}
      <div className="top-nav-right">
        {actions}

        {/* Light / Dark Mode Toggle Button */}
        <button
          id="top-nav-theme-toggle-btn"
          type="button"
          className="top-nav-theme-btn"
          onClick={handleToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        {/* Notification Bell with Unread Badge */}
        <button
          id="top-nav-bell-btn"
          type="button"
          className="top-nav-icon-btn top-nav-bell"
          onClick={handleOpenNotifications}
          aria-label="Notifications"
          title="Open Notifications"
        >
          <Bell size={17} />
          {unreadNotifCount > 0 && (
            <span className="top-nav-bell-badge">{unreadNotifCount}</span>
          )}
        </button>

        {/* User Profile Pill & Dropdown Menu */}
        <div className="top-nav-profile-wrapper" ref={dropdownRef}>
          <button
            id="top-nav-user-pill-btn"
            type="button"
            className={`top-nav-profile-pill${dropdownOpen ? ' active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            aria-label={`User menu for ${displayName}`}
            title={`${displayName} (${profile.role || 'QA Lead'})`}
          >
            <div className="top-nav-avatar-box">
              {profile.avatar && !avatarFailed ? (
                <img
                  src={profile.avatar}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="top-nav-profile-text">
              <span className="top-nav-user-name">{displayName}</span>
              <span className="top-nav-user-role">{profile.role || 'QA Lead'}</span>
            </div>
            <ChevronDown
              size={14}
              className={`top-nav-profile-chevron${dropdownOpen ? ' rotated' : ''}`}
              aria-hidden="true"
            />
          </button>

          {dropdownOpen && (
            <div className="top-nav-user-dropdown" role="menu" aria-orientation="vertical">
              <div className="dropdown-user-header">
                <div className="dropdown-avatar-box">
                  {profile.avatar && !avatarFailed ? (
                    <img
                      src={profile.avatar}
                      alt={displayName}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{displayName}</span>
                  <span className="dropdown-user-email" title={profile.email || 'No email'}>
                    {profile.email || 'qa@enterprise.local'}
                  </span>
                  <span className="dropdown-role-badge">
                    {profile.role || 'QA Lead'}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <div className="dropdown-menu-list">
                <Link
                  id="top-nav-dropdown-settings-link"
                  to={getRolePath('/settings')}
                  className="dropdown-menu-item"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings size={16} className="dropdown-item-icon" />
                  <span>Account Settings</span>
                </Link>
              </div>

              <div className="dropdown-divider" />
              <div className="dropdown-menu-footer">
                <button
                  id="top-nav-dropdown-logout-btn"
                  type="button"
                  className="dropdown-menu-item logout-item"
                  role="menuitem"
                  onClick={handleRequestLogout}
                >
                  <LogOut size={16} className="dropdown-item-icon logout-icon" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    <NotificationCenter hideTrigger />
    {showLogoutModal && typeof document !== 'undefined' && createPortal(
      <div
        id="top-nav-logout-modal-overlay"
        className="topnav-logout-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLogoutModal(false);
        }}
      >
        <section
          id="top-nav-logout-modal"
          className="topnav-logout-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="top-nav-logout-title"
        >
          <header className="topnav-logout-header">
            <div className="topnav-logout-header-left">
              <div className="topnav-logout-icon">
                <LogOut size={19} />
              </div>
              <div className="topnav-logout-titles">
                <h3 id="top-nav-logout-title" className="topnav-logout-title">
                  Confirm Sign Out
                </h3>
                <p className="topnav-logout-subtitle">
                  End your active workspace session
                </p>
              </div>
            </div>
            <button
              id="top-nav-logout-close-btn"
              type="button"
              className="topnav-logout-close"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Close sign out confirmation"
            >
              <X size={18} />
            </button>
          </header>

          <div className="topnav-logout-body">
            <p className="topnav-logout-text">
              Are you sure you want to sign out of <strong>QA Software</strong>? Any unsaved changes on this page may be lost.
            </p>

            <div className="topnav-logout-account-card">
              <div className="topnav-logout-avatar">
                {profile.avatar && !avatarFailed ? (
                  <img src={profile.avatar} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="topnav-logout-account-meta">
                <strong>{displayName}</strong>
                <span>{profile.email || 'Signed-in workspace account'}</span>
              </div>
              {profile.role && (
                <span className="topnav-logout-role-pill">{profile.role}</span>
              )}
            </div>
          </div>

          <footer className="topnav-logout-footer">
            <button
              id="top-nav-logout-cancel-btn"
              type="button"
              className="topnav-logout-btn cancel"
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </button>
            <button
              id="top-nav-logout-confirm-btn"
              type="button"
              className="topnav-logout-btn confirm"
              onClick={confirmLogout}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </footer>
        </section>
      </div>,
      document.body
    )}
  </div>
  );
}
