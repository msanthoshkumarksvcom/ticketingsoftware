import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  Bell,
  Camera,
  Check,
  CheckCheck,
  CheckSquare,
  Eye,
  EyeOff,
  FolderKanban,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Palette,
  Rocket,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  Ticket,
  Trash2,
  User,
  UserCheck,
  Users,
  UsersRound
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import { applyTheme, getSavedTheme } from '../../utils/theme';
import { formatIndianDateTime } from '../../utils/dateFormat';
import '../../styles/admin.css';
import './AdminWorkspacePage.css';

const sections = {
  users: {
    title: 'Users',
    category: 'WORKSPACE DIRECTORY',
    description: 'Manage the people who have access to your QA workspace.',
    badge: 'User management',
    placeholderHeading: 'Your user page is ready',
    placeholderDescription: 'Add user records, roles, invitations, and management actions here when you are ready.',
    emptyMessage: 'No user list or user-management actions are connected yet.',
    Icon: UsersRound
  },
  projects: {
    title: 'Projects',
    category: 'PROJECT WORKSPACE',
    description: 'Organize and track the projects managed by your QA team.',
    badge: 'Project management',
    placeholderHeading: 'Your projects page is ready',
    placeholderDescription: 'Add your project list, ownership, status, and project management actions here when you are ready.',
    emptyMessage: 'No project list or project-management actions are connected yet.',
    Icon: FolderKanban
  },
  'roles-permissions': {
    title: 'Roles & permissions',
    category: 'ACCESS CONTROL',
    description: 'Manage workspace roles and the permissions assigned to each role.',
    badge: 'Access management',
    placeholderHeading: 'Your roles page is ready',
    placeholderDescription: 'Add role definitions, permission settings, and access management actions here when you are ready.',
    emptyMessage: 'No roles or permission settings are connected yet.',
    Icon: ShieldCheck
  },
  tickets: {
    title: 'Tickets',
    category: 'ISSUE TRACKING',
    description: 'Track QA issues, requests, and work that needs attention.',
    badge: 'Ticket management',
    placeholderHeading: 'Your tickets page is ready',
    placeholderDescription: 'Add your ticket list, statuses, assignments, and ticket management actions here when you are ready.',
    emptyMessage: 'No ticket list or ticket-management actions are connected yet.',
    Icon: Ticket
  },
  reports: {
    title: 'Reports',
    category: 'WORKSPACE INSIGHTS',
    description: 'Review quality activity and workspace reporting.',
    badge: 'Reporting',
    placeholderHeading: 'Your reports page is ready',
    placeholderDescription: 'Add report summaries, filters, visualizations, and export actions here when you are ready.',
    emptyMessage: 'No reports or reporting data are connected yet.',
    Icon: BarChart3
  },
  approvals: {
    title: 'Approvals & requests',
    category: 'REVIEW WORKFLOW',
    description: 'Review requests and manage items waiting for approval.',
    badge: 'Approval queue',
    placeholderHeading: 'Your approvals page is ready',
    placeholderDescription: 'Add pending requests, review details, and approve or decline actions here when you are ready.',
    emptyMessage: 'No approval queue or request-management actions are connected yet.',
    Icon: CheckSquare
  },
  'deployment-approval': {
    title: 'Deployment approval',
    category: 'RELEASE WORKFLOW',
    description: 'Review deployments and prepare the release approval workflow.',
    badge: 'Deployment workflow',
    placeholderHeading: 'Your deployment page is ready',
    placeholderDescription: 'Add deployment details, release checks, and approval actions here when you are ready.',
    emptyMessage: 'No deployment list or deployment-approval actions are connected yet.',
    Icon: Rocket
  },
  settings: {
    title: 'Application Settings',
    category: 'WORKSPACE CONFIGURATION',
    description: 'Manage application settings.',
    badge: 'Application Settings',
    Icon: Settings
  }
};

