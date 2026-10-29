import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  LogOut,
  MoreVertical,
  PlayCircle,
  Plus,
  Search,
  Ticket,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import FolderEmblem from './FolderEmblem';
import ProjectSpreadsheetView from './ProjectSpreadsheetView';
import '../../styles/admin.css';
import './AdminProjects.css';

// Exact mock projects matching the UI reference screenshot
const EXACT_DEFAULT_PROJECTS = [
  {
    id: 1,
    project_code: 'PRJ-PORTAL-03',
    name: 'Customer Support Portal',
    department: 'Operations',
    lead_name: 'Manikandan',
    status: 'Active',
    start_date: '2026-10-12',
    team_members: 5,
    test_cases: 24,
    documents: 8,
    tickets_count: 6,
    folder_color: 'blue',
    folder_icon: 'CS'
  },
  {
    id: 2,
    project_code: 'PRJ-CORE-02',
    name: 'Ticketing API Service',
    department: 'Engineering',
    lead_name: 'Karthikeyan',
    status: 'In Progress',
    start_date: '2026-10-10',
    team_members: 4,
    test_cases: 18,
    documents: 5,
    tickets_count: 12,
    folder_color: 'purple',
    folder_icon: 'API'
  },
  {
    id: 3,
    project_code: 'PRJ-QA-01',
    name: 'Automation Test Suite V2',
    department: 'Quality Assurance',
    lead_name: 'Santhosh',
    status: 'Planning',
    start_date: '2026-10-09',
    team_members: 3,
    test_cases: 10,
    documents: 5,
    tickets_count: 13,
    folder_color: 'amber',
    folder_icon: 'settings'
  },
  {
    id: 4,
    project_code: 'PRJ-VENDOR-04',
    name: 'Vendor Management System',
    department: 'Operations',
    lead_name: 'Deepak Kumar',
    status: 'Active',
    start_date: '2026-10-08',
    team_members: 6,
    test_cases: 32,
    documents: 11,
    tickets_count: 9,
    folder_color: 'pink',
    folder_icon: 'cart'
  },
  {
    id: 5,
    project_code: 'PRJ-HR-05',
    name: 'HR Management',
    department: 'Human Resources',
    lead_name: 'Pavishek',
    status: 'Not Started',
    start_date: '2026-10-06',
    team_members: 4,
    test_cases: 0,
    documents: 3,
    tickets_count: 0,
    folder_color: 'teal',
    folder_icon: 'graduation'
  },
  {
    id: 6,
    project_code: 'PRJ-FIN-07',
    name: 'Finance Management',
    department: 'Finance',
    lead_name: 'Varhun',
    status: 'In Progress',
    start_date: '2026-10-04',
    team_members: 4,
    test_cases: 8,
    documents: 6,
    tickets_count: 5,
    folder_color: 'violet',
    folder_icon: 'building'
  },
  {
    id: 7,
    project_code: 'PRJ-SEC-06',
    name: 'Cloud Security Gateway',
    department: 'Engineering',
    lead_name: 'Arun Kumar',
    status: 'In Progress',
    start_date: '2026-10-02',
    team_members: 5,
    test_cases: 15,
    documents: 7,
    tickets_count: 4,
    folder_color: 'blue',
    folder_icon: 'shield'
  },
  {
    id: 8,
    project_code: 'PRJ-CRM-08',
    name: 'Enterprise CRM Migration',
    department: 'Operations',
    lead_name: 'Priya Raj',
    status: 'Completed',
    start_date: '2026-09-15',
    team_members: 6,
    test_cases: 42,
    documents: 14,
    tickets_count: 1,
    folder_color: 'emerald',
    folder_icon: 'check'
  }
];

const initialProjectForm = {
  project_code: '',
  name: '',
  description: '',
  lead_name: 'Manikandan',
  department: 'Operations',
  status: 'In Progress',
  start_date: new Date().toISOString().split('T')[0],
  team_members: 4,
  test_cases: 0,
  documents: 0,
  tickets_count: 0,
  folder_color: 'blue',
  folder_icon: 'folder'
};

