import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  List,
  LogOut,
  Maximize2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Upload,
  Video,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import { INPUT_LIMITS, validateFields } from '../../utils/inputValidation';
import { getRolePath } from '../../utils/roleRoutes';
import { API_BASE } from '../../utils/apiConfig';
import {
  normalizeMediaItem,
  validateMediaFile,
  readFileAsDataUrl
} from '../../utils/mediaPreview';
import FolderEmblem from '../AdminProjects/FolderEmblem';
import { getValidToken, clearAuthSession } from '../../utils/auth';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import '../../styles/admin.css';
import '../AdminUsers/AdminUsers.css';
import '../AdminProjects/AdminProjects.css';
import './AdminTickets.css';

const TICKET_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Reopened', label: 'Reopened' },
  { value: 'Closed', label: 'Closed' }
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'All', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Block', label: 'Block' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const TICKET_TYPE_OPTIONS = [
  { value: 'All', label: 'All Types' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Incident', label: 'Incident' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Task', label: 'Task' }
];

const MODAL_TYPE_OPTIONS = [
  { value: 'Bug', label: 'Bug' },
  { value: 'Incident', label: 'Incident' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Task', label: 'Task' }
];

const MODAL_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'Block', label: 'Block' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

const initialTicketForm = {
  title: '',
  description: '',
  project_code: 'PRJ-QA-01',
  assigned_to: 'Admin User',
  priority: 'Medium',
  type: 'Bug',
  status: 'Open',
  attachments: []
};

const TICKET_TYPE_CLASS_MAP = {
  Bug: 'type-bug',
  Incident: 'type-incident',
  Feature: 'type-feature',
  Recommendation: 'type-feature',
  Task: 'type-task'
};

const FOLDER_PRIORITY_LEVELS = [
  { key: 'critical', label: 'Critical' },
  { key: 'block', label: 'Block' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' }
];

const SEVERITY_LABEL_MAP = {
  critical: 'Critical',
  block: 'Block',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

function resolveTicketLevel(ticket) {
  const priority = String(ticket?.priority || '').trim().toLowerCase();
  const severity = String(ticket?.severity || '').trim().toLowerCase();
  const status = String(ticket?.status || '').trim().toLowerCase();

  if (
    ['block', 'blocker', 'blocked'].includes(priority) ||
    ['block', 'blocker', 'blocked'].includes(severity) ||
    ['block', 'blocker', 'blocked'].includes(status)
  ) {
    return 'block';
  }
  if (priority === 'critical' || priority === 'urgent' || severity === 'critical') {
    return 'critical';
  }
  if (priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority;
  }
  if (severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity;
  }
  return 'medium';
}

function getFolderPriorityCounts(folderTickets) {
  const counts = {
    critical: 0,
    block: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  (folderTickets || []).forEach((ticket) => {
    const level = resolveTicketLevel(ticket);
    if (Object.prototype.hasOwnProperty.call(counts, level)) {
      counts[level] += 1;
    }
  });
  return counts;
}

function matchesTicketAttributes(ticket, { statusFilter, priorityFilter, typeFilter }) {
  const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
  const matchesPriority =
    priorityFilter === 'All' || resolveTicketLevel(ticket) === priorityFilter.toLowerCase();
  const matchesType = typeFilter === 'All' || ticket.type === typeFilter;
  return matchesStatus && matchesPriority && matchesType;
}

function matchesTicketQuery(ticket, query) {
  if (!query) return true;
  return (
    ticket.ticket_code?.toLowerCase().includes(query) ||
    ticket.title?.toLowerCase().includes(query) ||
    ticket.description?.toLowerCase().includes(query) ||
    ticket.assigned_to?.toLowerCase().includes(query) ||
    ticket.project_code?.toLowerCase().includes(query) ||
    ticket.project_name?.toLowerCase().includes(query) ||
    ticket.test_case_id?.toLowerCase().includes(query) ||
    ticket.module?.toLowerCase().includes(query)
  );
}

function AdminTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedFolderKey, setSelectedFolderKey] = useState(null);
  const [viewMode, setViewMode] = useState('folders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialTicketForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';
  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    const token = getValidToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (!silent) setLoading(true);
    try {
      const [ticketsRes, projectsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/tickets', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      setTickets(ticketsRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuthSession();
        navigate('/', { replace: true });
      } else {
        console.error('Failed to load tickets:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const silentRefreshTickets = useCallback(() => {
    fetchData({ silent: true });
  }, [fetchData]);

  useRealtimeSync(['tickets', 'projects'], silentRefreshTickets);

  const projectOptions = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [{ value: 'PRJ-QA-01', label: 'PRJ-QA-01 - Automation Suite' }];
    }
    return projects.map((p) => ({
      value: p.project_code,
      label: `${p.project_code} - ${p.name}`
    }));
  }, [projects]);

  const userOptions = useMemo(() => {
    if (!users || users.length === 0) {
      return [{ value: 'Admin User', label: 'Admin User' }];
    }
    return users.map((u) => ({
      value: u.full_name || u.email,
      label: `${u.full_name || u.email} (${u.role || 'Member'})`
    }));
  }, [users]);

  const handleOpenRaiseModal = () => {
    setFormError('');
    const defaultProjectCode =
      (activeFolder && activeFolder.projectCode && activeFolder.projectCode !== 'General'
        ? activeFolder.projectCode
        : projects[0]?.project_code) || initialTicketForm.project_code;

    const defaultAssignee =
      users[0]?.full_name || users[0]?.email || initialTicketForm.assigned_to;

    setFormData({
      ...initialTicketForm,
      project_code: defaultProjectCode,
      assigned_to: defaultAssignee
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleAttachmentChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setFormError('');
    setUploadingAttachments(true);

    try {
      const token = localStorage.getItem('token');
      const uploadedFiles = [];

      for (const file of files) {
        const validationMsg = validateMediaFile(file, 25 * 1024 * 1024);
        if (validationMsg) {
          setFormError(validationMsg);
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        const fallbackMediaType = file.type?.startsWith('video/') ? 'video' : 'image';

        try {
          const uploadRes = await axios.post(
            `${API_BASE}/api/admin/tickets/upload-image`,
            { imageBase64: dataUrl, filename: file.name, fileType: file.type },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: uploadRes.data.url,
            mediaType: uploadRes.data.mediaType || fallbackMediaType
          });
        } catch {
          uploadedFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: dataUrl,
            mediaType: fallbackMediaType
          });
        }
      }

      if (uploadedFiles.length > 0) {
        setFormData((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...uploadedFiles]
        }));
      }
      event.target.value = '';
    } catch (error) {
      console.error('Error attaching files:', error);
      setFormError('One or more files could not be attached. Please try again.');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');

    const validationErr = validateFields([
      { value: formData.title, options: { label: 'Ticket Title', required: true, maxLength: INPUT_LIMITS.TITLE } },
      { value: formData.description, options: { label: 'Description', required: false, maxLength: INPUT_LIMITS.DESCRIPTION } }
    ]);
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);

    try {
      const matchedProject = projects.find(
        (p) => p.project_code?.toLowerCase() === formData.project_code?.toLowerCase()
      );
      const response = await axios.post(
        'http://localhost:5000/api/admin/tickets',
        {
          ...formData,
          severity: formData.priority,
          project_id: matchedProject?.id || activeFolder?.projectId || undefined,
          title: formData.title.trim(),
          description: formData.description.trim(),
          attachments: formData.attachments || []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTickets((prev) => [response.data.ticket, ...prev]);
      setIsModalOpen(false);
      setFormData(initialTicketForm);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setFormError(
        error.response?.data?.error || 'Failed to create ticket. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/', { replace: true });
  };

  // Group all tickets into their respective project folders, enriched with project metadata
  const projectFolders = useMemo(() => {
    const folderMap = new Map();
    const projectById = new Map();
    const projectByCode = new Map();

    projects.forEach((p) => {
      const key = `id-${p.id}`;
      projectById.set(String(p.id), p);
      if (p.project_code) {
        projectByCode.set(p.project_code.trim().toLowerCase(), p);
      }
      folderMap.set(key, {
        key,
        projectId: p.id,
        projectCode: p.project_code || 'N/A',
        projectName: p.name || p.project_code || 'Untitled Project',
        leadName: p.lead_name || '',
        department: p.department || '',
        status: p.status || 'Active',
        folderColor: p.folder_color || 'blue',
        tickets: []
      });
    });

    tickets.forEach((t) => {
      const codeNorm = t.project_code ? String(t.project_code).trim().toLowerCase() : '';
      const matchedProject =
        (t.project_id ? projectById.get(String(t.project_id)) : null) ||
        (codeNorm ? projectByCode.get(codeNorm) : null);

      let key;
      if (matchedProject) {
        key = `id-${matchedProject.id}`;
      } else if (t.project_id) {
        key = `id-${t.project_id}`;
      } else if (codeNorm && codeNorm !== 'general') {
        key = `code-${codeNorm}`;
      } else {
        key = 'general';
      }

      if (!folderMap.has(key)) {
        folderMap.set(key, {
          key,
          projectId: matchedProject?.id || t.project_id || null,
          projectCode: matchedProject?.project_code || t.project_code || 'General',
          projectName:
            matchedProject?.name ||
            t.project_name ||
            (key === 'general' ? 'General / Unassigned Project' : t.project_code || 'Project Tickets'),
          leadName: matchedProject?.lead_name || t.project_lead_name || '',
          department: matchedProject?.department || t.project_department || '',
          status: matchedProject?.status || t.project_status || 'Active',
          folderColor: matchedProject?.folder_color || t.project_folder_color || 'blue',
          tickets: []
        });
      }

      folderMap.get(key).tickets.push(t);
    });

    return Array.from(folderMap.values()).sort((a, b) => {
      const aHasTickets = a.tickets.length > 0 ? 1 : 0;
      const bHasTickets = b.tickets.length > 0 ? 1 : 0;
      if (aHasTickets !== bHasTickets) return bHasTickets - aHasTickets;

      const aActive = a.tickets.filter((t) =>
        ['Open', 'In Progress', 'Reopened'].includes(t.status)
      ).length;
      const bActive = b.tickets.filter((t) =>
        ['Open', 'In Progress', 'Reopened'].includes(t.status)
      ).length;
      if (aActive !== bActive) return bActive - aActive;

      if (b.tickets.length !== a.tickets.length) return b.tickets.length - a.tickets.length;
      return a.projectName.localeCompare(b.projectName);
    });
  }, [projects, tickets]);

  // Open a specific project folder if ?projectId=... or ?projectCode=... is present in the URL
  useEffect(() => {
    if (loading || projectFolders.length === 0) return;
    const urlProjectId = searchParams.get('projectId');
    const urlProjectCode = searchParams.get('projectCode');
    if (!urlProjectId && !urlProjectCode) return;

    const target = projectFolders.find((folder) => {
      if (urlProjectId && String(folder.projectId) === String(urlProjectId)) return true;
      if (
        urlProjectCode &&
        folder.projectCode?.toLowerCase() === String(urlProjectCode).trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (target) {
      setSelectedFolderKey(target.key);
      setViewMode('folders');
    }
  }, [loading, projectFolders, searchParams]);

  const activeFolder = useMemo(
    () => projectFolders.find((f) => f.key === selectedFolderKey) || null,
    [projectFolders, selectedFolderKey]
  );

  const handleOpenFolder = (folder) => {
    setSelectedFolderKey(folder.key);
    setViewMode('folders');
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setTypeFilter('All');
    if (folder.projectId) {
      setSearchParams({ projectId: String(folder.projectId) }, { replace: true });
    } else if (folder.projectCode && folder.projectCode !== 'General') {
      setSearchParams({ projectCode: folder.projectCode }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleCloseFolder = () => {
    setSelectedFolderKey(null);
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setTypeFilter('All');
    if (searchParams.has('projectId') || searchParams.has('projectCode')) {
      setSearchParams({}, { replace: true });
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const isShowingFoldersGrid = viewMode === 'folders' && !activeFolder;

  const visibleFolders = useMemo(() => {
    if (!query) return projectFolders;
    return projectFolders.filter((folder) => {
      const folderMatches =
        folder.projectName?.toLowerCase().includes(query) ||
        folder.projectCode?.toLowerCase().includes(query) ||
        folder.leadName?.toLowerCase().includes(query) ||
        folder.department?.toLowerCase().includes(query);
      if (folderMatches) return true;
      return folder.tickets.some((ticket) => matchesTicketQuery(ticket, query));
    });
  }, [projectFolders, query]);

  const folderSummaryStats = useMemo(() => {
    let resolvedFolders = 0;
    let inProgressFolders = 0;

    projectFolders.forEach((folder) => {
      if (folder.tickets.length === 0) return;
      const allResolved = folder.tickets.every((ticket) =>
        ['Resolved', 'Closed'].includes(ticket.status)
      );
      if (allResolved) {
        resolvedFolders += 1;
      } else {
        inProgressFolders += 1;
      }
    });

    return {
      resolvedFolders,
      inProgressFolders
    };
  }, [projectFolders]);

  const filteredTickets = useMemo(() => {
    const sourceTickets = activeFolder ? activeFolder.tickets : tickets;
    const filterOpts = { statusFilter, priorityFilter, typeFilter };
    return sourceTickets.filter(
      (t) => matchesTicketAttributes(t, filterOpts) && matchesTicketQuery(t, query)
    );
  }, [activeFolder, tickets, query, statusFilter, priorityFilter, typeFilter]);

  const overviewCards = useMemo(() => {
    if (isShowingFoldersGrid) {
      return [
        {
          key: 'folders-total',
          label: 'Total Folders',
          value: projectFolders.length,
          Icon: Folder,
          cardClass: 'card-total',
          iconWrapClass: 'icon-wrap-blue',
          badge: 'Workspaces',
          badgeClass: 'badge-blue'
        },
        {
          key: 'folders-progress',
          label: 'Active Defect Folders',
          value: folderSummaryStats.inProgressFolders,
          Icon: Clock,
          cardClass: 'card-inactive',
          iconWrapClass: 'icon-wrap-orange',
          badge: 'Investigating',
          badgeClass: 'badge-orange'
        },
        {
          key: 'folders-resolved',
          label: 'Resolved Folders',
          value: folderSummaryStats.resolvedFolders,
          Icon: CheckCircle2,
          cardClass: 'card-active',
          iconWrapClass: 'icon-wrap-green',
          badge: 'QA Cleared',
          badgeClass: 'badge-green'
        },
        {
          key: 'folders-tickets',
          label: 'Total Bug Tickets',
          value: tickets.length,
          Icon: Ticket,
          cardClass: 'card-departments',
          iconWrapClass: 'icon-wrap-purple',
          badge: 'All Defects',
          badgeClass: 'badge-purple'
        }
      ];
    }

    const source = activeFolder ? activeFolder.tickets : tickets;
    const openCount = source.filter((t) => ['Open', 'Reopened'].includes(t.status)).length;
    const inProgressCount = source.filter((t) => t.status === 'In Progress').length;
    const resolvedCount = source.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length;

    return [
      {
        key: 'tickets-total',
        label: activeFolder ? 'Folder Tickets' : 'Total Defects',
        value: source.length,
        Icon: Ticket,
        cardClass: 'card-total',
        iconWrapClass: 'icon-wrap-blue',
        badge: activeFolder ? (activeFolder.projectCode || 'Project') : 'Repository',
        badgeClass: 'badge-blue'
      },
      {
        key: 'tickets-open',
        label: 'Open Defects',
        value: openCount,
        Icon: AlertCircle,
        cardClass: 'card-inactive',
        iconWrapClass: 'icon-wrap-orange',
        badge: 'Action Needed',
        badgeClass: 'badge-orange'
      },
      {
        key: 'tickets-progress',
        label: 'In Progress',
        value: inProgressCount,
        Icon: Clock,
        cardClass: 'card-departments',
        iconWrapClass: 'icon-wrap-purple',
        badge: 'Under Fix',
        badgeClass: 'badge-purple'
      },
      {
        key: 'tickets-resolved',
        label: 'Resolved & Closed',
        value: resolvedCount,
        Icon: CheckCircle2,
        cardClass: 'card-active',
        iconWrapClass: 'icon-wrap-green',
        badge: 'QA Verified',
        badgeClass: 'badge-green'
      }
    ];
  }, [isShowingFoldersGrid, projectFolders.length, folderSummaryStats, tickets, activeFolder]);

  const folderNameByKey = useMemo(() => {
    const map = new Map();
    projectFolders.forEach((f) => map.set(f.key, f));
    return map;
  }, [projectFolders]);

  const resolveTicketProjectName = (ticket) => {
    if (ticket.project_name) return ticket.project_name;
    if (ticket.project_id && folderNameByKey.has(`id-${ticket.project_id}`)) {
      return folderNameByKey.get(`id-${ticket.project_id}`).projectName;
    }
    if (ticket.project_code) {
      const byCode = folderNameByKey.get(`code-${String(ticket.project_code).trim().toLowerCase()}`);
      if (byCode) return byCode.projectName;
    }
    return activeFolder?.projectName || 'General';
  };

  return (
    <div className="admin-layout tickets-page">
      {/* Enhanced Defect Resolution & Inspection Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicketId)}
          ticketId={selectedTicketId}
          userRole={currentUserRole}
          onClose={() => {
            setSelectedTicketId(null);
            fetchData();
          }}
          onTicketUpdated={() => fetchData()}
          onTicketDeleted={(deletedId) => {
            setTickets((prev) => prev.filter((t) => t.id !== deletedId));
            setSelectedTicketId(null);
            fetchData();
          }}
        />
      )}

      {showLogoutModal && (
        <div
          id="tickets-logout-overlay"
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section id="tickets-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 id="tickets-logout-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
            <div className="modal-actions">
              <button
                id="tickets-logout-cancel-btn"
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay signed in
              </button>
              <button id="tickets-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      <main id="tickets-main-content" className="main-content">
        <TopNavbar
          pageTitle={isDeveloper ? 'Assigned Defects & Tickets' : isProjectLead ? 'Project Defect Tickets' : 'Defect Tickets'}
          breadcrumbs={activeFolder ? [{ label: 'Tickets', to: getRolePath('/tickets') }] : []}
        />
        <div className="dashboard-container">
          <div className="users-page-layout tickets-workspace-layout">
            {!activeFolder && (
              <header id="tickets-header-section" className="um-header-container">
                <div className="um-header-left">
                  <div className="um-header-icon-box">
                    <Ticket size={24} color="#2563EB" />
                  </div>
                  <div className="um-header-titles">
                    <h1 id="tickets-page-heading">
                      {isDeveloper
                        ? 'Assigned Defects & Project Tickets'
                        : isProjectLead
                        ? 'Project Defect Tickets'
                        : 'Tickets Workspace'}
                    </h1>
                    <p>
                      {isDeveloper
                        ? 'Investigate defects, apply code fixes, and submit resolution reports for QA signoff.'
                        : isProjectLead
                        ? 'Monitor project bug health, assign team tickets, and oversee resolution workflows.'
                        : 'Track, assign, prioritize, triage, and resolve QA issues and bug reports across project workspaces.'}
                    </p>
                  </div>
                </div>

                <div className="um-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div id="tickets-view-toggle" className="ticket-view-toggle" role="group" aria-label="Ticket workspace view">
                    <button
                      id="tickets-view-folders-btn"
                      type="button"
                      className={`ticket-view-toggle-btn ${viewMode === 'folders' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('folders');
                      }}
                    >
                      <LayoutGrid size={15} />
                      <span>Project Folders</span>
                    </button>
                    <button
                      id="tickets-view-all-btn"
                      type="button"
                      className={`ticket-view-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        handleCloseFolder();
                        setViewMode('all');
                      }}
                    >
                      <List size={15} />
                      <span>All Tickets</span>
                    </button>
                  </div>

                  {!isDeveloper && (
                    <button
                      id="tickets-raise-btn"
                      className="um-btn-create"
                      onClick={handleOpenRaiseModal}
                    >
                      <Plus size={18} />
                      <span>Raise Ticket</span>
                    </button>
                  )}
                </div>
              </header>
            )}

            {activeFolder && viewMode === 'folders' && (
              <header id="tickets-active-folder-banner" className="um-header-container ticket-active-folder-banner">
                <div className="ticket-active-folder-left">
                  <button
                    id="tickets-back-folders-btn"
                    type="button"
                    className="ticket-back-folders-btn"
                    onClick={handleCloseFolder}
                    title="Back to Project Folders"
                    aria-label="Back to Project Folders"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="ticket-active-folder-identity">
                    <div>
                      <div className="ticket-active-folder-title-row">
                        <h1 id="tickets-active-folder-heading" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {activeFolder.projectName}
                        </h1>
                        {activeFolder.status && (
                          <span className={`pj-status-badge ${(activeFolder.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                            {activeFolder.status}
                          </span>
                        )}
                      </div>
                      <p className="ticket-active-folder-meta">
                        {activeFolder.department ? `${activeFolder.department} • ` : ''}
                        {activeFolder.leadName ? `Lead: ${activeFolder.leadName} • ` : ''}
                        Showing {filteredTickets.length} of {activeFolder.tickets.length} ticket
                        {activeFolder.tickets.length === 1 ? '' : 's'} in this project folder
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="ticket-view-toggle-btn active"
                    onClick={handleCloseFolder}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <LayoutGrid size={15} />
                    <span>All Folders</span>
                  </button>

                  {!isDeveloper && (
                    <button
                      id="tickets-folder-raise-btn"
                      type="button"
                      className="um-btn-create"
                      onClick={handleOpenRaiseModal}
                    >
                      <Plus size={18} />
                      <span>Raise Ticket</span>
                    </button>
                  )}
                </div>
              </header>
            )}

            {/* 4 Summary Stat Cards matching User Module */}
            <section id="tickets-stats-grid" className="um-stats-grid">
              {overviewCards.map((card) => {
                const IconComponent = card.Icon;
                return (
                  <div id={`tm-stat-${card.key}-card`} key={card.key} className={`um-stat-card ${card.cardClass}`}>
                    <div className="um-stat-left">
                      <div className={`um-stat-icon-wrap ${card.iconWrapClass}`}>
                        <IconComponent size={22} />
                      </div>
                      <div className="um-stat-info">
                        <span className="um-stat-label">{card.label}</span>
                        <span className="um-stat-number">{card.value}</span>
                      </div>
                    </div>
                    <span className={`um-stat-badge ${card.badgeClass}`}>{card.badge}</span>
                  </div>
                );
              })}
            </section>

            {/* Filter and Search Bar matching User Module Controls */}
            <div className="um-controls-bar">
              <div className="um-search-container">
                <Search size={16} color="#64748b" />
                <input
                  id="tickets-search-input"
                  type="text"
                  autoComplete="off"
                  maxLength={INPUT_LIMITS.SEARCH}
                  placeholder={
                    isShowingFoldersGrid
                      ? 'Search project folder, lead, department, or ticket...'
                      : 'Search ticket code, title, assignee, module...'
                  }
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
                {!isShowingFoldersGrid ? (
                  <>
                    <CustomSelect
                      id="tickets-status-filter"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={TICKET_STATUS_OPTIONS}
                      variant="filter"
                      placeholder="All Statuses"
                    />

                    <CustomSelect
                      id="tickets-priority-filter"
                      value={priorityFilter}
                      onChange={setPriorityFilter}
                      options={TICKET_PRIORITY_OPTIONS}
                      variant="filter"
                      placeholder="All Severities"
                    />

                    <CustomSelect
                      id="tickets-type-filter"
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={TICKET_TYPE_OPTIONS}
                      variant="filter"
                      placeholder="All Types"
                    />
                  </>
                ) : (
                  <div
                    className="ticket-folders-count-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#1d4ed8'
                    }}
                  >
                    <Folder size={14} color="#2563eb" />
                    <span>{visibleFolders.length} Active {visibleFolders.length === 1 ? 'Workspace Folder' : 'Workspace Folders'}</span>
                  </div>
                )}
              </div>
            </div>

            {isShowingFoldersGrid ? (
              <div className="ticket-folders-section">
                <div className="ticket-folders-section-header">
                  <div className="ticket-folders-section-title">
                    <Folder size={18} color="#2563eb" />
                    <span>Project Folders</span>
                    <span className="ticket-folders-total-pill">
                      {visibleFolders.length} Folder{visibleFolders.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {loading ? (
                  <SkeletonLoader variant="cards" count={4} />
                ) : visibleFolders.length === 0 ? (
                  <div className="um-empty-state-card">
                    <div className="um-empty-icon-wrap">
                      <FolderOpen size={32} />
                    </div>
                    <h3 id="tickets-empty-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                      {projectFolders.length === 0 ? 'No Project Ticket Folders Yet' : 'No Project Folders Found'}
                    </h3>
                    <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {projectFolders.length === 0
                        ? 'Your defect workspace is clean and organized. Create projects or raise defect tickets to automatically generate dedicated workspace folders.'
                        : "We couldn't find any project folders matching your search. Try searching for a different project name, lead, or ticket code."}
                    </p>
                    {projectFolders.length === 0 ? (
                      !isDeveloper && (
                        <button
                          id="tickets-empty-raise-btn"
                          className="um-btn-create"
                          onClick={handleOpenRaiseModal}
                          style={{ marginTop: 8 }}
                        >
                          <Plus size={16} />
                          <span>Raise First Ticket</span>
                        </button>
                      )
                    ) : (
                      <button
                        id="tickets-empty-clear-btn"
                        type="button"
                        className="um-btn-create"
                        style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none', marginTop: 8 }}
                        onClick={() => setSearchQuery('')}
                      >
                        <X size={15} />
                        <span>Clear Search</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="ticket-folders-grid">
                    {visibleFolders.map((folder) => {
                      const folderTickets = folder.tickets;
                      const priorityCounts = getFolderPriorityCounts(folderTickets);

                      return (
                        <div
                          id={`tickets-folder-card-${folder.key}`}
                          key={folder.key}
                          className={`ticket-folder-card folder-accent-${folder.folderColor || 'blue'}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenFolder(folder)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenFolder(folder);
                            }
                          }}
                          aria-label={`Open project folder ${folder.projectName} (${folderTickets.length} tickets)`}
                        >
                          <div className="ticket-folder-tab" aria-hidden="true" />

                          <div className="ticket-folder-body">
                            <div className="ticket-folder-top">
                              <FolderEmblem label={folder.projectName} />
                              <span
                                className={`ticket-folder-count-pill ${
                                  folderTickets.length === 0 ? 'empty' : ''
                                }`}
                              >
                                <Ticket size={13} />
                                <span>
                                  {folderTickets.length} Ticket{folderTickets.length === 1 ? '' : 's'}
                                </span>
                              </span>
                            </div>

                            <h3 id={`tickets-folder-name-${folder.key}`} className="ticket-folder-name" title={folder.projectName}>
                              {folder.projectName}
                            </h3>
                            <p className="ticket-folder-sub">
                              {folder.department || 'Project Workspace'}
                              {folder.leadName ? ` • Lead: ${folder.leadName}` : ''}
                            </p>

                            <div className="ticket-folder-status-strip" aria-label="Ticket status counts by priority">
                              {FOLDER_PRIORITY_LEVELS.map((level) => {
                                const count = priorityCounts[level.key];
                                return (
                                  <span
                                    key={level.key}
                                    className={`folder-stat-chip ${level.key}${count === 0 ? ' is-zero' : ''}`}
                                  >
                                    <span className="folder-stat-dot" aria-hidden="true" />
                                    <span className="folder-stat-label">{level.label}</span>
                                    <strong className="folder-stat-value">{count}</strong>
                                  </span>
                                );
                              })}
                            </div>

                            <div className="ticket-folder-footer">
                              <span className="ticket-folder-open-cta">
                                <span>Open Folder</span>
                                <ChevronRight size={15} />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <section id="tickets-table-section" className="um-table-card">
                <div className="um-table-scroll">
                  <table id="tickets-table" className="um-table users-table">
                    <thead>
                      <tr>
                        <th>Ticket Code</th>
                        <th>Title & Description</th>
                        <th>Project</th>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Assigned To</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '12px' }}>
                            <SkeletonLoader variant="table" rows={5} />
                          </td>
                        </tr>
                      ) : filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan="7">
                            <div className="um-empty-state-card" style={{ border: 'none', boxShadow: 'none', margin: '20px 0' }}>
                              <div className="um-empty-icon-wrap">
                                <Ticket size={32} />
                              </div>
                              <h3 id="tickets-table-empty-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                                {tickets.length === 0 ? 'No Defect Tickets Yet' : 'No Tickets Found'}
                              </h3>
                              <p className="um-empty-description" style={{ maxWidth: 520, margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                {tickets.length === 0
                                  ? 'No defect issues have been reported. Raise a new ticket to track bugs, features, and QA issues.'
                                  : activeFolder
                                  ? `No tickets found inside "${activeFolder.projectName}" matching your search or filters.`
                                  : 'No tickets found matching your search or active filters. Try adjusting your search query or resetting filters.'}
                              </p>
                              {tickets.length === 0 ? (
                                !isDeveloper && (
                                  <button
                                    id="tickets-empty-table-raise-btn"
                                    className="um-btn-create"
                                    onClick={handleOpenRaiseModal}
                                    style={{ marginTop: 8 }}
                                  >
                                    <Plus size={16} />
                                    <span>Raise Ticket</span>
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  className="um-btn-create"
                                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', boxShadow: 'none', marginTop: 8 }}
                                  onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('All');
                                    setPriorityFilter('All');
                                    setTypeFilter('All');
                                  }}
                                >
                                  <X size={15} />
                                  <span>Reset All Filters</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                      filteredTickets.map((t) => (
                        <tr
                          id={`tickets-row-${t.id}`}
                          key={t.id}
                          className="ticket-table-row"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedTicketId(t.id);
                            }
                          }}
                          tabIndex={0}
                          aria-label={`View ticket ${t.ticket_code}: ${t.title}`}
                        >
                          <td>
                            <span className="project-code-badge">{t.ticket_code}</span>
                          </td>
                          <td>
                            <div className="ticket-title-cell">
                              <span className="ticket-title-text">{t.title}</span>
                              {t.description && (
                                <span className="ticket-desc-sub" title={t.description}>
                                  {t.description}
                                </span>
                              )}
                              {(t.attachments || []).length > 0 && (
                                <span className="ticket-attachment-summary">
                                  <Upload size={12} /> {t.attachments.length} attachment{t.attachments.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="ticket-project-cell">
                              <span className="ticket-project-name">{resolveTicketProjectName(t)}</span>
                              <span className="user-dept-badge">{t.project_code}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`ticket-type-badge ${TICKET_TYPE_CLASS_MAP[t.type] || 'type-task'}`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const severityLevel = resolveTicketLevel(t);
                              const severityLabel =
                                SEVERITY_LABEL_MAP[severityLevel] || t.severity || t.priority || 'Medium';
                              return (
                                <span className={`priority-badge priority-${severityLevel}`}>
                                  {severityLabel}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ fontWeight: 500, color: '#334155' }}>
                            {t.assigned_to || 'Unassigned'}
                          </td>
                          <td>
                            <button
                              id={`tickets-view-btn-${t.id}`}
                              type="button"
                              className="ticket-view-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTicketId(t.id);
                              }}
                              aria-label={`View details for ${t.ticket_code}`}
                            >
                              <Eye size={15} />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>

      {isModalOpen && (
        <div
          id="raise-ticket-modal-overlay"
          className="ticket-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div id="raise-ticket-modal-card" className="ticket-modal-card" role="dialog" aria-modal="true" aria-labelledby="raise-ticket-title">
            <div className="modal-header-user">
              <div className="ticket-modal-heading">
                <span className="ticket-modal-heading-icon"><Ticket size={18} /></span>
                <div>
                  <h3 id="raise-ticket-title">Raise a ticket</h3>
                  <p>Share the issue details and we’ll add it to your queue.</p>
                </div>
              </div>
              <button
                id="raise-ticket-modal-close-btn"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form id="raise-ticket-form" onSubmit={handleCreateTicket}>
              <div className="modal-body-user">
                {formError && <div className="user-error-banner">{formError}</div>}

                <div className="ticket-form-meta">
                  <div className="ticket-code-pill">
                    <FileText size={14} /> Auto-generated ticket ID
                  </div>
                  <span className="ticket-form-note">The system will generate the Ticket ID automatically when saved.</span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label htmlFor="raise-ticket-type">Issue Type</label>
                    <CustomSelect
                      id="raise-ticket-type"
                      value={formData.type}
                      onChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                      options={MODAL_TYPE_OPTIONS}
                      variant="form"
                    />
                  </div>

                  <div className="form-group-user">
                    <label htmlFor="raise-ticket-priority">Severity</label>
                    <CustomSelect
                      id="raise-ticket-priority"
                      value={formData.priority}
                      onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                      options={MODAL_PRIORITY_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label htmlFor="raise-ticket-title-input">Title *</label>
                  <input
                    id="raise-ticket-title-input"
                    type="text"
                    name="title"
                    autoComplete="off"
                    maxLength={INPUT_LIMITS.TITLE}
                    placeholder="Short summary of the issue or requirement"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label htmlFor="raise-ticket-description">Description</label>
                  <textarea
                    id="raise-ticket-description"
                    name="description"
                    maxLength={INPUT_LIMITS.DESCRIPTION}
                    placeholder="Steps to reproduce, expected vs actual behavior..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label htmlFor="raise-ticket-project">Related Project</label>
                    <CustomSelect
                      id="raise-ticket-project"
                      value={formData.project_code}
                      onChange={(val) => setFormData((prev) => ({ ...prev, project_code: val }))}
                      options={projectOptions}
                      variant="form"
                    />
                  </div>

                  <div className="form-group-user">
                    <label htmlFor="raise-ticket-assignee">Assign To</label>
                    <CustomSelect
                      id="raise-ticket-assignee"
                      value={formData.assigned_to}
                      onChange={(val) => setFormData((prev) => ({ ...prev, assigned_to: val }))}
                      options={userOptions}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label htmlFor="raise-ticket-attachments">Attachments (Image or Video)</label>
                  <label className="ticket-upload-box" htmlFor="raise-ticket-attachments">
                    <Upload size={16} />
                    <span>{uploadingAttachments ? 'Uploading media...' : 'Upload image or video (PNG, JPG, WEBP, MP4, WEBM, MOV)'}</span>
                    <input
                      id="raise-ticket-attachments"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploadingAttachments}
                      onChange={handleAttachmentChange}
                    />
                  </label>

                  {(formData.attachments || []).length > 0 && (
                    <div className="ticket-upload-preview-grid">
                      {(formData.attachments || []).map((attachment, index) => {
                        const media = normalizeMediaItem(attachment, index, 'Attachment');
                        const isVideo = media.mediaType === 'video';
                        return (
                          <div className="ticket-upload-preview-card" key={`${media.name}-${index}`}>
                            <div
                              className="ticket-upload-preview-media-wrap"
                              onClick={() => setPreviewAttachment(media)}
                              title={isVideo ? 'Click to preview video' : 'Click to preview image'}
                            >
                              {isVideo ? (
                                <>
                                  <video
                                    src={media.url}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="ticket-upload-preview-media"
                                  />
                                  <span className="ticket-upload-type-badge">VIDEO</span>
                                </>
                              ) : (
                                <img
                                  src={media.url}
                                  alt={media.name}
                                  className="ticket-upload-preview-media"
                                />
                              )}
                              <div className="ticket-upload-preview-overlay">
                                {isVideo ? <Play size={16} /> : <Maximize2 size={15} />}
                                <span>Preview</span>
                              </div>
                            </div>
                            <div className="ticket-upload-preview-footer">
                              <span className="ticket-upload-preview-name" title={media.name}>
                                {isVideo ? <Video size={12} /> : <ImageIcon size={12} />}
                                <span>{media.name}</span>
                              </span>
                              <div className="ticket-upload-preview-actions">
                                <button
                                  id={`raise-ticket-preview-att-${index}`}
                                  type="button"
                                  className="ticket-upload-icon-btn"
                                  onClick={() => setPreviewAttachment(media)}
                                  title={isVideo ? 'Preview video' : 'Preview image'}
                                >
                                  {isVideo ? <Play size={12} /> : <Eye size={12} />}
                                </button>
                                <button
                                  id={`raise-ticket-remove-att-${index}`}
                                  type="button"
                                  className="ticket-upload-icon-btn danger"
                                  aria-label={`Remove ${media.name}`}
                                  onClick={() => removeAttachment(index)}
                                  title="Remove attachment"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-user">
                <button
                  id="raise-ticket-cancel-btn"
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="raise-ticket-submit-btn"
                  type="submit"
                  className="btn-primary-action"
                  disabled={submitting || uploadingAttachments}
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewAttachment && (
        <div
          id="raise-ticket-media-lightbox"
          className="ticket-media-lightbox"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="ticket-media-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-media-lightbox-header">
              <span title={previewAttachment.name}>{previewAttachment.name}</span>
              <button
                id="raise-ticket-media-lightbox-close"
                type="button"
                className="ticket-media-lightbox-close"
                onClick={() => setPreviewAttachment(null)}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ticket-media-lightbox-body">
              {previewAttachment.mediaType === 'video' ? (
                <video
                  key={previewAttachment.url}
                  src={previewAttachment.url}
                  controls
                  autoPlay
                  playsInline
                  className="ticket-media-lightbox-content"
                />
              ) : (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="ticket-media-lightbox-content"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTickets;
