import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import { INPUT_LIMITS, validateMeaningfulText } from '../../utils/inputValidation';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  Lock,
  LogOut,
  MoreVertical,
  PlayCircle,
  Plus,
  Search,
  Ticket,
  Trash2,
  Unlock,
  User,
  Users,
  X
} from 'lucide-react';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import FolderEmblem from './FolderEmblem';
import { formatIndianDate } from '../../utils/dateFormat';
import { getValidToken } from '../../utils/auth';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminTickets/AdminTickets.css';
import './AdminProjects.css';

const PJ_TYPE_OPTIONS = [
  { value: 'All Departments', label: 'All Project Types' },
  { value: 'Website', label: 'Website' },
  { value: 'Mobile App', label: 'Mobile App' },
  { value: 'Web and Mobile', label: 'Web and Mobile' },
  { value: 'Desktop App', label: 'Desktop App' }
];

const PJ_STATUS_OPTIONS = [
  { value: 'All Statuses', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On Hold', label: 'On Hold' }
];

const PJ_PRIORITY_OPTIONS = [
  { value: 'All Priorities', label: 'All Priorities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const PJ_SORT_OPTIONS = [
  { value: 'Last Updated', label: 'Sort by: Last Updated' },
  { value: 'Name', label: 'Sort by: Name' },
  { value: 'Date', label: 'Sort by: Date' }
];

const MODAL_PROJECT_TYPE_OPTIONS = [
  { value: 'Website', label: 'Website' },
  { value: 'Mobile App', label: 'Mobile App' },
  { value: 'Web and Mobile', label: 'Web and Mobile' },
  { value: 'Desktop App', label: 'Desktop App' }
];

const MODAL_PROJECT_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const MODAL_PROJECT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Completed', label: 'Completed' }
];

// Default empty projects array
const EXACT_DEFAULT_PROJECTS = [];

export const getNextProjectCode = (existingProjects = []) => {
  let maxNum = 0;
  if (Array.isArray(existingProjects)) {
    existingProjects.forEach((p) => {
      if (p && p.project_code) {
        const match = String(p.project_code).trim().match(/^PRJ-KSV-([0-9]+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
  }
  const nextNum = maxNum + 1;
  return `PRJ-KSV-${String(nextNum).padStart(3, '0')}`;
};

export const generateProjectCode = (_nameVal, existingProjects = []) => {
  return getNextProjectCode(existingProjects);
};

export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toLocalDateInputString = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    return dateVal.trim();
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMinTargetDate = (startDateStr) => {
  const baseStr = startDateStr || getTodayDateString();
  const parts = baseStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return baseStr;
};

const initialProjectForm = {
  project_code: '',
  name: '',
  description: '',
  client_name: '',
  project_lead_id: '',
  lead_name: '',
  priority: 'Medium',
  department: '',
  status: 'In Progress',
  start_date: '',
  team_members: '',
  end_date: ''
};

const PJ_FILTER_LOCK_STORAGE_KEY = 'pj_locked_filters';

const readLockedFiltersState = () => {
  try {
    const raw = localStorage.getItem(PJ_FILTER_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.locked ? parsed : null;
  } catch {
    return null;
  }
};

function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    const saved = sessionStorage.getItem('projectsViewMode');
    return ['grid', 'list'].includes(saved) ? saved : 'grid';
  }); // 'grid' | 'list'

  useEffect(() => {
    sessionStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersLocked, setFiltersLocked] = useState(() => Boolean(readLockedFiltersState()));
  const [departmentFilter, setDepartmentFilter] = useState(
    () => readLockedFiltersState()?.departmentFilter || 'All Departments'
  );
  const [statusFilter, setStatusFilter] = useState(
    () => readLockedFiltersState()?.statusFilter || 'All Statuses'
  );
  const [sortBy, setSortBy] = useState(
    () => readLockedFiltersState()?.sortBy || 'Last Updated'
  );

  const toggleFilterLock = () => {
    const nextLocked = !filtersLocked;
    setFiltersLocked(nextLocked);
    try {
      if (nextLocked) {
        localStorage.setItem(
          PJ_FILTER_LOCK_STORAGE_KEY,
          JSON.stringify({
            locked: true,
            departmentFilter,
            statusFilter,
            sortBy
          })
        );
      } else {
        localStorage.removeItem(PJ_FILTER_LOCK_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialProjectForm);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [projectLeads, setProjectLeads] = useState([]);

  useEffect(() => {
    const token = getValidToken();
    if (!token) return;

    axios.get('http://localhost:5000/api/admin/project-leads', {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        const filteredLeads = res.data.filter((u) => {
          const r = (u.role || '').toLowerCase();
          return r !== 'qa member' && r !== 'manager' && !r.includes('admin');
        });
        setProjectLeads(filteredLeads);
      } else {
        throw new Error('No leads from dedicated route, fallback to users');
      }
    }).catch(async () => {
      try {
        const usersRes = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(usersRes.data)) {
          const nonAdminUsers = usersRes.data.filter((u) => {
            const r = (u.role || '').toLowerCase();
            const e = (u.email || '').toLowerCase();
            return !r.includes('admin') && r !== 'manager' && r !== 'qa member' && !e.includes('admin');
          });
          setProjectLeads(nonAdminUsers);
        }
      } catch (err) {
        console.warn('Could not fetch project leads or users:', err.message);
      }
    });
  }, []);

  const leadOptions = useMemo(() => {
    return projectLeads.map((lead) => ({
      value: String(lead.id),
      label: `${lead.full_name} (${lead.role || 'Member'}) - ${lead.email}`
    }));
  }, [projectLeads]);

  // Dropdown context menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Role permissions
  const currentUserRole = localStorage.getItem('userRole') || 'Manager';
  const isQAMember = currentUserRole === 'QA Member';
  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';
  const canManageProjects = !isQAMember && !isDeveloper;
  const canCreateProject = !isQAMember && !isDeveloper && !isProjectLead;

  // Fetch projects from backend
  const fetchProjects = useCallback(async ({ silent = false } = {}) => {
    const token = getValidToken();
    if (!token) return;

    if (!silent) setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setProjects(response.data);
      }
    } catch (error) {
      console.warn('Backend unavailable:', error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const silentRefreshProjects = useCallback(() => {
    fetchProjects({ silent: true });
  }, [fetchProjects]);

  useRealtimeSync(['projects', 'sheets', 'tickets', 'approvals'], silentRefreshProjects);

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

  // Format date to Indian Standard (DD/MM/YYYY)
  const formatDate = (dateStr) => formatIndianDate(dateStr, 'Not set');

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
    if (isDeveloper) {
      return [...projects].sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    const activeSearch = searchQuery.trim().toLowerCase();

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
  }, [projects, searchQuery, departmentFilter, statusFilter, sortBy, isDeveloper]);

  // Compute Stats from real database records (0 when empty)
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
      total,
      inProgress,
      notStarted,
      completed
    };
  }, [projects]);

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validation: Only allow alphabetic characters and spaces for Project Name & Client Name
    if (name === 'name' || name === 'client_name') {
      const cleanAlpha = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleanAlpha }));
      if (formError) setFormError('');
      return;
    }

    // Validation: Team Members only numbers below 10 (1-9)
    if (name === 'team_members') {
      const cleanDigits = value.replace(/[^0-9]/g, '');
      if (cleanDigits === '') {
        setFormData((prev) => ({ ...prev, [name]: '' }));
      } else {
        const num = parseInt(cleanDigits, 10);
        if (num < 10) {
          setFormData((prev) => ({ ...prev, [name]: num }));
        }
      }
      if (formError) setFormError('');
      return;
    }

    // Validation: Start Date adjustment updates min target date
    if (name === 'start_date') {
      setFormData((prev) => {
        const updated = { ...prev, start_date: value };
        if (prev.end_date && prev.end_date <= value) {
          updated.end_date = '';
        }
        return updated;
      });
      if (formError) setFormError('');
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const openCreateModal = () => {
    if (!canCreateProject) return;
    setIsEditing(false);
    setEditId(null);
    setFormData({
      ...initialProjectForm,
      project_code: getNextProjectCode(projects),
      start_date: getTodayDateString(),
      team_members: ''
    });
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
      client_name: project.client_name || '',
      project_lead_id: project.project_lead_id ? String(project.project_lead_id) : '',
      lead_name: project.lead_name || '',
      priority: project.priority || 'Medium',
      department: project.department || 'Website',
      status: project.status || 'In Progress',
      start_date: toLocalDateInputString(project.start_date) || getTodayDateString(),
      team_members: project.team_members !== undefined && project.team_members !== null ? project.team_members : '',
      end_date: toLocalDateInputString(project.end_date)
    });
    setFormError('');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const alphaRegex = /^[a-zA-Z\s]+$/;

    // 1. Project Name validation (alphabets only, bounded length)
    if (!formData.name?.trim()) {
      setFormError('Please enter a Project Name.');
      return;
    }
    if (formData.name.trim().length > INPUT_LIMITS.NAME) {
      setFormError(`Project Name must not exceed ${INPUT_LIMITS.NAME} characters.`);
      return;
    }
    if (!alphaRegex.test(formData.name.trim())) {
      setFormError('Project Name can only contain alphabetic characters and spaces.');
      return;
    }

    // 2. Project Code validation
    if (!formData.project_code?.trim()) {
      setFormError('Please enter or generate a Project Code (Format: PRJ-KSV-001).');
      return;
    }

    // 3. Project Type (Department) validation
    if (!formData.department?.trim()) {
      setFormError('Please select a Project Type.');
      return;
    }

    // 4. Client Name validation (alphabets only, bounded length)
    if (!formData.client_name?.trim()) {
      setFormError('Please enter a Client Name.');
      return;
    }
    if (formData.client_name.trim().length > INPUT_LIMITS.NAME) {
      setFormError(`Client Name must not exceed ${INPUT_LIMITS.NAME} characters.`);
      return;
    }
    if (!alphaRegex.test(formData.client_name.trim())) {
      setFormError('Client Name can only contain alphabetic characters and spaces.');
      return;
    }

    // 5. Project Lead validation
    if (!formData.project_lead_id) {
      setFormError('Please select a Project Lead.');
      return;
    }

    // 6. Priority validation
    if (!formData.priority) {
      setFormError('Please select a Priority level.');
      return;
    }

    // 7. Status validation
    if (!formData.status) {
      setFormError('Please select a Status.');
      return;
    }

    // 8. Start Date validation (present or future date for new projects only)
    const todayStr = getTodayDateString();
    if (!formData.start_date) {
      setFormError('Please select a Start Date.');
      return;
    }
    if (!isEditing && formData.start_date < todayStr) {
      setFormError('Start Date must be today or a future date.');
      return;
    }

    // 9. Target End Date validation (optional, but if provided, must be strictly after start date)
    if (formData.end_date) {
      if (formData.end_date <= formData.start_date) {
        setFormError('Target End Date must be after the Start Date.');
        return;
      }
    }

    // 10. Team Members validation (must be number below 10: 1 to 9)
    const tm = parseInt(formData.team_members, 10);
    if (formData.team_members === '' || isNaN(tm) || tm < 1 || tm >= 10) {
      setFormError('Team Members is required and must be a number below 10 (1 - 9).');
      return;
    }

    // 11. Project Description validation
    const descErr = validateMeaningfulText(formData.description, {
      label: 'Project Description',
      required: true,
      maxLength: INPUT_LIMITS.DESCRIPTION
    });
    if (descErr) {
      setFormError(descErr);
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      if (isEditing && editId) {
        // Update Project
        let updatedProject = { ...formData, id: editId };
        if (token) {
          const res = await axios.put(`http://localhost:5000/api/admin/projects/${editId}`, formData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.project) {
            updatedProject = res.data.project;
          }
        }

        setProjects((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...updatedProject } : p))
        );
      } else {
        if (!canCreateProject) {
          setFormError('Project Leads do not have permission to create projects.');
          setSubmitting(false);
          return;
        }
        // Create Project
        let newProject = {
          ...formData,
          id: Date.now()
        };

        if (token) {
          const res = await axios.post('http://localhost:5000/api/admin/projects', formData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.project) {
            newProject = res.data.project;
          }
        }

        setProjects((prev) => [newProject, ...prev]);
        fetchProjects();
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

  const handleDeleteProject = (idOrProject) => {
    const target =
      idOrProject && typeof idOrProject === 'object'
        ? idOrProject
        : projects.find((p) => p.id === idOrProject) || { id: idOrProject };
    if (!target?.id) return;
    setDeleteError('');
    setProjectToDelete(target);
    setActiveMenuId(null);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete?.id) return;
    setDeletingProject(true);
    setDeleteError('');
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await axios.delete(`http://localhost:5000/api/admin/projects/${projectToDelete.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      setDeleteError(
        err.response?.data?.error || err.message || 'Failed to delete project. Please try again.'
      );
    } finally {
      setDeletingProject(false);
    }
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
          id="pj-logout-overlay"
          className="pj-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <div id="pj-logout-modal" className="pj-modal-card" style={{ maxWidth: '420px', padding: '24px' }}>
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
                <h3 id="pj-logout-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Sign out of workspace?
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  You can sign back in at any time.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button id="pj-logout-cancel-btn" className="pj-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button
                id="pj-logout-confirm-btn"
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

      {/* Role-Based Sidebar */}
      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      {/* Main Content Pane */}
      <main id="pj-main-content" className="main-content">
        <TopNavbar pageTitle="Projects Directory" />
        {/* Projects Page Container */}
        <div className="pj-page-container">
          <div className="users-page-layout projects-page-layout">
            {/* 1. Projects Workspace Header Row matching Tickets & Users */}
            <header id="pj-header-section" className="um-header-container">
              <div className="um-header-left">
                <div className="um-header-icon-box">
                  <Folder size={24} color="#2563EB" />
                </div>
                <div className="um-header-titles">
                  <h1 id="pj-page-heading">
                    {isDeveloper || isProjectLead ? 'Assigned Projects Workspace' : 'Projects Workspace'}
                  </h1>
                  <p>
                    {isDeveloper || isProjectLead
                      ? 'Inspect your assigned projects, view test suites, and execute roadmap milestones.'
                      : 'Track projects, monitor test execution progress, and manage QA workspace folders.'}
                  </p>
                </div>
              </div>

              <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Segmented View Switcher matching Tickets */}
                <div id="pj-view-switcher" className="ticket-view-toggle" role="group" aria-label="Project view mode">
                  <button
                    id="pj-view-grid-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={15} />
                    <span>Cards Grid</span>
                  </button>
                  <button
                    id="pj-view-list-btn"
                    type="button"
                    className={`ticket-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={15} />
                    <span>Table List</span>
                  </button>
                </div>

                {/* + Create Project Primary Button */}
                {canCreateProject && (
                  <button id="pj-create-project-btn" className="um-btn-create" onClick={openCreateModal}>
                    <Plus size={18} />
                    <span>Create Project</span>
                  </button>
                )}
              </div>
            </header>

            {/* 2. 4 Full-Width Summary KPI Cards matching Tickets & Users */}
            <section id="pj-stats-grid" className="um-stats-grid">
              {/* Card 1: Total Projects */}
              <div id="pj-stat-total" className="um-stat-card card-total">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-blue">
                    <Folder size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Total Projects</span>
                    <span className="um-stat-number">{stats.total}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-blue">Workspaces</span>
              </div>

              {/* Card 2: In Progress */}
              <div id="pj-stat-in-progress" className="um-stat-card card-active">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-green">
                    <PlayCircle size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">In Progress</span>
                    <span className="um-stat-number">{stats.inProgress}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-green">Active QA</span>
              </div>

              {/* Card 3: Not Started */}
              <div id="pj-stat-not-started" className="um-stat-card card-inactive">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-orange">
                    <Clock size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Not Started</span>
                    <span className="um-stat-number">{stats.notStarted}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-orange">Pipeline</span>
              </div>

              {/* Card 4: Completed */}
              <div id="pj-stat-completed" className="um-stat-card card-departments">
                <div className="um-stat-left">
                  <div className="um-stat-icon-wrap icon-wrap-purple">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="um-stat-info">
                    <span className="um-stat-label">Completed</span>
                    <span className="um-stat-number">{stats.completed}</span>
                  </div>
                </div>
                <span className="um-stat-badge badge-purple">Delivered</span>
              </div>
            </section>

            {/* 3. Full-Width Filter & Search Controls Bar */}
            {!isDeveloper && (
              <div className="um-controls-bar">
                <div className="um-search-container">
                  <Search size={16} color="#64748b" />
                  <input
                    id="pj-search-input"
                    type="text"
                    autoComplete="off"
                    maxLength={INPUT_LIMITS.SEARCH}
                    placeholder="Search by project name, code, project type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="um-search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="um-filter-selects">
                  <CustomSelect
                    id="pj-type-filter"
                    value={departmentFilter}
                    onChange={(val) => {
                      if (!filtersLocked) setDepartmentFilter(val);
                    }}
                    options={PJ_TYPE_OPTIONS}
                    variant="filter"
                    placeholder="All Project Types"
                    disabled={filtersLocked}
                  />

                  <CustomSelect
                    id="pj-status-filter"
                    value={statusFilter}
                    onChange={(val) => {
                      if (!filtersLocked) setStatusFilter(val);
                    }}
                    options={PJ_STATUS_OPTIONS}
                    variant="filter"
                    placeholder="All Statuses"
                    disabled={filtersLocked}
                  />

                  <div className="um-sort-lock-group">
                    <CustomSelect
                      id="pj-sort-filter"
                      value={sortBy}
                      onChange={(val) => {
                        if (!filtersLocked) setSortBy(val);
                      }}
                      options={PJ_SORT_OPTIONS}
                      variant="filter"
                      placeholder="Sort by"
                      disabled={filtersLocked}
                    />

                    <button
                      id="pj-filter-lock-btn"
                      type="button"
                      className={`um-fix-filter-chip ${filtersLocked ? 'is-locked' : ''}`}
                      onClick={toggleFilterLock}
                      aria-pressed={filtersLocked}
                      aria-label={filtersLocked ? 'Unlock filters' : 'Lock filters'}
                    >
                      {filtersLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section Header with Pill Badge matching Tickets */}
            <div className="ticket-folders-section-header" style={{ margin: '4px 0 16px' }}>
              <div className="ticket-folders-section-title">
                <Folder size={18} color="#2563eb" />
                <span>Project Workspaces</span>
                <span className="ticket-folders-total-pill">
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
            </div>

          {/* 4. Projects Display: Grid View or List View */}
          {loading && projects.length === 0 ? (
            viewMode === 'list' ? (
              <SkeletonLoader variant="table" rows={5} />
            ) : (
              <SkeletonLoader variant="cards" count={6} />
            )
          ) : filteredProjects.length === 0 ? (
            <div className="pj-empty-state-card" id="pj-empty-state">
              <div className="pj-empty-icon-wrap">
                <FolderPlus size={32} />
              </div>
              <h3 id="pj-empty-heading" className="pj-empty-heading">
                {projects.length === 0
                  ? (isDeveloper || isProjectLead)
                    ? 'No Assigned Projects Yet'
                    : 'No Projects Created Yet'
                  : 'No Matching Projects Found'}
              </h3>
              <p className="pj-empty-description">
                {projects.length === 0
                  ? (isDeveloper || isProjectLead)
                    ? 'You have not been assigned to any workspace projects yet. Contact your Project Lead or Manager to get assigned.'
                    : 'Your workspace is clean and ready. Kickstart test operations by creating your first QA project.'
                  : `No projects match "${searchQuery || 'current filters'}". Try adjusting your search keyword or clearing active filters.`}
              </p>

              {projects.length === 0 && canManageProjects && (
                <button
                  id="pj-empty-create-btn"
                  className="pj-btn-create-primary"
                  onClick={openCreateModal}
                  style={{ marginTop: '4px' }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Create Your First Project</span>
                </button>
              )}

              {projects.length > 0 && (
                <button
                  id="pj-empty-reset-filters-btn"
                  className="pj-btn-reset-filters"
                  onClick={() => {
                    setSearchQuery('');
                    setDepartmentFilter('All Departments');
                    setStatusFilter('All Statuses');
                    setSortBy('Last Updated');
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <section id="pj-cards-grid" className="pj-cards-grid">
              {filteredProjects.map((project) => (
                <article
                  id={`pj-card-${project.id || project.project_code}`}
                  key={project.id || project.project_code}
                  className="pj-card"
                  onDoubleClick={(event) => {
                    if (!event.target.closest('button')) openProjectWorkspace(project);
                  }}
                >
                  {/* Top: Folder Graphic + Status Badge + Actions */}
                  <div className="pj-card-top">
                    <FolderEmblem code={project.project_code} label={project.name} />

                    <div className="pj-card-top-right">
                      {project.priority && (
                        <span className={`pj-priority-badge ${project.priority.toLowerCase()}`}>
                          {project.priority}
                        </span>
                      )}
                      <span className={`pj-status-badge ${getStatusClass(project.status)}`}>
                        {project.status || 'Active'}
                      </span>

                      {/* Three-dots menu */}
                      {canManageProjects && (
                        <div className="pj-card-menu-wrap">
                          <button
                            id={`pj-card-more-btn-${project.id}`}
                            className="pj-btn-more"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === project.id ? null : project.id)
                            }
                            aria-label="Project actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === project.id && (
                            <div id={`pj-card-dropdown-${project.id}`} className="pj-dropdown-menu">
                              <button
                                id={`pj-card-edit-btn-${project.id}`}
                                className="pj-dropdown-item"
                                onClick={() => openEditModal(project)}
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>
                              <button
                                id={`pj-card-delete-btn-${project.id}`}
                                className="pj-dropdown-item danger"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Project Code */}
                  <div className="pj-card-titles">
                    <h3 id={`pj-card-name-${project.id || project.project_code}`} className="pj-card-name">{project.name}</h3>
                    <p className="pj-card-code">{project.project_code}</p>
                  </div>

                  {/* 2x2 Metadata Grid */}
                  <div className="pj-card-meta-grid">
                    {/* Row 1, Col 1: Department */}
                    <div className="pj-meta-item">
                      <Building2 size={15} />
                      <span>{project.department || 'Website'}</span>
                    </div>

                    {/* Row 1, Col 2: Project Lead */}
                    <div className="pj-meta-item">
                      <User size={15} />
                      <span>{project.lead_name || 'Lead Member'}</span>
                    </div>

                    {/* Row 2, Col 1: Start Date */}
                    <div className="pj-meta-item">
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

                  {/* Card Quick Actions Bar */}
                  <div className="pj-card-actions-bar">
                    <button
                      id={`pj-card-sheet-btn-${project.id || project.project_code}`}
                      type="button"
                      className="pj-card-action-btn sheet"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/projects/${project.id}/sheet`);
                      }}
                    >
                      <FileSpreadsheet size={14} />
                      <span>Test Sheet</span>
                    </button>
                    <button
                      id={`pj-card-workspace-btn-${project.id || project.project_code}`}
                      type="button"
                      className="pj-card-action-btn workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjectWorkspace(project);
                      }}
                    >
                      <Folder size={14} />
                      <span>Workspace</span>
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            /* List / Table Mode */
            <section id="pj-table-section" className="pj-table-card">
              <div className="pj-table-scroll">
                <table id="pj-list-table" className="pj-table">
                  <thead>
                    <tr>
                      <th>Project Code</th>
                      <th>Project Name</th>
                      <th>Project Type</th>
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
                        id={`pj-list-row-${project.id || project.project_code}`}
                        key={project.id || project.project_code}
                        onDoubleClick={(event) => {
                          if (!event.target.closest('button')) openProjectWorkspace(project);
                        }}
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
                        <td>{project.team_members ?? 0} Members</td>
                        <td style={{ fontWeight: 700 }}>{project.test_cases ?? 0}</td>
                        <td style={{ fontWeight: 700 }}>{project.documents ?? 0}</td>
                        <td style={{ fontWeight: 700 }}>{project.tickets_count ?? 0}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            id={`pj-list-sheet-btn-${project.id || project.project_code}`}
                            className="pj-btn-more"
                            style={{ display: 'inline-flex', marginRight: '6px' }}
                            onClick={() => navigate(`/admin/projects/${project.id}/sheet`)}
                            aria-label="Open Project Sheet Workspace"
                          >
                            <FileSpreadsheet size={15} />
                          </button>
                          {canManageProjects && (
                            <button
                              id={`pj-list-edit-btn-${project.id || project.project_code}`}
                              className="pj-btn-more"
                              style={{ display: 'inline-flex' }}
                              onClick={() => openEditModal(project)}
                              aria-label="Edit project"
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
        </div>
      </main>

      {/* 5. Create / Edit Project Modal */}
      {isModalOpen && (
        <div
          id="pj-form-modal-overlay"
          className="pj-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div id="pj-form-modal-card" className="pj-modal-card">
            <div className="pj-modal-header">
              <div>
                <h3 id="pj-form-modal-title">{isEditing ? 'Edit Project Specifications' : 'Create New Project'}</h3>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                  {isEditing ? 'Update project scope, lead assignment, and timelines.' : 'Fill in project details and configure workspace access.'}
                </p>
              </div>
              <button
                id="pj-form-modal-close-btn"
                className="pj-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form id="pj-project-form" onSubmit={handleFormSubmit}>
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
                    <label htmlFor="pj-modal-name">
                      Project Name <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="pj-modal-name"
                      type="text"
                      name="name"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.NAME}
                      placeholder="e.g. Customer Support Portal"
                      value={formData.name}
                      onChange={handleInputChange}
                      pattern="[a-zA-Z\s]+"
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label htmlFor="pj-modal-code">
                      Project Code <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="pj-modal-code"
                      type="text"
                      name="project_code"
                      autoComplete="off"
                      placeholder="e.g. PRJ-KSV-001"
                      value={formData.project_code}
                      readOnly
                      required
                      style={{
                        backgroundColor: '#F8FAFC',
                        cursor: 'not-allowed',
                        color: '#0F172A',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label htmlFor="pj-modal-type">
                      Project Type <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      id="pj-modal-type"
                      value={formData.department}
                      onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
                      options={MODAL_PROJECT_TYPE_OPTIONS}
                      variant="form"
                      placeholder="-- Select Project Type --"
                    />
                  </div>

                  <div className="pj-form-group">
                    <label htmlFor="pj-modal-client">
                      Client Name <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="pj-modal-client"
                      type="text"
                      name="client_name"
                      autoComplete="off"
                      maxLength={INPUT_LIMITS.NAME}
                      placeholder="e.g. Acme Health Corp"
                      value={formData.client_name || ''}
                      onChange={handleInputChange}
                      pattern="[a-zA-Z\s]+"
                      required
                    />
                  </div>

                  <div className="pj-form-group pj-form-full">
                    <label htmlFor="pj-modal-lead">
                      Project Lead <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      id="pj-modal-lead"
                      value={String(formData.project_lead_id || '')}
                      onChange={(val) => {
                        const leadObj = projectLeads.find((l) => String(l.id) === String(val));
                        setFormData((prev) => ({
                          ...prev,
                          project_lead_id: val,
                          lead_name: leadObj ? leadObj.full_name : ''
                        }));
                      }}
                      options={leadOptions}
                      variant="form"
                      placeholder="-- Select Project Lead --"
                    />
                  </div>

                  <div className="pj-form-row-3">
                    <div className="pj-form-group">
                      <label htmlFor="pj-modal-priority">
                        Priority <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <CustomSelect
                        id="pj-modal-priority"
                        value={formData.priority || 'Medium'}
                        onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                        options={MODAL_PROJECT_PRIORITY_OPTIONS}
                        variant="form"
                      />
                    </div>

                    <div className="pj-form-group">
                      <label htmlFor="pj-modal-status">
                        Status <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <CustomSelect
                        id="pj-modal-status"
                        value={formData.status}
                        onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                        options={MODAL_PROJECT_STATUS_OPTIONS}
                        variant="form"
                      />
                    </div>

                    <div className="pj-form-group">
                      <label htmlFor="pj-modal-team-members">
                        Team Members <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        id="pj-modal-team-members"
                        type="number"
                        name="team_members"
                        autoComplete="off"
                        min="1"
                        max="9"
                        placeholder="Team size (1 - 9)"
                        value={formData.team_members}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="pj-form-group">
                    <label htmlFor="pj-modal-start-date">
                      Start Date <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      id="pj-modal-start-date"
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      min={isEditing ? undefined : getTodayDateString()}
                      onChange={handleInputChange}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label htmlFor="pj-modal-end-date">
                      Target End Date <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                    <input
                      id="pj-modal-end-date"
                      type="date"
                      name="end_date"
                      value={formData.end_date || ''}
                      min={getMinTargetDate(formData.start_date)}
                      onChange={handleInputChange}
                      autoComplete="off"
                    />
                  </div>

                  <div className="pj-form-group pj-form-full">
                    <label htmlFor="pj-modal-description">
                      Project Description <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      id="pj-modal-description"
                      name="description"
                      rows="3"
                      maxLength={INPUT_LIMITS.DESCRIPTION}
                      placeholder="Brief overview of project scope and objectives..."
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pj-modal-footer">
                <button
                  id="pj-form-cancel-btn"
                  type="button"
                  className="pj-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="pj-form-submit-btn"
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

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {projectToDelete && (
        <div
          id="pj-delete-modal-overlay"
          className="pj-del-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingProject) {
              setProjectToDelete(null);
            }
          }}
        >
          <div
            id="pj-delete-modal-card"
            className="pj-del-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
          >
            <div className="pj-del-modal-header">
              <h3 id="delete-project-title" className="pj-del-modal-title">
                <AlertTriangle size={20} color="#dc2626" /> Delete Project
              </h3>
              <button
                id="pj-delete-modal-close-btn"
                type="button"
                className="pj-del-modal-close"
                onClick={() => setProjectToDelete(null)}
                disabled={deletingProject}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pj-del-modal-body">
              {deleteError && <div className="pj-del-error-banner">{deleteError}</div>}
              <p style={{ margin: 0, fontSize: '0.94rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete project{' '}
                <strong>{projectToDelete.name || 'this project'}</strong>
                {projectToDelete.project_code ? ` (${projectToDelete.project_code})` : ''}?
              </p>
            </div>

            <div className="pj-del-modal-footer">
              <button
                id="pj-delete-cancel-btn"
                type="button"
                className="pj-del-btn-cancel"
                disabled={deletingProject}
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button
                id="pj-delete-confirm-btn"
                type="button"
                className="pj-del-btn-danger"
                disabled={deletingProject}
                onClick={confirmDeleteProject}
              >
                {deletingProject ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProjects;
