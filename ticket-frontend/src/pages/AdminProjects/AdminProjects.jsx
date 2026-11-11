import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  Edit2,
  FileSpreadsheet,
  FileText,
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
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import FolderEmblem from './FolderEmblem';
import ProjectSpreadsheetView from './ProjectSpreadsheetView';
import '../../styles/admin.css';
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

export const generateProjectCode = (nameVal, existingProjects = []) => {
  if (!nameVal || !nameVal.trim()) return '';

  // Split into words by spaces, hyphens or underscores
  const words = nameVal
    .trim()
    .split(/[\s\-_]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  if (words.length === 0) return '';

  let codeKey = '';
  if (words.length > 1) {
    // Multi-word project: take first letters of the words (acronym, e.g. "Customer Support Portal" -> "CSP")
    codeKey = words.map((w) => w.charAt(0).toUpperCase()).join('');
  } else {
    // Single word project: shorten word to 3-4 uppercase characters (e.g. "Hospital" -> "HOSP", "Dee" -> "DEE")
    const singleWord = words[0].toUpperCase();
    codeKey = singleWord.length > 4 ? singleWord.slice(0, 4) : singleWord;
  }

  if (!codeKey) return '';

  const prefix = `PRJ-${codeKey}`;
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-([0-9]+)$`);
  if (Array.isArray(existingProjects)) {
    existingProjects.forEach((p) => {
      if (p && p.project_code) {
        const match = p.project_code.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
  }
  const nextNum = String(maxNum + 1).padStart(4, '0');
  return `${prefix}-${nextNum}`;
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

function AdminProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
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
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [projectLeads, setProjectLeads] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
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
            return !r.includes('admin') && r !== 'manager' && r !== 'qa member' && !e.includes('admin') && e !== 'manager@gmail.com';
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

  // User Profile & Unread Notifications
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || 'manager@gmail.com');
  const displayName = userEmail ? userEmail.split('@')[0] : 'manager';
  const currentUserRole = localStorage.getItem('userRole') || 'Manager';
  const isQAMember = currentUserRole === 'QA Member';
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const handleUnreadCount = (event) => {
      setUnreadNotificationsCount(Number(event.detail?.unreadCount || 0));
    };
    window.addEventListener('notifications-unread-count', handleUnreadCount);
    return () => window.removeEventListener('notifications-unread-count', handleUnreadCount);
  }, []);

  // Fetch projects from backend
  const fetchProjects = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
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

  // Format date to Indian Standard (DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const [y, m, d] = dateStr.trim().split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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
  }, [projects, searchQuery, departmentFilter, statusFilter, sortBy]);

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
      setFormData((prev) => {
        const updated = { ...prev, [name]: cleanAlpha };
        if (name === 'name' && !isEditing) {
          updated.project_code = generateProjectCode(cleanAlpha, projects);
        }
        return updated;
      });
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
    setIsEditing(false);
    setEditId(null);
    setFormData({
      ...initialProjectForm,
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

    // 1. Project Name validation (alphabets only)
    if (!formData.name?.trim()) {
      setFormError('Please enter a Project Name.');
      return;
    }
    if (!alphaRegex.test(formData.name.trim())) {
      setFormError('Project Name can only contain alphabetic characters and spaces.');
      return;
    }

    // 2. Project Code validation
    if (!formData.project_code?.trim()) {
      setFormError('Please enter or generate a Project Code (Format: PRJ-PRJ_NAME-0001).');
      return;
    }

    // 3. Project Type (Department) validation
    if (!formData.department?.trim()) {
      setFormError('Please select a Project Type.');
      return;
    }

    // 4. Client Name validation (alphabets only)
    if (!formData.client_name?.trim()) {
      setFormError('Please enter a Client Name.');
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
    if (!formData.description?.trim()) {
      setFormError('Please enter a Project Description.');
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
      department: 'Website',
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
        {/* Top Utility Actions: Notification Bell + Profile */}
        <div className="pj-top-utility-bar">
          <div className="header-right pj-exact-header-right">
            <button
              type="button"
              className="notification-bell pj-header-bell-btn"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => window.dispatchEvent(new Event('open-notifications-drawer'))}
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="notification-count pj-bell-badge">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <div className="user-profile pj-header-profile" title="Administrator account">
              <div className="avatar pj-profile-avatar">{displayName ? displayName.charAt(0).toUpperCase() : 'M'}</div>
              <div className="user-info pj-profile-text">
                <span className="user-name pj-profile-name">{displayName}</span>
                <span className="user-role pj-profile-role">{currentUserRole}</span>
              </div>
              <ChevronDown size={14} className="profile-chevron pj-profile-chevron" />
            </div>
          </div>
        </div>

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
                placeholder="Search by project name, code, project type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="pj-dropdown-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <CustomSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={PJ_TYPE_OPTIONS}
                variant="filter"
                placeholder="All Project Types"
              />

              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={PJ_STATUS_OPTIONS}
                variant="filter"
                placeholder="All Statuses"
              />

              <CustomSelect
                value={sortBy}
                onChange={setSortBy}
                options={PJ_SORT_OPTIONS}
                variant="filter"
                placeholder="Sort by"
              />
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
            </div>
          </section>

          {/* 4. Projects Display: Sheet View, Grid View or List View */}
          {filteredProjects.length === 0 && viewMode !== 'sheet' ? (
            <div className="pj-empty-state" style={{
              background: '#FFFFFF',
              border: '1.5px dashed #CBD5E1',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0'
            }}>
              <Folder size={42} color="#94A3B8" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>No Projects Created Yet</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B', maxWidth: '440px' }}>
                Your production workspace is clean and ready. Click the "+ Create Project" button above to initiate your first QA project.
              </p>
            </div>
          ) : viewMode === 'sheet' ? (
            <ProjectSpreadsheetView
              projects={projects}
              onUpdateProject={handleUpdateProjectCell}
              onAddRow={handleAddSheetRow}
              onDeleteRow={handleDeleteProject}
              onOpenProjectSheet={(project) => navigate(`/admin/projects/${project.id}/sheet`)}
              searchQuery={searchQuery}
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
                      {!isQAMember && (
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
                                onClick={() => openEditModal(project)}
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>
                              <button
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
                    <h3 className="pj-card-name">{project.name}</h3>
                    <p className="pj-card-code">{project.project_code}</p>
                  </div>

                  {/* 2x2 Metadata Grid */}
                  <div className="pj-card-meta-grid">
                    {/* Row 1, Col 1: Department */}
                    <div className="pj-meta-item" title={project.department}>
                      <Building2 size={15} />
                      <span>{project.department || 'Website'}</span>
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

                  {/* Card Quick Actions Bar */}
                  <div className="pj-card-actions-bar">
                    <button
                      type="button"
                      className="pj-card-action-btn sheet"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/projects/${project.id}/sheet`);
                      }}
                      title="Open Test Case Execution Sheet"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Test Sheet</span>
                    </button>
                    <button
                      type="button"
                      className="pj-card-action-btn workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProjectWorkspace(project);
                      }}
                      title="Open Project Workspace"
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
            <section className="pj-table-card">
              <div className="pj-table-scroll">
                <table className="pj-table">
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
                        <td>{project.team_members ?? 0} Members</td>
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
              <div>
                <h3>{isEditing ? 'Edit Project Specifications' : 'Create New Project'}</h3>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                  {isEditing ? 'Update project scope, lead assignment, and timelines.' : 'Fill in project details and configure workspace access.'}
                </p>
              </div>
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
                    <label>
                      Project Name <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Customer Support Portal"
                      value={formData.name}
                      onChange={handleInputChange}
                      pattern="[a-zA-Z\s]+"
                      title="Only alphabetic characters and spaces are allowed"
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Project Code <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="project_code"
                      placeholder="e.g. PRJ-CSP-0001"
                      value={formData.project_code}
                      readOnly
                      required
                      style={{
                        backgroundColor: '#F8FAFC',
                        cursor: 'not-allowed',
                        color: '#0F172A',
                        fontWeight: 600
                      }}
                      title="Auto-generated from Project Name"
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Project Type <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      value={formData.department}
                      onChange={(val) => setFormData((prev) => ({ ...prev, department: val }))}
                      options={MODAL_PROJECT_TYPE_OPTIONS}
                      variant="form"
                      placeholder="-- Select Project Type --"
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Client Name <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      placeholder="e.g. Acme Health Corp"
                      value={formData.client_name || ''}
                      onChange={handleInputChange}
                      pattern="[a-zA-Z\s]+"
                      title="Only alphabetic characters and spaces are allowed"
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Project Lead <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
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

                  <div className="pj-form-group">
                    <label>
                      Priority <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      value={formData.priority || 'Medium'}
                      onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                      options={MODAL_PROJECT_PRIORITY_OPTIONS}
                      variant="form"
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Status <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                      options={MODAL_PROJECT_STATUS_OPTIONS}
                      variant="form"
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Start Date <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      min={isEditing ? undefined : getTodayDateString()}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Target End Date <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date || ''}
                      min={getMinTargetDate(formData.start_date)}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="pj-form-group">
                    <label>
                      Team Members <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="team_members"
                      min="1"
                      max="9"
                      placeholder="Enter team size (1 - 9)"
                      value={formData.team_members}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="pj-form-group pj-form-full">
                    <label>
                      Project Description <span className="req-star" style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      name="description"
                      rows="3"
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

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {projectToDelete && (
        <div
          className="pj-del-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deletingProject) {
              setProjectToDelete(null);
            }
          }}
        >
          <div
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
                type="button"
                className="pj-del-btn-cancel"
                disabled={deletingProject}
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button
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