function SettingsContent() {
  const [theme, setTheme] = useState(() => getSavedTheme());
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeFeedback, setThemeFeedback] = useState({ text: '', type: '' });

  // Profile & Bio state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ text: '', type: '' });
  const [profileForm, setProfileForm] = useState({
    id: localStorage.getItem('userId') || '',
    full_name: localStorage.getItem('userName') || '',
    email: localStorage.getItem('userEmail') || '',
    emp_id: '',
    department: localStorage.getItem('userDepartment') || '',
    role: localStorage.getItem('userRole') || 'Member',
    phone: '',
    bio: localStorage.getItem('userBio') || '',
    avatar: localStorage.getItem('userAvatar') || ''
  });

  // Change Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ text: '', type: '' });
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Notifications state
  const [usersList, setUsersList] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [targetType, setTargetType] = useState('selected'); // 'selected' | 'all'
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifSending, setNotifSending] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState({ text: '', type: '' });
  const [historyTab, setHistoryTab] = useState('sent'); // 'sent' | 'inbox'
  const [sentNotifications, setSentNotifications] = useState([]);
  const [inboxNotifications, setInboxNotifications] = useState([]);

  const loadSettingsData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setProfileLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, recipientsRes, sentRes, inboxRes] = await Promise.allSettled([
        axios.get('http://localhost:5000/api/auth/me', { headers }),
        axios.get('http://localhost:5000/api/notifications/recipients', { headers }),
        axios.get('http://localhost:5000/api/notifications/sent', { headers }),
        axios.get('http://localhost:5000/api/notifications', { headers })
      ]);

      let currentUserId = Number(localStorage.getItem('userId')) || null;

      if (meRes.status === 'fulfilled' && meRes.value.data?.user) {
        const u = meRes.value.data.user;
        currentUserId = Number(u.id) || currentUserId;
        setProfileForm({
          id: u.id || '',
          full_name: u.full_name || '',
          email: u.email || '',
          emp_id: u.emp_id || '',
          department: u.department || '',
          role: u.role || 'Member',
          phone: u.phone || '',
          bio: u.bio || '',
          avatar: u.avatar || ''
        });
        if (u.id) localStorage.setItem('userId', String(u.id));
        if (u.full_name) localStorage.setItem('userName', u.full_name);
        if (u.role) localStorage.setItem('userRole', u.role);
        localStorage.setItem('userBio', u.bio || '');
        if (u.avatar) localStorage.setItem('userAvatar', u.avatar);
        else localStorage.removeItem('userAvatar');
      }

      if (recipientsRes.status === 'fulfilled' && Array.isArray(recipientsRes.value.data)) {
        setUsersList(recipientsRes.value.data);
      } else {
        try {
          const fallbackRes = await axios.get('http://localhost:5000/api/admin/users', { headers });
          if (Array.isArray(fallbackRes.data)) {
            setUsersList(
              fallbackRes.data.filter(
                (u) =>
                  (u.status || 'Active') === 'Active' &&
                  (!currentUserId || Number(u.id) !== currentUserId)
              )
            );
          }
        } catch (fallbackErr) {
          console.error('Failed fallback user directory load:', fallbackErr);
        }
      }

      if (sentRes.status === 'fulfilled' && Array.isArray(sentRes.value.data)) {
        setSentNotifications(sentRes.value.data);
      }
      if (inboxRes.status === 'fulfilled' && Array.isArray(inboxRes.value.data)) {
        setInboxNotifications(inboxRes.value.data);
      }
    } catch (err) {
      console.error('Error loading application settings:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  useEffect(() => {
    const syncNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const { data } = await axios.get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(data)) setInboxNotifications(data);
      } catch {}
    };
    window.addEventListener('notifications-updated', syncNotifications);
    window.addEventListener('notifications-refresh', syncNotifications);
    return () => {
      window.removeEventListener('notifications-updated', syncNotifications);
      window.removeEventListener('notifications-refresh', syncNotifications);
    };
  }, []);

  const handleSelectTheme = async (nextTheme) => {
    const normalized = applyTheme(nextTheme);
    setTheme(normalized);
    setThemeFeedback({ text: '', type: '' });

    const token = localStorage.getItem('token');
    if (!token) return;
    setThemeSaving(true);
    try {
      await axios.put(
        'http://localhost:5000/api/auth/theme',
        { theme: normalized },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setThemeFeedback({
        text: `${normalized === 'dark' ? 'Dark' : 'Light'} theme activated across the workspace.`,
        type: 'success'
      });
    } catch (err) {
      setThemeFeedback({
        text: err.response?.data?.error || 'Theme applied locally, but failed to save preference.',
        type: 'error'
      });
    } finally {
      setThemeSaving(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileFeedback({ text: 'Please select a PNG, JPG, or WebP image file.', type: 'error' });
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setProfileFeedback({ text: 'Profile image must be 1.5 MB or smaller.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, avatar: String(reader.result || '') }));
      setProfileFeedback({ text: 'Photo selected. Click "Save Profile & Bio" to apply.', type: 'success' });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileFeedback({ text: '', type: '' });

    const trimmedName = profileForm.full_name.trim();
    if (!trimmedName) {
      setProfileFeedback({ text: 'Full Name is required.', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setProfileSaving(true);
    try {
      const { data } = await axios.put(
        'http://localhost:5000/api/auth/profile',
        {
          full_name: trimmedName,
          phone: profileForm.phone.trim(),
          bio: profileForm.bio,
          avatar: profileForm.avatar || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = data?.user;
      if (updatedUser) {
        setProfileForm((prev) => ({
          ...prev,
          full_name: updatedUser.full_name || '',
          phone: updatedUser.phone || '',
          bio: updatedUser.bio || '',
          avatar: updatedUser.avatar || ''
        }));
        localStorage.setItem('userName', updatedUser.full_name || trimmedName);
        localStorage.setItem('userBio', updatedUser.bio || '');
        if (updatedUser.avatar) localStorage.setItem('userAvatar', updatedUser.avatar);
        else localStorage.removeItem('userAvatar');
        window.dispatchEvent(new CustomEvent('workspace-profile-updated', { detail: { user: updatedUser } }));
      }
      setProfileFeedback({ text: 'Profile and bio saved successfully.', type: 'success' });
    } catch (err) {
      setProfileFeedback({
        text: err.response?.data?.error || 'Failed to save profile changes.',
        type: 'error'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordFeedback({ text: '', type: '' });

    const { current_password, new_password, confirm_password } = passwordForm;
    if (!current_password || !new_password || !confirm_password) {
      setPasswordFeedback({ text: 'Please fill in all password fields.', type: 'error' });
      return;
    }
    if (new_password.length < 6) {
      setPasswordFeedback({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }
    if (new_password !== confirm_password) {
      setPasswordFeedback({ text: 'New password and confirm password do not match.', type: 'error' });
      return;
    }
    if (current_password === new_password) {
      setPasswordFeedback({ text: 'New password must be different from your current password.', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setPasswordSaving(true);
    try {
      const { data } = await axios.put(
        'http://localhost:5000/api/auth/change-password',
        { current_password, new_password, confirm_password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordVisibility({ current: false, next: false, confirm: false });
      setShowPasswordForm(false);
      setPasswordFeedback({
        text: data?.message || 'Password updated successfully.',
        type: 'success'
      });
    } catch (err) {
      setPasswordFeedback({
        text: err.response?.data?.error || 'Failed to update password.',
        type: 'error'
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter((u) =>
      [u.full_name, u.email, u.emp_id, u.role, u.department]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [usersList, recipientSearch]);

  const toggleRecipient = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    setNotifFeedback({ text: '', type: '' });

    if (!notifTitle.trim() || !notifMessage.trim()) {
      setNotifFeedback({ text: 'Please enter both a notification title and message.', type: 'error' });
      return;
    }
    if (targetType === 'selected' && selectedUserIds.length === 0) {
      setNotifFeedback({ text: 'Please select at least one user, or switch to "Common to All".', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setNotifSending(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.post(
        'http://localhost:5000/api/notifications/send',
        {
          targetType,
          userIds: targetType === 'selected' ? selectedUserIds : [],
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType
        },
        { headers }
      );

      setNotifTitle('');
      setNotifMessage('');
      if (targetType === 'selected') setSelectedUserIds([]);
      setNotifFeedback({ text: data?.message || 'Notification sent successfully.', type: 'success' });

      const [sentRes, inboxRes] = await Promise.all([
        axios.get('http://localhost:5000/api/notifications/sent', { headers }),
        axios.get('http://localhost:5000/api/notifications', { headers })
      ]);
      if (Array.isArray(sentRes.data)) setSentNotifications(sentRes.data);
      if (Array.isArray(inboxRes.data)) setInboxNotifications(inboxRes.data);
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch (err) {
      setNotifFeedback({
        text: err.response?.data?.error || 'Failed to send notification.',
        type: 'error'
      });
    } finally {
      setNotifSending(false);
    }
  };

  const handleMarkSingleRead = async (notifId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setInboxNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    try {
      await axios.put(
        `http://localhost:5000/api/notifications/${notifId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch {}
  };

  const handleMarkAllInboxRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setInboxNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await axios.put(
        'http://localhost:5000/api/notifications/read-all',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch {}
  };

  const unreadInboxCount = inboxNotifications.filter((n) => !n.is_read).length;

  const displayName =
    profileForm.full_name ||
    localStorage.getItem('userName') ||
    (profileForm.email ? profileForm.email.split('@')[0] : 'User');
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <main className="main-content">
      <div className="ws-settings-page">
        <div className="ws-header-row">
          <div>
            <h1>Application Settings</h1>
          </div>
        </div>

        <div className="ws-grid">
          {/* 1. THEME SECTION */}
          <section className="ws-card ws-col-half">
              <div className="ws-card-header">
                <div className="ws-card-title-group">
                  <div className="ws-card-icon">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3>Theme</h3>
                    <p>Switch between Light and Dark mode for the entire QA workspace.</p>
                  </div>
                </div>
                {themeSaving && <span className="ws-badge">Saving...</span>}
              </div>

              {themeFeedback.text && (
                <div className={`ws-feedback ${themeFeedback.type}`}>
                  <span>{themeFeedback.text}</span>
                </div>
              )}

              <div className="ws-theme-options">
                <button
                  type="button"
                  className={`ws-theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleSelectTheme('light')}
                >
                  <div className="ws-theme-preview light" aria-hidden="true">
                    <div className="ws-preview-nav" />
                    <div className="ws-preview-body">
                      <div className="ws-preview-bar" />
                      <div className="ws-preview-card" />
                    </div>
                  </div>
                  <div className="ws-theme-meta">
                    <div>
                      <span className="ws-theme-name">
                        <Sun size={15} /> Light
                      </span>
                      <span className="ws-theme-desc">Crisp bright interface</span>
                    </div>
                    {theme === 'light' && (
                      <span className="ws-active-pill">
                        <Check size={11} /> Active
                      </span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  className={`ws-theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleSelectTheme('dark')}
                >
                  <div className="ws-theme-preview dark" aria-hidden="true">
                    <div className="ws-preview-nav" />
                    <div className="ws-preview-body">
                      <div className="ws-preview-bar" />
                      <div className="ws-preview-card" />
                    </div>
                  </div>
                  <div className="ws-theme-meta">
                    <div>
                      <span className="ws-theme-name">
                        <Moon size={15} /> Dark
                      </span>
                      <span className="ws-theme-desc">Low-glare dark interface</span>
                    </div>
                    {theme === 'dark' && (
                      <span className="ws-active-pill">
                        <Check size={11} /> Active
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </section>

          {/* 2. PROFILE + BIO SECTION */}
          <section id="ws-profile-section" className="ws-card ws-col-half">
              <div className="ws-card-header">
                <div className="ws-card-title-group">
                  <div className="ws-card-icon">
                    <User size={20} />
                  </div>
                  <div>
                    <h3>Profile &amp; Bio</h3>
                    <p>View your account details, upload an avatar, and update your bio.</p>
                  </div>
                </div>
                {profileLoading && <span className="ws-badge">Loading...</span>}
              </div>

              {profileFeedback.text && (
                <div className={`ws-feedback ${profileFeedback.type}`}>
                  <span>{profileFeedback.text}</span>
                </div>
              )}

              <div className="ws-profile-top">
                <div className="ws-profile-identity">
                  <div className="ws-avatar-lg">
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt={displayName} />
                    ) : (
                      avatarLabel
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '15px', display: 'block' }}>{displayName}</strong>
                    <div className="ws-profile-badges">
                      <span className="ws-badge primary">{profileForm.role || 'Member'}</span>
                      {profileForm.emp_id && <span className="ws-badge">{profileForm.emp_id}</span>}
                      {profileForm.department && <span className="ws-badge">{profileForm.department}</span>}
                    </div>
                  </div>
                </div>

                <div className="ws-avatar-actions">
                  <label className="ws-btn-secondary" style={{ cursor: 'pointer' }}>
                    <Camera size={14} />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {profileForm.avatar && (
                    <button
                      type="button"
                      className="ws-btn-secondary"
                      onClick={() =>
                        setProfileForm((prev) => ({ ...prev, avatar: '' }))
                      }
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="ws-form-grid">
                <div className="ws-field">
                  <label htmlFor="ws-full-name">Full Name</label>
                  <input
                    id="ws-full-name"
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Enter your full name"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="ws-field">
                  <label htmlFor="ws-phone">Phone Number</label>
                  <input
                    id="ws-phone"
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+91 98765 43210"
                    maxLength={30}
                  />
                </div>

                <div className="ws-field">
                  <label htmlFor="ws-email">Email</label>
                  <input id="ws-email" type="email" value={profileForm.email} readOnly />
                </div>

                <div className="ws-field">
                  <label htmlFor="ws-role-dept">Role &amp; Employee ID</label>
                  <input
                    id="ws-role-dept"
                    type="text"
                    value={`${profileForm.role || 'Member'}${profileForm.emp_id ? ` • ${profileForm.emp_id}` : ''}`}
                    readOnly
                  />
                </div>

                <div className="ws-field full">
                  <label htmlFor="ws-bio">
                    <span>Bio</span>
                    <span className="ws-char-count">{profileForm.bio.length} / 1000</span>
                  </label>
                  <textarea
                    id="ws-bio"
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Write a short bio about your role, specialties, and team focus..."
                    maxLength={1000}
                  />
                </div>

                <div className="ws-field full ws-card-actions">
                  <button type="submit" className="ws-btn-primary" disabled={profileSaving}>
                    <Save size={15} />
                    <span>{profileSaving ? 'Saving Profile...' : 'Save Profile & Bio'}</span>
                  </button>
                </div>
              </form>

              <div className="ws-password-section">
                <div className="ws-password-header">
                  <div className="ws-password-title">
                    <div className="ws-password-icon">
                      <Lock size={16} />
                    </div>
                    <div>
                      <strong>Change Password</strong>
                      <span>Update your workspace account password anytime.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ws-btn-secondary"
                    onClick={() => {
                      setShowPasswordForm((prev) => !prev);
                      setPasswordFeedback({ text: '', type: '' });
                    }}
                  >
                    <KeyRound size={14} />
                    <span>{showPasswordForm ? 'Close' : 'Change Password'}</span>
                  </button>
                </div>

                {passwordFeedback.text && (
                  <div className={`ws-feedback ${passwordFeedback.type}`}>
                    <span>{passwordFeedback.text}</span>
                  </div>
                )}

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="ws-form-grid">
                    {[
                      {
                        key: 'current',
                        field: 'current_password',
                        id: 'ws-current-password',
                        label: 'Current Password',
                        placeholder: 'Enter current password',
                        autoComplete: 'current-password',
                        full: true
                      },
                      {
                        key: 'next',
                        field: 'new_password',
                        id: 'ws-new-password',
                        label: 'New Password',
                        placeholder: 'Minimum 6 characters',
                        autoComplete: 'new-password'
                      },
                      {
                        key: 'confirm',
                        field: 'confirm_password',
                        id: 'ws-confirm-password',
                        label: 'Confirm New Password',
                        placeholder: 'Re-enter new password',
                        autoComplete: 'new-password'
                      }
                    ].map(({ key, field, id, label, placeholder, autoComplete, full }) => {
                      const isVisible = Boolean(passwordVisibility[key]);
                      return (
                        <div key={key} className={`ws-field${full ? ' full' : ''}`}>
                          <label htmlFor={id}>{label}</label>
                          <div className="ws-password-input-wrap">
                            <input
                              id={id}
                              type={isVisible ? 'text' : 'password'}
                              value={passwordForm[field]}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }))
                              }
                              placeholder={placeholder}
                              autoComplete={autoComplete}
                              maxLength={128}
                              required
                            />
                            <button
                              type="button"
                              className="ws-password-eye-btn"
                              onClick={() =>
                                setPasswordVisibility((prev) => ({
                                  ...prev,
                                  [key]: !prev[key]
                                }))
                              }
                              aria-label={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                            >
                              {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="ws-field full ws-card-actions">
                      <button
                        type="button"
                        className="ws-btn-secondary"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                          setPasswordFeedback({ text: '', type: '' });
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="ws-btn-primary" disabled={passwordSaving}>
                        <KeyRound size={15} />
                        <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>

          {/* 3. SEND NOTIFICATION (SELECTED USER OR COMMON TO ALL) */}
          <section className="ws-card ws-col-full">
              <div className="ws-card-header">
                <div className="ws-card-title-group">
                  <div className="ws-card-icon">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3>Send Notification</h3>
                    <p>
                      Notify specific selected team members or broadcast a common announcement to everyone.
                    </p>
                  </div>
                </div>
                <span className="ws-badge primary">
                  <Users size={12} /> {usersList.length} active user{usersList.length === 1 ? '' : 's'}
                </span>
              </div>

              {notifFeedback.text && (
                <div className={`ws-feedback ${notifFeedback.type}`}>
                  <span>{notifFeedback.text}</span>
                </div>
              )}

              <div className="ws-notif-layout">
                <form onSubmit={handleSendNotification} className="ws-form-grid">
                  <div className="ws-field full">
                    <label>Target Audience</label>
                    <div className="ws-audience-toggle">
                      <button
                        type="button"
                        className={`ws-audience-btn ${targetType === 'selected' ? 'active' : ''}`}
                        onClick={() => setTargetType('selected')}
                      >
                        <UserCheck size={18} color="#2563EB" />
                        <div>
                          <strong>Selected User</strong>
                          <span>Pick specific users ({selectedUserIds.length} selected)</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`ws-audience-btn ${targetType === 'all' ? 'active' : ''}`}
                        onClick={() => setTargetType('all')}
                      >
                        <Globe size={18} color="#7C3AED" />
                        <div>
                          <strong>Common to All</strong>
                          <span>Broadcast to all {usersList.length} active users</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {targetType === 'selected' ? (
                    <div className="ws-field full">
                      <div className="ws-recipient-picker">
                        <div className="ws-recipient-toolbar">
                          <div className="ws-recipient-search">
                            <Search size={14} />
                            <input
                              type="text"
                              placeholder="Search users by name, role, emp ID, email..."
                              value={recipientSearch}
                              onChange={(e) => setRecipientSearch(e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="ws-mini-btn"
                            onClick={() =>
                              setSelectedUserIds(filteredRecipients.map((u) => u.id))
                            }
                          >
                            Select All ({filteredRecipients.length})
                          </button>
                          {selectedUserIds.length > 0 && (
                            <button
                              type="button"
                              className="ws-mini-btn"
                              onClick={() => setSelectedUserIds([])}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="ws-recipient-list">
                          {filteredRecipients.length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                              No matching active users found.
                            </div>
                          ) : (
                            filteredRecipients.map((u) => {
                              const isSelected = selectedUserIds.includes(u.id);
                              const userLabel = u.full_name || u.email || 'User';
                              return (
                                <label
                                  key={u.id}
                                  className={`ws-recipient-row ${isSelected ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleRecipient(u.id)}
                                  />
                                  <div className="ws-recipient-avatar" aria-hidden="true">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt="" />
                                    ) : (
                                      userLabel.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="ws-recipient-info">
                                    <strong>
                                      {userLabel}
                                      {u.emp_id ? ` (${u.emp_id})` : ''}
                                    </strong>
                                    <span>
                                      {u.role || 'Member'}
                                      {u.department ? ` · ${u.department}` : ''} · {u.email}
                                    </span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ws-field full">
                      <div className="ws-broadcast-banner">
                        <Globe size={16} />
                        <span>
                          Common to All selected: this notification will be delivered to every active member ({usersList.length} users).
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="ws-field">
                    <label htmlFor="ws-notif-title">Notification Title *</label>
                    <input
                      id="ws-notif-title"
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g., Regression Build Ready or Maintenance Notice"
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="ws-field">
                    <label htmlFor="ws-notif-type">Notification Type</label>
                    <select
                      id="ws-notif-type"
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value)}
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="ws-field full">
                    <label htmlFor="ws-notif-msg">Message *</label>
                    <textarea
                      id="ws-notif-msg"
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Write the notification message..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="ws-field full ws-card-actions">
                    <button type="submit" className="ws-btn-primary" disabled={notifSending}>
                      <Send size={15} />
                      <span>
                        {notifSending
                          ? 'Sending...'
                          : targetType === 'all'
                          ? 'Send to All Users'
                          : 'Send to Selected Users'}
                      </span>
                    </button>
                  </div>
                </form>

                <div className="ws-history-panel">
                  <div className="ws-history-header">
                    <div className="ws-tab-strip">
                      <button
                        type="button"
                        className={`ws-tab-btn ${historyTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setHistoryTab('sent')}
                      >
                        Sent ({sentNotifications.length})
                      </button>
                      <button
                        type="button"
                        className={`ws-tab-btn ${historyTab === 'inbox' ? 'active' : ''}`}
                        onClick={() => setHistoryTab('inbox')}
                      >
                        My Inbox ({unreadInboxCount} unread)
                      </button>
                    </div>
                    {historyTab === 'inbox' && unreadInboxCount > 0 && (
                      <button
                        type="button"
                        className="ws-mini-btn"
                        onClick={handleMarkAllInboxRead}
                      >
                        <CheckCheck size={12} style={{ marginRight: '4px' }} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="ws-history-list">
                    {historyTab === 'sent' ? (
                      sentNotifications.length === 0 ? (
                        <div className="notif-empty-state">No notifications sent by you yet.</div>
                      ) : (
                        sentNotifications.map((item) => (
                          <div key={item.id} className="ws-history-item">
                            <div className="ws-history-item-top">
                              <strong>{item.title}</strong>
                              <span className="ws-badge primary">
                                {item.audience === 'all'
                                  ? `Common to All (${item.recipient_count})`
                                  : `${item.recipient_count} Selected`}
                              </span>
                            </div>
                            <p>{item.message}</p>
                            <div className="ws-history-item-meta">
                              <span title={item.recipients_summary}>
                                To: {item.audience === 'all' ? 'All active users' : item.recipients_summary}
                              </span>
                              <span>
                                {item.created_at ? formatIndianDateTime(item.created_at, '') : ''}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    ) : inboxNotifications.length === 0 ? (
                      <div className="notif-empty-state">No received notifications yet.</div>
                    ) : (
                      inboxNotifications.map((item) => (
                        <div
                          key={item.id}
                          className={`ws-history-item ${item.is_read ? '' : 'unread'}`}
                        >
                          <div className="ws-history-item-top">
                            <strong>{item.title}</strong>
                            {!item.is_read && (
                              <button
                                type="button"
                                className="ws-mini-btn"
                                onClick={() => handleMarkSingleRead(item.id)}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          {item.message && <p>{item.message}</p>}
                          <div className="ws-history-item-meta">
                            <span>
                              {item.sender_name ? `From ${item.sender_name}` : 'System'}
                              {item.audience === 'all' ? ' · Common to All' : ''}
                            </span>
                            <span>
                              {item.created_at ? formatIndianDateTime(item.created_at, '') : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
        </div>
      </div>
    </main>
  );
}

function AdminWorkspacePage({ section }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const page = sections[section];

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  if (!page) {
    return null;
  }

  return (
    <div className="admin-layout">
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="workspace-logout-title">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title" id="workspace-logout-title">Sign out of your workspace?</h2>
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

      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      {section === 'settings' ? (
        <SettingsContent />
      ) : (
        <main className="main-content">
          <div className="dashboard-container users-page">
            <section className="users-page-heading">
              <div>
                <span className="section-kicker">{page.category}</span>
                <h1>{page.title}</h1>
                <p>{page.description}</p>
              </div>
              <span className="users-count">{page.badge}</span>
            </section>

            <section className="users-placeholder">
              <div className="users-placeholder-icon"><page.Icon size={25} /></div>
              <span className="section-kicker">{page.category}</span>
              <h2>{page.placeholderHeading}</h2>
              <p>{page.placeholderDescription}</p>
              <div className="users-placeholder-note">
                <span className="snapshot-dot" />
                {page.emptyMessage}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

export default AdminWorkspacePage;
