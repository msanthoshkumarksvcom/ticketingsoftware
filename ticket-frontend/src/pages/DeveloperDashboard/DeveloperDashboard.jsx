import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code2, Bell, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import '../../styles/admin.css';
import '../../styles/RoleDashboard.css';

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    // Fetch user details
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
        // quiet fallback
      }
    };
    fetchMe();
  }, [navigate]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    navigate('/', { replace: true });
  };

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Developer');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your developer account.</p>
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
        {/* Top Header */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Developer Dashboard</strong>
          </div>
          <div className="header-right">
            <button className="notification-bell" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar" style={{ background: '#2563eb' }}>{avatarLabel}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Developer</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="role-dashboard-container">
          {/* Welcome Message Card */}
          <section className="role-welcome-card">
            <div className="role-welcome-content">
              <div className="role-eyebrow">
                <Code2 size={13} /> Developer Workspace
              </div>
              <h1>Welcome, Developer {displayName}!</h1>
              <p>
                Your personal engineering dashboard is active. Your assigned tickets, bug fixes, and development tools will be configured here.
              </p>
              <div className="role-meta-row">
                <span className="role-status-live">
                  <span className="role-live-dot" /> Online
                </span>
                <span className="role-badge-pill">Role: Developer</span>
                <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="role-card-glow" />
          </section>

          {/* Clean Empty Workspace Canvas */}
          <section className="role-empty-canvas">
            <div className="role-empty-icon-wrap icon-wrap-dev">
              <Code2 size={34} />
            </div>
            <h3>Developer Workspace Canvas</h3>
            <p>
              This dashboard is ready for further implementation. We can now add your specific code tasks, assigned bug queues, or sprint tools as you direct.
            </p>
            <span className="role-ready-tag">
              <CheckCircle2 size={14} color="#10b981" /> Workspace Ready &bull; Awaiting Further Implementation
            </span>
          </section>
        </div>
      </main>
    </div>
  );
}
