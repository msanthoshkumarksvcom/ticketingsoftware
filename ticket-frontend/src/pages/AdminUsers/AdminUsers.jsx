import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  Code2,
  Crown,
  Eye,
  Headphones,
  IdCard,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UserX,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import '../../styles/admin.css';
import './AdminUsers.css';

const PROTECTED_EMAILS = ['manager@gmail.com', 'qalead@gmail.com'];

const AVAILABLE_ROLES = [
  'Manager',
  'QA Lead',
  'QA Member',
  'Developer',
  'Project Lead'
];

const AVAILABLE_DEPARTMENTS = [
  'Quality Assurance',
  'Development',
  'Operations',
  'Support',
  'Management'
];

const initialFormData = {
  emp_id: '',
  full_name: '',
  email: '',
  department: 'Quality Assurance',
  role: 'QA Member',
  phone: '',
  status: 'Active',
  avatar: ''
};

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const createFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const [userEmail] = useState(() => localStorage.getItem('userEmail') || 'manager@gmail.com');

  const isProtectedUser = (email) => {
    return Boolean(email && PROTECTED_EMAILS.includes(email.toLowerCase().trim()));
  };

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Compute next auto-generated Employee ID
  const getNextEmpId = useCallback(() => {
    if (!users || users.length === 0) return 'EMP-007';
    let maxNum = 0;
    users.forEach((u) => {
      if (u.emp_id) {
        const match = u.emp_id.match(/EMP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  }, [users]);

  // Open Create Modal with auto-generated ID & blank user-selected avatar
  const handleOpenCreateModal = () => {
    setFormError('');
    const autoId = getNextEmpId();
    setFormData({
      ...initialFormData,
      emp_id: autoId,
      avatar: '' // NOT pre-selected: must be chosen by user
    });
    setIsCreateModalOpen(true);
  };

  // Form Input Change Handlers
  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  // Avatar Image Selection Handler
  const handleAvatarSelect = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, avatar: base64 }));
      } else {
        setFormData((prev) => ({ ...prev, avatar: base64 }));
      }
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = (isEdit = false) => {
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, avatar: '' }));
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    } else {
      setFormData((prev) => ({ ...prev, avatar: '' }));
      if (createFileInputRef.current) createFileInputRef.current.value = '';
    }
  };

  // Open Edit Modal
  const openEditModal = (user) => {
    if (isProtectedUser(user.email)) return;
    setFormError('');
    setEditFormData({
      id: user.id,
      emp_id: user.emp_id || '',
      full_name: user.full_name || '',
      email: user.email || '',
      department: user.department || 'Quality Assurance',
      role: user.role || 'QA Member',
      phone: user.phone || '',
      status: user.status || 'Active',
      avatar: user.avatar || ''
    });
    setIsEditModalOpen(true);
  };

  // Create User Submission
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError('Please enter the user full name.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (isProtectedUser(formData.email)) {
      setFormError('This email is reserved for a protected system account.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      // Format phone with +91 if 10-digit entered
      let formattedPhone = formData.phone.trim();
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91 ${formattedPhone}`;
      }

      const payload = {
        ...formData,
        phone: formattedPhone
      };

      const response = await axios.post(
        'http://localhost:5000/api/admin/users',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) => [...prev, response.data.user]);
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error creating user:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update User Submission
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!editFormData.full_name.trim()) {
      setFormError('Please enter the user full name.');
      return;
    }

    if (!editFormData.email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (isProtectedUser(editFormData.email)) {
      setFormError('Cannot assign a reserved inbuilt system email address.');
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      let formattedPhone = editFormData.phone.trim();
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = `+91 ${formattedPhone}`;
      }

      const payload = {
        ...editFormData,
        phone: formattedPhone
      };

      const response = await axios.put(
        `http://localhost:5000/api/admin/users/${editFormData.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === editFormData.id ? response.data.user : u))
      );
      setIsEditModalOpen(false);
      setEditFormData(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setFormError(
        error.response?.data?.error || 'Failed to update user. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User Confirmation
  const confirmDeleteUser = async () => {
    if (!userToDelete || isProtectedUser(userToDelete.email)) return;

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  // Metrics Calculations
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status !== 'Inactive').length;
    const inactive = users.filter((u) => u.status === 'Inactive').length;
    const departments = new Set(
      users.map((u) => u.department || 'Quality Assurance')
    ).size;

    return {
      total: total || 24,
      active: active || 20,
      inactive: inactive || 3,
      departments: departments || 5
    };
  }, [users]);

  // Filtering and Sorting
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.emp_id?.toLowerCase().includes(query) ||
          u.department?.toLowerCase().includes(query) ||
          u.role?.toLowerCase().includes(query);

        const matchesDept =
          departmentFilter === 'All' || u.department === departmentFilter;
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        const matchesStatus =
          statusFilter === 'All' || (u.status || 'Active') === statusFilter;

        return matchesSearch && matchesDept && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.full_name || '').localeCompare(b.full_name || '');
        }
        if (sortBy === 'empid') {
          return (a.emp_id || '').localeCompare(b.emp_id || '');
        }
        if (sortBy === 'role') {
          return (a.role || '').localeCompare(b.role || '');
        }
        if (a.emp_id && b.emp_id) {
          return a.emp_id.localeCompare(b.emp_id);
        }
        return a.id - b.id;
      });
  }, [users, searchQuery, departmentFilter, roleFilter, statusFilter, sortBy]);

  // Avatar Color Palette for fallback letter circles
  const getAvatarStyle = (index, name = '') => {
    const colors = [
      '#2563eb', // Blue
      '#9333ea', // Purple
      '#3b82f6', // Sky
      '#db2777', // Pink
      '#ea580c', // Orange
      '#0891b2', // Cyan
      '#059669', // Emerald
      '#4f46e5'  // Indigo
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const color = colors[(index + sum) % colors.length];
    return { backgroundColor: color };
  };

  // Badge renderers
  const renderDepartmentBadge = (dept) => {
    const d = dept || 'Quality Assurance';
    let className = 'dept-qa';
    let Icon = Building2;

    if (d.toLowerCase().includes('develop')) {
      className = 'dept-dev';
      Icon = Code2;
    } else if (d.toLowerCase().includes('operat')) {
      className = 'dept-ops';
      Icon = Settings;
    } else if (d.toLowerCase().includes('support')) {
      className = 'dept-support';
      Icon = Headphones;
    } else if (d.toLowerCase().includes('manage')) {
      className = 'dept-management';
      Icon = Briefcase;
    }

    return (
      <span className={`um-dept-badge ${className}`}>
        <Icon size={13} />
        <span>{d}</span>
      </span>
    );
  };

  const renderRoleBadge = (role) => {
    const r = role || 'QA Member';
    let className = 'role-qamember';
    let Icon = Search;

    if (r.toLowerCase() === 'manager' || r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator') {
      className = 'role-manager';
      Icon = Crown;
    } else if (r.toLowerCase().includes('lead') && r.toLowerCase().includes('qa')) {
      className = 'role-qalead';
      Icon = Crown;
    } else if (r.toLowerCase().includes('project') || r.toLowerCase().includes('lead')) {
      className = 'role-projectlead';
      Icon = Briefcase;
    } else if (r.toLowerCase().includes('dev')) {
      className = 'role-developer';
      Icon = Code2;
    } else if (r.toLowerCase().includes('qa')) {
      className = 'role-qamember';
      Icon = Search;
    } else {
      className = 'role-fallback';
      Icon = UserCheck;
    }

    return (
      <span className={`um-role-badge ${className}`}>
        <Icon size={13} />
        <span>{r}</span>
      </span>
    );
  };

  const displayName = userEmail ? userEmail.split('@')[0] : 'admin1';
  const displayAvatar = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">›</span>
            <span>Users</span>
            <span className="breadcrumb-divider">›</span>
            <strong>User Management</strong>
          </div>

          <div className="header-right">
            <div className="header-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              className="notification-bell"
              onClick={fetchUsers}
              title="Refresh users directory"
              aria-label="Refresh users list"
            >
              <Bell size={17} />
              <span className="notification-count" />
            </button>

            <div className="profile-divider" />

            <div className="user-profile">
              <div className="avatar" style={{ background: '#9333ea', color: '#fff' }}>
                {displayAvatar}
              </div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">Administrator</span>
              </div>
              <ChevronDown size={14} className="profile-chevron" />
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="dashboard-container">
          <div className="users-page-layout">
            {/* Page Header */}
            <div className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <Users size={24} />
                </div>
                <div className="um-header-titles">
                  <h1>User Management</h1>
                  <p>
                    Add and manage team members, departments, roles, and employee IDs. Control access and permissions across the QA workspace.
                  </p>
                </div>
              </div>

              <button
                className="um-btn-create"
                onClick={handleOpenCreateModal}
              >
                <Plus size={18} />
                <span>Create User</span>
              </button>
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="um-stats-grid">
              {/* Card 1: Total Users */}
              <div className="um-stat-card">
                <div className="um-stat-icon-wrap icon-wrap-blue">
                  <Users size={22} />
                </div>
                <div className="um-stat-content">
                  <div className="um-stat-top">
                    <span className="um-stat-number">{stats.total}</span>
                    <span className="um-stat-trend trend-up">↑ 12% vs last month</span>
                  </div>
                  <div className="um-stat-label">Total Users</div>
                </div>
              </div>

              {/* Card 2: Active Users */}
              <div className="um-stat-card">
                <div className="um-stat-icon-wrap icon-wrap-green">
                  <ShieldCheck size={22} />
                </div>
                <div className="um-stat-content">
                  <div className="um-stat-top">
                    <span className="um-stat-number">{stats.active}</span>
                    <span className="um-stat-trend trend-up">↑ 5% vs last month</span>
                  </div>
                  <div className="um-stat-label">Active Users</div>
                </div>
              </div>

              {/* Card 3: Inactive Users */}
              <div className="um-stat-card">
                <div className="um-stat-icon-wrap icon-wrap-orange">
                  <UserX size={22} />
                </div>
                <div className="um-stat-content">
                  <div className="um-stat-top">
                    <span className="um-stat-number">{stats.inactive}</span>
                    <span className="um-stat-trend trend-down">↓ 2% vs last month</span>
                  </div>
                  <div className="um-stat-label">Inactive Users</div>
                </div>
              </div>

              {/* Card 4: Departments */}
              <div className="um-stat-card">
                <div className="um-stat-icon-wrap icon-wrap-purple">
                  <Building2 size={22} />
                </div>
                <div className="um-stat-content">
                  <div className="um-stat-top">
                    <span className="um-stat-number">{stats.departments}</span>
                    <span className="um-stat-trend trend-neutral">0% No change</span>
                  </div>
                  <div className="um-stat-label">Departments</div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="um-controls-bar">
              <div className="um-search-container">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search by name, email, employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="um-filter-selects">
                {/* Department Dropdown */}
                <div className="um-select-wrapper">
                  <select
                    className="um-filter-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="All">All Departments</option>
                    {AVAILABLE_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="um-select-chevron" />
                </div>

                {/* Role Dropdown */}
                <div className="um-select-wrapper">
                  <select
                    className="um-filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="um-select-chevron" />
                </div>

                {/* Status Dropdown */}
                <div className="um-select-wrapper">
                  <select
                    className="um-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown size={14} className="um-select-chevron" />
                </div>

                {/* Sort By Dropdown */}
                <div className="um-sort-select-wrapper">
                  <ArrowUpDown size={14} className="um-sort-icon" />
                  <select
                    className="um-filter-select um-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="default">Sort by</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="empid">Employee ID</option>
                    <option value="role">Role</option>
                  </select>
                  <ChevronDown size={14} className="um-select-chevron" />
                </div>
              </div>
            </div>

            {/* Users Table Card */}
            <div className="um-table-card">
              <div className="um-table-scroll">
                <table className="um-table">
                  <thead>
                    <tr>
                      <th>EMP ID / USER ID</th>
                      <th>USER DETAILS</th>
                      <th>DEPARTMENT</th>
                      <th>ROLE(S)</th>
                      <th>STATUS</th>
                      <th>JOINED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '50px 20px' }}>
                          <RefreshCw
                            size={24}
                            className="animate-spin"
                            style={{ margin: '0 auto 12px', color: '#2563eb' }}
                          />
                          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Loading workspace users directory...
                          </p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7">
                          <div className="um-empty-state">
                            <Users className="um-empty-icon" />
                            <h3>No team members found</h3>
                            <p>
                              We couldn't find any user accounts matching your search or filters.
                            </p>
                            <button
                              className="um-btn-reset-filters"
                              onClick={() => {
                                setSearchQuery('');
                                setDepartmentFilter('All');
                                setRoleFilter('All');
                                setStatusFilter('All');
                                setSortBy('default');
                              }}
                            >
                              Reset filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user, idx) => {
                        const protectedAcc = isProtectedUser(user.email);
                        const empIdText =
                          user.emp_id || `EMP-${String(user.id).padStart(3, '0')}`;
                        const initialLetter = (user.full_name || user.email || 'U')
                          .charAt(0)
                          .toUpperCase();
                        const joinedDateStr = user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : '10/8/2026';

                        return (
                          <tr key={user.id}>
                            {/* EMP ID */}
                            <td>
                              <span className="um-emp-badge">{empIdText}</span>
                            </td>

                            {/* USER DETAILS */}
                            <td>
                              <div className="um-user-cell">
                                {user.avatar ? (
                                  <img
                                    src={user.avatar}
                                    alt={user.full_name}
                                    className="um-avatar-img"
                                  />
                                ) : (
                                  <div
                                    className="um-avatar-circle"
                                    style={getAvatarStyle(idx, user.full_name || user.email)}
                                  >
                                    {initialLetter}
                                  </div>
                                )}
                                <div className="um-user-text">
                                  <div className="um-user-name-row">
                                    <span className="um-user-name">
                                      {user.full_name || 'Team Member'}
                                    </span>
                                  </div>
                                  <span className="um-user-email">{user.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* DEPARTMENT */}
                            <td>{renderDepartmentBadge(user.department)}</td>

                            {/* ROLE(S) */}
                            <td>{renderRoleBadge(user.role)}</td>

                            {/* STATUS */}
                            <td>
                              <span
                                className={`um-status-pill ${
                                  user.status === 'Inactive'
                                    ? 'status-inactive'
                                    : 'status-active'
                                }`}
                              >
                                <span className="um-status-dot" />
                                {user.status || 'Active'}
                              </span>
                            </td>

                            {/* JOINED */}
                            <td>
                              <div className="um-joined-cell">
                                <Calendar size={14} color="#64748b" />
                                <span>{joinedDateStr}</span>
                              </div>
                            </td>

                            {/* ACTIONS */}
                            <td>
                              <div className="um-actions-cell">
                                {/* View Action */}
                                <button
                                  className="um-btn-icon"
                                  title="View user profile"
                                  onClick={() => setViewingUser(user)}
                                >
                                  <Eye size={15} />
                                </button>

                                {/* Edit Action */}
                                {protectedAcc ? (
                                  <button
                                    className="um-btn-icon is-locked"
                                    disabled
                                    title="Protected system user cannot be edited"
                                  >
                                    <Lock size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="um-btn-icon"
                                    title="Edit user"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                )}

                                {/* Delete / More Action */}
                                {protectedAcc ? (
                                  <button
                                    className="um-btn-icon is-locked"
                                    disabled
                                    title="Protected system user cannot be deleted"
                                  >
                                    <Lock size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="um-btn-icon btn-delete"
                                    title="Delete user"
                                    onClick={() => setUserToDelete(user)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="um-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="create-user-title">Create New User</h3>
                <p>Fill in team member details and configure workspace access.</p>
              </div>
              <button
                className="um-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="um-modal-form">
              <div className="um-modal-body">
                {formError && <div className="um-error-banner">{formError}</div>}

                {/* 1. Avatar Image Upload Section (User picks optionally, not forced) */}
                <div className="um-avatar-upload-row">
                  <div className="um-avatar-preview-box">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar Preview" className="um-avatar-preview-img" />
                    ) : (
                      <div className="um-avatar-preview-placeholder">
                        <Camera size={22} />
                      </div>
                    )}
                  </div>
                  <div className="um-avatar-upload-controls">
                    <div className="um-avatar-btn-row">
                      <label className="um-btn-upload">
                        <Upload size={14} />
                        <span>{formData.avatar ? 'Change Photo' : 'Select Photo'}</span>
                        <input
                          ref={createFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => handleAvatarSelect(e, false)}
                        />
                      </label>
                      {formData.avatar && (
                        <button
                          type="button"
                          className="um-btn-remove-avatar"
                          onClick={() => handleRemoveAvatar(false)}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="um-avatar-upload-hint">
                      Optional: Select a profile image (PNG, JPG, up to 2MB). If unselected, a colored initial avatar is used.
                    </p>
                  </div>
                </div>

                {/* 2. Basic Info: Emp ID (Auto-generated & Non-editable) and Full Name */}
                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <div className="um-form-label-row">
                      <label htmlFor="create-emp-id">Employee ID</label>
                      <span className="um-auto-badge">Auto-generated</span>
                    </div>
                    <div className="um-input-box um-input-box-disabled" title="Auto-generated by system and cannot be edited">
                      <IdCard size={17} className="um-field-icon" />
                      <input
                        id="create-emp-id"
                        type="text"
                        name="emp_id"
                        value={formData.emp_id}
                        readOnly
                        disabled
                        tabIndex={-1}
                      />
                      <Lock size={14} className="um-field-lock" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-full-name">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <div className="um-input-box">
                      <UserRound size={17} className="um-field-icon" />
                      <input
                        id="create-full-name"
                        type="text"
                        name="full_name"
                        placeholder="e.g. Rahul Sharma"
                        required
                        value={formData.full_name}
                        onChange={handleCreateInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Contact Info: Email & Indian Mobile Number */}
                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <label htmlFor="create-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className="um-input-box">
                      <Mail size={17} className="um-field-icon" />
                      <input
                        id="create-email"
                        type="email"
                        name="email"
                        placeholder="e.g. rahul.sharma@company.com"
                        required
                        value={formData.email}
                        onChange={handleCreateInputChange}
                      />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-phone">
                      Mobile Number <span className="opt-text">(Optional)</span>
                    </label>
                    <div className="um-input-box">
                      <span className="um-country-prefix">🇮🇳 +91</span>
                      <input
                        id="create-phone"
                        type="tel"
                        name="phone"
                        placeholder="98765 43210"
                        value={formData.phone}
                        onChange={handleCreateInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Work Info: Department, Role & Account Status in 3-column layout */}
                <div className="um-form-grid-3">
                  <div className="um-form-group">
                    <label htmlFor="create-department">Department</label>
                    <div className="um-input-box um-select-box">
                      <Building2 size={16} className="um-field-icon" />
                      <select
                        id="create-department"
                        name="department"
                        value={formData.department}
                        onChange={handleCreateInputChange}
                      >
                        {AVAILABLE_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-role">Role</label>
                    <div className="um-input-box um-select-box">
                      <ShieldCheck size={16} className="um-field-icon" />
                      <select
                        id="create-role"
                        name="role"
                        value={formData.role}
                        onChange={handleCreateInputChange}
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="create-status">Account Status</label>
                    <div className="um-input-box um-select-box">
                      <span
                        className={`um-status-dot-sm ${
                          formData.status === 'Inactive' ? 'dot-inactive' : 'dot-active'
                        }`}
                      />
                      <select
                        id="create-status"
                        name="status"
                        value={formData.status}
                        onChange={handleCreateInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>
                </div>

                {/* 6. Password Delivery Notice Note */}
                <div className="um-password-notice-banner">
                  <div className="um-notice-icon-box">
                    <MailCheck size={19} />
                  </div>
                  <div className="um-notice-text">
                    <strong>Password will be sent through email</strong>
                    <p>
                      A secure login password will be automatically generated and delivered to the user's registered email address upon account creation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="um-modal-footer">
                <button
                  type="button"
                  className="um-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="um-btn-primary"
                  disabled={submitting}
                >
                  <UserPlus size={16} />
                  {submitting ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && editFormData && (
        <div
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="um-modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3 id="edit-user-title">Edit User</h3>
                <p>Update team member details and assigned workspace permissions.</p>
              </div>
              <button
                className="um-modal-close"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="um-modal-form">
              <div className="um-modal-body">
                {formError && <div className="um-error-banner">{formError}</div>}

                {/* Avatar Image Edit / Change */}
                <div className="um-avatar-upload-row">
                  <div className="um-avatar-preview-box">
                    {editFormData.avatar ? (
                      <img src={editFormData.avatar} alt="Avatar" className="um-avatar-preview-img" />
                    ) : (
                      <div className="um-avatar-preview-placeholder">
                        <Camera size={22} />
                      </div>
                    )}
                  </div>
                  <div className="um-avatar-upload-controls">
                    <div className="um-avatar-btn-row">
                      <label className="um-btn-upload">
                        <Upload size={14} />
                        <span>{editFormData.avatar ? 'Change Photo' : 'Select Photo'}</span>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => handleAvatarSelect(e, true)}
                        />
                      </label>
                      {editFormData.avatar && (
                        <button
                          type="button"
                          className="um-btn-remove-avatar"
                          onClick={() => handleRemoveAvatar(true)}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="um-avatar-upload-hint">
                      Select a profile image (PNG, JPG, up to 2MB). Optional.
                    </p>
                  </div>
                </div>

                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <div className="um-form-label-row">
                      <label htmlFor="edit-emp-id">Employee ID</label>
                      <span className="um-auto-badge">Auto-generated</span>
                    </div>
                    <div className="um-input-box um-input-box-disabled" title="Employee ID cannot be edited">
                      <IdCard size={17} className="um-field-icon" />
                      <input
                        id="edit-emp-id"
                        type="text"
                        name="emp_id"
                        value={editFormData.emp_id}
                        readOnly
                        disabled
                        tabIndex={-1}
                      />
                      <Lock size={14} className="um-field-lock" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-full-name">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <div className="um-input-box">
                      <UserRound size={17} className="um-field-icon" />
                      <input
                        id="edit-full-name"
                        type="text"
                        name="full_name"
                        required
                        value={editFormData.full_name}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="um-form-grid-2">
                  <div className="um-form-group">
                    <label htmlFor="edit-email">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <div className="um-input-box">
                      <Mail size={17} className="um-field-icon" />
                      <input
                        id="edit-email"
                        type="email"
                        name="email"
                        required
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-phone">
                      Mobile Number <span className="opt-text">(Optional)</span>
                    </label>
                    <div className="um-input-box">
                      <span className="um-country-prefix">🇮🇳 +91</span>
                      <input
                        id="edit-phone"
                        type="tel"
                        name="phone"
                        placeholder="98765 43210"
                        value={editFormData.phone.replace(/^\+91\s*/, '')}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Work Info: Department, Role & Status in 3-column layout */}
                <div className="um-form-grid-3">
                  <div className="um-form-group">
                    <label htmlFor="edit-department">Department</label>
                    <div className="um-input-box um-select-box">
                      <Building2 size={16} className="um-field-icon" />
                      <select
                        id="edit-department"
                        name="department"
                        value={editFormData.department}
                        onChange={handleEditInputChange}
                      >
                        {AVAILABLE_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-role">Role</label>
                    <div className="um-input-box um-select-box">
                      <ShieldCheck size={16} className="um-field-icon" />
                      <select
                        id="edit-role"
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditInputChange}
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>

                  <div className="um-form-group">
                    <label htmlFor="edit-status">Status</label>
                    <div className="um-input-box um-select-box">
                      <span
                        className={`um-status-dot-sm ${
                          editFormData.status === 'Inactive' ? 'dot-inactive' : 'dot-active'
                        }`}
                      />
                      <select
                        id="edit-status"
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <ChevronDown size={14} className="um-box-chevron" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="um-modal-footer">
                <button
                  type="button"
                  className="um-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="um-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingUser(null);
          }}
        >
          <div className="um-modal-card" style={{ maxWidth: '560px' }} role="dialog" aria-modal="true">
            <div className="um-modal-header">
              <div className="um-modal-header-titles">
                <h3>User Details</h3>
                <p>Detailed workspace membership profile.</p>
              </div>
              <button
                className="um-modal-close"
                onClick={() => setViewingUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <div className="um-view-profile-header">
                {viewingUser.avatar ? (
                  <img
                    src={viewingUser.avatar}
                    alt={viewingUser.full_name}
                    className="um-view-avatar-img"
                  />
                ) : (
                  <div
                    className="um-view-avatar"
                    style={getAvatarStyle(0, viewingUser.full_name || viewingUser.email)}
                  >
                    {(viewingUser.full_name || viewingUser.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                    {viewingUser.full_name || 'Team Member'}
                  </h4>
                  <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '2px' }}>
                    {viewingUser.email}
                  </div>
                </div>
              </div>

              <div className="um-view-grid">
                <div className="um-view-item">
                  <div className="um-view-label">Employee ID</div>
                  <div className="um-view-val">
                    {viewingUser.emp_id || `EMP-${String(viewingUser.id).padStart(3, '0')}`}
                  </div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Department</div>
                  <div className="um-view-val">{renderDepartmentBadge(viewingUser.department)}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Assigned Role</div>
                  <div className="um-view-val">{renderRoleBadge(viewingUser.role)}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Account Status</div>
                  <div className="um-view-val">
                    <span
                      className={`um-status-pill ${
                        viewingUser.status === 'Inactive'
                          ? 'status-inactive'
                          : 'status-active'
                      }`}
                    >
                      <span className="um-status-dot" />
                      {viewingUser.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Mobile Number</div>
                  <div className="um-view-val">{viewingUser.phone || 'Not provided'}</div>
                </div>

                <div className="um-view-item">
                  <div className="um-view-label">Joined Date</div>
                  <div className="um-view-val">
                    {viewingUser.created_at
                      ? new Date(viewingUser.created_at).toLocaleDateString()
                      : '10/8/2026'}
                  </div>
                </div>
              </div>
            </div>

            <div className="um-modal-footer">
              <button
                type="button"
                className="um-btn-secondary"
                onClick={() => setViewingUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div
          className="um-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setUserToDelete(null);
          }}
        >
          <div className="um-modal-card" style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="um-modal-header">
              <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <AlertTriangle size={20} color="#dc2626" /> Delete User
              </h3>
              <button
                className="um-modal-close"
                onClick={() => setUserToDelete(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-modal-body">
              <p style={{ margin: 0, fontSize: '0.94rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete user{' '}
                <strong>{userToDelete.full_name || userToDelete.email}</strong> (
                {userToDelete.email})?
              </p>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '10px' }}>
                This action cannot be undone. Associated workspace permissions will be revoked.
              </p>
            </div>

            <div className="um-modal-footer">
              <button
                type="button"
                className="um-btn-secondary"
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="um-btn-danger"
                disabled={submitting}
                onClick={confirmDeleteUser}
              >
                {submitting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon">
              <LogOut size={21} />
            </div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account credentials.</p>
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
    </div>
  );
}

export default AdminUsers;
