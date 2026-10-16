import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckSquare, Bell, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import '../../styles/admin.css';
import '../../styles/RoleDashboard.css';

export default function QAMemberDashboard() {
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

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'QA Member');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {/* Sign Out Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your QA account.</p>
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
        roleName="QA Member"
        homeRoute="/qa-member"
        onLogout={() => setShowLogoutModal(true)}
      />

      <main className="main-content">
        {/* Top Header */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-divider">/</span><strong>QA Member Dashboard</strong>
          </div>
          <div className="header-right">
            <button className="notification-bell" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar" style={{ background: '#059669' }}>{avatarLabel}</div>
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
          {/* Welcome Message Card */}
          <section className="role-welcome-card" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)' }}>
            <div className="role-welcome-content">
              <div className="role-eyebrow" style={{ color: '#6ee7b7', background: 'rgba(110, 231, 183, 0.12)', borderColor: 'rgba(110, 231, 183, 0.2)' }}>
                <CheckSquare size={13} /> QA Testing Workspace
              </div>
              <h1>Welcome, QA Member {displayName}!</h1>
              <p>
                Your quality assurance dashboard is active. Test execution suites, bug logging forms, and verification queues will be configured here.
              </p>
              <div className="role-meta-row">
                <span className="role-status-live">
                  <span className="role-live-dot" /> Online
                </span>
                <span className="role-badge-pill">Role: QA Member</span>
                <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="role-card-glow" style={{ background: 'radial-gradient(circle, rgba(5, 150, 105, 0.25) 0%, rgba(5, 150, 105, 0) 70%)' }} />
          </section>

          {/* Clean Empty Workspace Canvas */}
          <section className="role-empty-canvas">
            <div className="role-empty-icon-wrap icon-wrap-qa">
              <CheckSquare size={34} />
            </div>
            <h3>QA Member Workspace Canvas</h3>
            <p>
              This dashboard is ready for further implementation. We can now add test run execution, defect reporting, or ticket verification tools as you direct.
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