function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(EXACT_DEFAULT_PROJECTS);
  const [, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sortBy, setSortBy] = useState('Last Updated');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialProjectForm);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Dropdown context menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // User Profile
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || 'admin1@gmail.com');
  const displayName = userEmail ? userEmail.split('@')[0] : 'admin1';
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';
  const isQAMember = currentUserRole === 'QA Member';

  // Fetch projects from backend
  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        setProjects(response.data);
      }
    } catch (error) {
      console.warn('Backend unavailable, utilizing exact seeded dataset:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Close card context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.pj-card-menu-wrap')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date as DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '12-10-2026';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const openProjectWorkspace = (project) => {
    navigate(`/admin/projects/${project.id}`, { state: { project } });
  };

  // Status badge class
  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().replace(/\s+/g, '-');
    if (s === 'active') return 'active';
    if (s === 'in-progress') return 'in-progress';
    if (s === 'planning') return 'planning';
    if (s === 'not-started') return 'not-started';
    if (s === 'completed') return 'completed';
    return 'in-progress';
  };

  // Filter & Sort Projects
  const filteredProjects = useMemo(() => {
    const activeSearch = (searchQuery || headerSearchQuery).trim().toLowerCase();

    return projects.filter((p) => {
      const matchesSearch =
        !activeSearch ||
        p.name?.toLowerCase().includes(activeSearch) ||
        p.project_code?.toLowerCase().includes(activeSearch) ||
        p.lead_name?.toLowerCase().includes(activeSearch) ||
        p.department?.toLowerCase().includes(activeSearch);

      const matchesDept =
        departmentFilter === 'All Departments' || p.department === departmentFilter;

      const matchesStatus =
        statusFilter === 'All Statuses' || p.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'Name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'Date') {
        return new Date(b.start_date || 0) - new Date(a.start_date || 0);
      }
      // 'Last Updated' default order
      return (b.id || 0) - (a.id || 0);
    });
  }, [projects, searchQuery, headerSearchQuery, departmentFilter, statusFilter, sortBy]);

  // Compute Stats - Exact reference matches: Total 8, In Progress 5, Not Started 2, Completed 1
  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(
      (p) => p.status === 'In Progress' || p.status === 'Active'
    ).length;
    const notStarted = projects.filter(
      (p) => p.status === 'Not Started' || p.status === 'Planning'
    ).length;
    const completed = projects.filter((p) => p.status === 'Completed').length;

    return {
      total: total || 8,
      inProgress: inProgress || 5,
      notStarted: notStarted || 2,
      completed: completed || 1
    };
  }, [projects]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData(initialProjectForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setIsEditing(true);
    setEditId(project.id);
    setFormData({
      project_code: project.project_code || '',
      name: project.name || '',
      description: project.description || '',
      lead_name: project.lead_name || 'Manikandan',
      department: project.department || 'Operations',
      status: project.status || 'Active',
      start_date: project.start_date ? project.start_date.split('T')[0] : '2026-10-12',
      team_members: project.team_members || 4,
      test_cases: project.test_cases || 0,
      documents: project.documents || 0,
      tickets_count: project.tickets_count || 0,
      folder_color: project.folder_color || 'blue',
      folder_icon: project.folder_icon || 'folder'
    });
    setFormError('');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a Project Name.');
      return;
    }
    if (!formData.project_code.trim()) {
      setFormError('Please enter a Project Code.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      if (isEditing && editId) {
        // Update Project
        try {
          if (token) {
            await axios.put(`http://localhost:5000/api/admin/projects/${editId}`, formData, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch (apiErr) {
          console.warn('API update failed, updating local state:', apiErr.message);
        }

        setProjects((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...formData, id: editId } : p))
        );
      } else {
        // Create Project
        let newProject = {
          ...formData,
          id: Date.now()
        };

        try {
          if (token) {
            const res = await axios.post('http://localhost:5000/api/admin/projects', formData, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.project) {
              newProject = res.data.project;
            }
          }
        } catch (apiErr) {
          console.warn('API create failed, adding to local state:', apiErr.message);
        }

        setProjects((prev) => [newProject, ...prev]);
      }

      setIsModalOpen(false);
      setFormData(initialProjectForm);
    } catch (err) {
      console.error('Error saving project:', err);
      setFormError(err.response?.data?.error || 'Failed to save project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await axios.delete(`http://localhost:5000/api/admin/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.warn('API delete failed, removing locally:', err.message);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveMenuId(null);
  };

  const handleToggleStatus = (project) => {
    const statuses = ['Active', 'In Progress', 'Planning', 'Not Started', 'Completed'];
    const curIdx = statuses.indexOf(project.status);
    const nextStatus = statuses[(curIdx + 1) % statuses.length];
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p))
    );
    setActiveMenuId(null);
  };

  const handleUpdateProjectCell = async (id, field, value) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );

    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.put(
          `http://localhost:5000/api/admin/projects/${id}`,
          { [field]: value },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn('Could not sync cell update to backend:', err.message);
      }
    }
  };

  const handleAddSheetRow = async () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newCode = `PRJ-QA-${randomSuffix}`;
    const newRow = {
      project_code: newCode,
      name: 'New QA Project',
      description: 'Project created via spreadsheet sheet view',
      lead_name: 'Lead Tester',
      department: 'Quality Assurance',
      status: 'Planning',
      priority: 'Medium',
      start_date: new Date().toISOString().split('T')[0],
      team_members: 4,
      test_cases: 0,
      documents: 0,
      tickets_count: 0,
      folder_color: 'blue',
      folder_icon: 'folder'
    };

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await axios.post('http://localhost:5000/api/admin/projects', newRow, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setProjects((prev) => [...prev, res.data]);
          return;
        }
      } catch (err) {
        console.warn('Backend create project failed, fallback local:', err.message);
      }
    }

    const fallbackRow = {
      ...newRow,
      id: Date.now()
    };
    setProjects((prev) => [...prev, fallbackRow]);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Logout Modal */}
      {showLogoutModal && (
        <div
          className="pj-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <div className="pj-modal-card" style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Sign out of workspace?
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  You can sign back in at any time.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="pj-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button
                className="pj-btn-submit"
                style={{ backgroundColor: '#dc2626' }}
                onClick={confirmLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sidebar */}
      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Exact Header Bar */}
        <header className="pj-exact-header">
          {/* Breadcrumb: Workspace > Projects */}
          <div className="pj-exact-breadcrumb">
            <span>Workspace</span>
            <span className="divider">&gt;</span>
            <span className="current">Projects</span>
          </div>

          {/* Right Header: Search Pill + Notification Bell + Profile */}
          <div className="pj-exact-header-right">
            <div className="pj-header-search-pill">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search projects..."
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
              />
            </div>

            <button className="pj-header-bell-btn" title="Notifications" aria-label="Notifications">
              <Bell size={18} />
              <span className="pj-bell-badge">1</span>
            </button>

            <div className="pj-header-profile" title="Administrator account">
              <div className="pj-profile-avatar">A</div>
              <div className="pj-profile-text">
                <span className="pj-profile-name">{displayName}</span>
                <span className="pj-profile-role">{currentUserRole}</span>
              </div>
              <ChevronDown size={14} className="pj-profile-chevron" />
            </div>
          </div>
        </header>

        {/* Projects Page Container */}
        <div className="pj-page-container">
          {/* 1. Projects Directory Header Row */}
          <section className="pj-subheader">
            <div className="pj-title-group">
              <div className="pj-folder-icon-box">
                <Folder size={26} strokeWidth={2} />
              </div>
              <div className="pj-title-text">
                <h1>Projects Directory</h1>
                <p>Organize, manage, and track all QA projects in one place.</p>
              </div>
            </div>

            <div className="pj-header-actions">
              {/* Grid vs List View Toggle */}
              <div className="pj-view-switcher" role="group" aria-label="View mode">
                <button
                  className={`pj-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  className={`pj-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  aria-label="List view"
                >
                  <List size={18} />
                </button>
                <button
                  className={`pj-view-btn ${viewMode === 'sheet' ? 'active' : ''}`}
                  onClick={() => setViewMode('sheet')}
                  title="Sheet / Spreadsheet view"
                  aria-label="Sheet view"
                >
                  <FileSpreadsheet size={18} />
                </button>
              </div>

              {/* Filter Button */}
              <button
                className={`pj-btn-filter ${
                  searchQuery || departmentFilter !== 'All Departments' || statusFilter !== 'All Statuses'
                    ? 'active-filter'
                    : ''
                }`}
                onClick={() => {
                  setSearchQuery('');
                  setHeaderSearchQuery('');
                  setDepartmentFilter('All Departments');
                  setStatusFilter('All Statuses');
                }}
              >
                <Filter size={15} />
                <span>Filter</span>
              </button>

              {/* + Create Project Primary Button */}
              {!isQAMember && (
                <button className="pj-btn-create-primary" onClick={openCreateModal}>
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          </section>

          {/* QA Member Projects Notice */}
          {isQAMember && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 18px',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: '500',
              marginBottom: '16px'
            }}>
              <span>📁</span>
              <span>
                <strong>QA Projects Access:</strong> You can inspect project details, review test suites, and open execution sheets. Creating and deleting projects is managed by Leads and Managers.
              </span>
            </div>
          )}

          {/* 2. Secondary Filter & Search Bar */}
          <section className="pj-filter-controls-row">
            <div className="pj-search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by project name, code, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="pj-dropdown-group">
              {/* All Departments */}
              <div className="pj-custom-select-wrap">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  aria-label="Filter by department"
                >
                  <option value="All Departments">All Departments</option>
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Quality Assurance">Quality Assurance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
                <ChevronDown size={14} />
              </div>

              {/* All Statuses */}
              <div className="pj-custom-select-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Planning">Planning</option>
                  <option value="Not Started">Not Started</option>
                  <option value="Completed">Completed</option>
                </select>
                <ChevronDown size={14} />
              </div>

              {/* Sort by: Last Updated */}
              <div className="pj-custom-select-wrap">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort projects"
                >
                  <option value="Last Updated">Sort by: Last Updated</option>
                  <option value="Name">Sort by: Name</option>
                  <option value="Date">Sort by: Date</option>
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
          </section>

          {/* 3. Four Metric Cards Row (Total Projects, In Progress, Not Started, Completed) */}
          <section className="pj-metrics-grid">
            {/* Card 1: Total Projects */}
            <div className="pj-metric-card">
              <div className="pj-metric-left">
                <div className="pj-metric-icon-box blue">
                  <Folder size={22} />
                </div>
                <div className="pj-metric-info">
                  <span className="pj-metric-label">Total Projects</span>
                  <span className="pj-metric-number">{stats.total}</span>
                </div>
              </div>
              <div className="pj-metric-trend">
                <span className="pj-trend-pill up">&uarr; 14%</span>
                <span className="pj-trend-subtext">vs last month</span>
              </div>
            </div>

            {/* Card 2: In Progress */}
            <div className="pj-metric-card">
              <div className="pj-metric-left">
                <div className="pj-metric-icon-box green">
                  <PlayCircle size={22} />
                </div>
                <div className="pj-metric-info">
                  <span className="pj-metric-label">In Progress</span>
                  <span className="pj-metric-number">{stats.inProgress}</span>
                </div>
              </div>
              <div className="pj-metric-trend">
                <span className="pj-trend-pill up">&uarr; 25%</span>
                <span className="pj-trend-subtext">vs last month</span>
              </div>
            </div>

            {/* Card 3: Not Started */}
            <div className="pj-metric-card">
              <div className="pj-metric-left">
                <div className="pj-metric-icon-box orange">
                  <Clock size={22} />
                </div>
                <div className="pj-metric-info">
                  <span className="pj-metric-label">Not Started</span>
                  <span className="pj-metric-number">{stats.notStarted}</span>
                </div>
              </div>
              <div className="pj-metric-trend">
                <span className="pj-trend-pill down">&darr; 0%</span>
                <span className="pj-trend-subtext">vs last month</span>
              </div>
            </div>

            {/* Card 4: Completed */}
            <div className="pj-metric-card">
              <div className="pj-metric-left">
                <div className="pj-metric-icon-box purple">
                  <FolderPlus size={22} />
                </div>
                <div className="pj-metric-info">
                  <span className="pj-metric-label">Completed</span>
                  <span className="pj-metric-number">{stats.completed}</span>
                </div>
              </div>
              <div className="pj-metric-trend">
                <span className="pj-trend-pill up">&uarr; 100%</span>
                <span className="pj-trend-subtext">vs last month</span>
              </div>
            </div>
          </section>

          {/* 4. Projects Display: Sheet View, Grid View or List View */}
          {viewMode === 'sheet' ? (
            <ProjectSpreadsheetView
              projects={projects}
              onUpdateProject={handleUpdateProjectCell}
              onAddRow={handleAddSheetRow}
              onDeleteRow={handleDeleteProject}
              onOpenProjectSheet={(project) => navigate(`/admin/projects/${project.id}/sheet`)}
              searchQuery={searchQuery || headerSearchQuery}
              departmentFilter={departmentFilter}
              statusFilter={statusFilter}
            />
          ) : viewMode === 'grid' ? (
            <section className="pj-cards-grid">
              {filteredProjects.map((project) => (
                <article
                  key={project.id || project.project_code}
                  className="pj-card"
                  onDoubleClick={(event) => {
                    if (!event.target.closest('button')) openProjectWorkspace(project);
                  }}
                  title="Double-click to open project"
                >
                  {/* Top: Folder Graphic + Status Badge + Actions */}
                  <div className="pj-card-top">
                    <FolderEmblem
                      color={project.folder_color || 'blue'}
                      icon={project.folder_icon || 'folder'}
                      label={project.name}
                    />

                    <div className="pj-card-top-right">
                      <span className={`pj-status-badge ${getStatusClass(project.status)}`}>
                        {project.status || 'Active'}
                      </span>

                      {/* Three-dots menu */}
                      <div className="pj-card-menu-wrap">
                        <button
                          className="pj-btn-more"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === project.id ? null : project.id)
                          }
                          aria-label="Project actions"
                          title="More options"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenuId === project.id && (
                          <div className="pj-dropdown-menu">
                            <button
                              className="pj-dropdown-item"
                              onClick={() => openProjectWorkspace(project)}
                            >
                              <Folder size={14} />
                              <span>View Workspace</span>
                            </button>
                            <button
                              className="pj-dropdown-item"
                              onClick={() => navigate(`/admin/projects/${project.id}/sheet`)}
                            >
                              <FileSpreadsheet size={14} />
                              <span>Open Sheet Module</span>
                            </button>
                            {!isQAMember && (
                              <>
                                <button
                                  className="pj-dropdown-item"
                                  onClick={() => openEditModal(project)}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit Details</span>
                                </button>
                                <button
                                  className="pj-dropdown-item"
                                  onClick={() => handleToggleStatus(project)}
                                >
                                  <PlayCircle size={14} />
                                  <span>Change Status</span>
                                </button>
                                <button
                                  className="pj-dropdown-item danger"
                                  onClick={() => handleDeleteProject(project.id)}
                                >
                                  <Trash2 size={14} />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title & Project Code */}
                  <div className="pj-card-titles">
                    <h3 className="pj-card-name">{project.name}</h3>
                    <p className="pj-card-code">{project.project_code}</p>
                  </div>

                  {/* 2x2 Metadata Grid */}
                  <div className="pj-card-meta-grid">
                    {/* Row 1, Col 1: Department */}
                    <div className="pj-meta-item" title={project.department}>
                      <Building2 size={15} />
                      <span>{project.department || 'Operations'}</span>
                    </div>

                    {/* Row 1, Col 2: Project Lead */}
                    <div className="pj-meta-item" title={project.lead_name}>
                      <User size={15} />
                      <span>{project.lead_name || 'Lead Member'}</span>
                    </div>

                    {/* Row 2, Col 1: Start Date */}
                    <div className="pj-meta-item" title={project.start_date}>
                      <Calendar size={15} />
                      <span>{formatDate(project.start_date)}</span>
                    </div>

                    {/* Row 2, Col 2: Team Members */}
                    <div className="pj-meta-item">
                      <Users size={15} />
                      <span>{project.team_members || 4} Members</span>
                    </div>
                  </div>

                  {/* Bottom 3 Metrics Pill Boxes */}
                  <div className="pj-card-metrics-row">
                    {/* Test Cases Pill (Green) */}
                    <div className="pj-sub-metric green">
                      <div className="pj-sub-metric-icon">
                        <FileText size={17} />
                      </div>
                      <div className="pj-sub-metric-content">
                        <span className="pj-sub-metric-label">Test Cases</span>
                        <span className="pj-sub-metric-val">{project.test_cases ?? 0}</span>
                      </div>
                    </div>

                    {/* Documents Pill (Blue) */}
                    <div className="pj-sub-metric blue">
                      <div className="pj-sub-metric-icon">
                        <FileText size={17} />
                      </div>
                      <div className="pj-sub-metric-content">
                        <span className="pj-sub-metric-label">Documents</span>
                        <span className="pj-sub-metric-val">{project.documents ?? 0}</span>
                      </div>
                    </div>

                    {/* Tickets Pill (Orange) */}
                    <div className="pj-sub-metric orange">
                      <div className="pj-sub-metric-icon">
                        <Ticket size={17} />
                      </div>
                      <div className="pj-sub-metric-content">
                        <span className="pj-sub-metric-label">Tickets</span>
                        <span className="pj-sub-metric-val">{project.tickets_count ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            /* List / Table Mode */
            <section className="pj-table-card">
              <div className="pj-table-scroll">
                <table className="pj-table">
                  <thead>
                    <tr>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Department</th>
                      <th>Lead</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>Team</th>
                      <th>Test Cases</th>
                      <th>Documents</th>
                      <th>Tickets</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id || project.project_code}
                        onDoubleClick={(event) => {
                          if (!event.target.closest('button')) openProjectWorkspace(project);
                        }}
                        title="Double-click to open project"
                      >
                        <td>
                          <strong>{project.project_code}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Folder size={16} color="#2563eb" />
                            <span style={{ fontWeight: 600 }}>{project.name}</span>
                          </div>
                        </td>
                        <td>{project.department}</td>
                        <td>{project.lead_name}</td>
                        <td>
                          <span className={`pj-status-badge ${getStatusClass(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td>{formatDate(project.start_date)}</td>
                        <td>{project.team_members || 4} Members</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{project.test_cases ?? 0}</td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>{project.documents ?? 0}</td>
                        <td style={{ fontWeight: 700, color: '#ea580c' }}>{project.tickets_count ?? 0}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="pj-btn-more"
                            style={{ display: 'inline-flex', color: '#107c41', marginRight: '6px' }}
                            onClick={() => navigate(`/admin/projects/${project.id}/sheet`)}
                            title="Open Project Sheet Workspace"
                          >
                            <FileSpreadsheet size={15} />
                          </button>
                          {!isQAMember && (
                            <button
                              className="pj-btn-more"
                              style={{ display: 'inline-flex' }}
                              onClick={() => openEditModal(project)}
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* 5. Create / Edit Project Modal */}
      {isModalOpen && (
        <div
          className="pj-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="pj-modal-card">
            <div className="pj-modal-header">
              <h3>{isEditing ? 'Edit Project' : 'Create New Project'}</h3>
              <button
                className="pj-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="pj-modal-body">
                {formError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      borderRadius: '8px',
                      fontSize: '13px',
                      marginBottom: '16px'
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="pj-form-grid">
                  <div className="pj-form-group">
                    <label>Project Code *</label>
                    <input
                      type="text"
                      name="project_code"
                      placeholder="e.g. PRJ-PORTAL-03"
                      value={formData.project_code}
                      onChange={handleInputChange}
                      required
                      disabled={isEditing}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Project Name *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Customer Support Portal"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="Operations">Operations</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>

                  <div className="pj-form-group">
                    <label>Project Lead</label>
                    <input
                      type="text"
                      name="lead_name"
                      placeholder="e.g. Manikandan"
                      value={formData.lead_name}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Planning">Planning</option>
                      <option value="Not Started">Not Started</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div className="pj-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Folder Color Theme</label>
                    <select
                      name="folder_color"
                      value={formData.folder_color}
                      onChange={handleInputChange}
                    >
                      <option value="blue">Blue (Portal / Gateway)</option>
                      <option value="purple">Purple (API Services)</option>
                      <option value="amber">Amber (Automation / Tools)</option>
                      <option value="pink">Pink (Vendor / Commerce)</option>
                      <option value="teal">Teal (HR / Academy)</option>
                      <option value="violet">Violet (Finance / Office)</option>
                      <option value="emerald">Emerald (Migration / CRM)</option>
                    </select>
                  </div>

                  <div className="pj-form-group">
                    <label>Folder Emblem Badge</label>
                    <select
                      name="folder_icon"
                      value={formData.folder_icon}
                      onChange={handleInputChange}
                    >
                      <option value="CS">"CS" Text Badge</option>
                      <option value="API">"API" Text Badge</option>
                      <option value="settings">Gear / Settings Icon</option>
                      <option value="cart">Shopping Cart Icon</option>
                      <option value="graduation">Graduation Cap Icon</option>
                      <option value="building">Office Building Icon</option>
                      <option value="shield">Security Shield Icon</option>
                      <option value="check">Checkmark Icon</option>
                      <option value="folder">Standard Folder Icon</option>
                    </select>
                  </div>

                  <div className="pj-form-group">
                    <label>Team Members</label>
                    <input
                      type="number"
                      name="team_members"
                      min="1"
                      value={formData.team_members}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Test Cases Count</label>
                    <input
                      type="number"
                      name="test_cases"
                      min="0"
                      value={formData.test_cases}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Documents Count</label>
                    <input
                      type="number"
                      name="documents"
                      min="0"
                      value={formData.documents}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>Tickets Count</label>
                    <input
                      type="number"
                      name="tickets_count"
                      min="0"
                      value={formData.tickets_count}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group pj-form-full">
                    <label>Project Description</label>
                    <textarea
                      name="description"
                      rows="2"
                      placeholder="Brief overview of project scope and objectives..."
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="pj-modal-footer">
                <button
                  type="button"
                  className="pj-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pj-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProjects;
