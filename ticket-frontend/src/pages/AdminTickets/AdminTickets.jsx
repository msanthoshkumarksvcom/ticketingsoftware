import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  List,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Upload,
  Video,
  X
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import FolderEmblem from '../AdminProjects/FolderEmblem';
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
  { value: 'All', label: 'All Priorities' },
  { value: 'Critical', label: 'Critical' },
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

const TICKET_STATUS_CLASS_MAP = {
  Open: 'ticket-status-open',
  'In Progress': 'ticket-status-in-progress',
  Resolved: 'ticket-status-resolved',
  Reopened: 'ticket-status-reopened',
  Closed: 'ticket-status-closed'
};

const TICKET_TYPE_CLASS_MAP = {
  Bug: 'type-bug',
  Incident: 'type-incident',
  Feature: 'type-feature',
  Recommendation: 'type-feature',
  Task: 'type-task'
};

const TICKET_PRIORITY_CLASS_MAP = {
  Critical: 'priority-critical',
  High: 'priority-high',
  Medium: 'priority-medium',
  Low: 'priority-low'
};

function matchesTicketAttributes(ticket, { statusFilter, priorityFilter, typeFilter }) {
  const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
  const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;
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
  const [formError, setFormError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const currentUserRole = localStorage.getItem('userRole') || 'Administrator';
  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';
  const [userEmail] = useState(() => localStorage.getItem('userEmail') || '');

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    setLoading(true);
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
      console.error('Failed to load tickets:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const readers = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              url: reader.result,
              mediaType: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file'
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    try {
      const uploadedFiles = await Promise.all(readers);
      setFormData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedFiles]
      }));
      event.target.value = '';
    } catch (error) {
      console.error('Error attaching files:', error);
      setFormError('One or more files could not be attached. Please try again.');
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

    if (!formData.title.trim()) {
      setFormError('Please enter the Ticket Title.');
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

    return [
      { label: 'Total Folders', value: projectFolders.length, tone: 'total' },
      { label: 'In Progress Folders', value: inProgressFolders, tone: 'progress' },
      { label: 'Resolved Folders', value: resolvedFolders, tone: 'resolved' }
    ];
  }, [projectFolders]);

  const filteredTickets = useMemo(() => {
    const sourceTickets = activeFolder ? activeFolder.tickets : tickets;
    const filterOpts = { statusFilter, priorityFilter, typeFilter };
    return sourceTickets.filter(
      (t) => matchesTicketAttributes(t, filterOpts) && matchesTicketQuery(t, query)
    );
  }, [activeFolder, tickets, query, statusFilter, priorityFilter, typeFilter]);

  const statsSource = activeFolder ? activeFolder.tickets : tickets;
  const overviewStats = isShowingFoldersGrid
    ? folderSummaryStats
    : [
        { label: activeFolder ? 'Folder Tickets' : 'Total Tickets', value: statsSource.length, tone: 'total' },
        { label: 'Open', value: statsSource.filter((ticket) => ticket.status === 'Open').length, tone: 'open' },
        { label: 'In Progress', value: statsSource.filter((ticket) => ticket.status === 'In Progress').length, tone: 'progress' },
        { label: 'Resolved', value: statsSource.filter((ticket) => ticket.status === 'Resolved').length, tone: 'resolved' }
      ];

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

  const displayName = userEmail ? userEmail.split('@')[0] : 'Administrator';
  const avatarLabel = displayName.charAt(0).toUpperCase();

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
        />
      )}

      {showLogoutModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account.</p>
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

      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />

      <main className="main-content">
        <div className="tickets-top-utility-bar">
          <div className="header-right">
            <button
              className="notification-bell"
              onClick={fetchData}
              title="Refresh tickets"
              aria-label="Refresh tickets list"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="profile-divider" />
            <div className="user-profile">
              <div className="avatar">{avatarLabel}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{localStorage.getItem('userRole') || 'Administrator'}</span>
              </div>
              <ChevronDown size={15} className="profile-chevron" />
            </div>
          </div>
        </div>

        <div className="dashboard-container">
          <div className="projects-layout">
            {!activeFolder && (
              <div className="projects-header-row">
                <div className="projects-header-info">
                  <h2>{isDeveloper ? 'Assigned Defects & Project Tickets' : isProjectLead ? 'Project Defect Tickets' : 'Tickets Workspace'}</h2>
                  {!isShowingFoldersGrid && (
                    <p>
                      {isDeveloper
                        ? 'Investigate defects, apply code fixes, and submit resolution reports for QA signoff.'
                        : 'Track, assign, prioritize, and resolve QA issues and bug reports.'}
                    </p>
                  )}
                </div>
                <div className="users-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="ticket-view-toggle" role="group" aria-label="Ticket workspace view">
                    <button
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
                      className="btn-primary-action"
                      onClick={handleOpenRaiseModal}
                    >
                      <Plus size={18} />
                      <span>Raise Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeFolder && viewMode === 'folders' && (
              <div className="ticket-active-folder-banner">
                <div className="ticket-active-folder-left">
                  <button
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
                        <h3>{activeFolder.projectName}</h3>
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

                {!isDeveloper && (
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={handleOpenRaiseModal}
                  >
                    <Plus size={18} />
                    <span>Raise Ticket</span>
                  </button>
                )}
              </div>
            )}

            <div className={`tickets-overview ${isShowingFoldersGrid ? 'folders-overview' : ''}`}>
              {overviewStats.map((card) => (
                <div key={card.label} className={`overview-card ${card.tone}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>

            <div className="users-filter-bar">
              <div className="users-search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder={
                    isShowingFoldersGrid
                      ? 'Search project folder, lead, department, or ticket...'
                      : 'Search ticket code, title, assignee, module...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {!isShowingFoldersGrid && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={TICKET_STATUS_OPTIONS}
                    variant="filter"
                    placeholder="All Statuses"
                  />

                  <CustomSelect
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    options={TICKET_PRIORITY_OPTIONS}
                    variant="filter"
                    placeholder="All Priorities"
                  />

                  <CustomSelect
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={TICKET_TYPE_OPTIONS}
                    variant="filter"
                    placeholder="All Types"
                  />
                </div>
              )}
            </div>

            {isShowingFoldersGrid ? (
              <div className="ticket-folders-section">
                <div className="ticket-folders-section-header">
                  <div className="ticket-folders-section-title">
                    <Folder size={17} color="#2563eb" />
                    <span>Project Folders</span>
                    <span className="ticket-folders-total-pill">
                      {visibleFolders.length} Folder{visibleFolders.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="users-table-card" style={{ textAlign: 'center', padding: '44px' }}>
                    Loading project ticket folders...
                  </div>
                ) : visibleFolders.length === 0 ? (
                  <div className="users-table-card">
                    <div className="user-empty-state">
                      <FolderOpen size={42} style={{ opacity: 0.35, marginBottom: '10px' }} />
                      <p>
                        {query
                          ? 'No project folders match your search.'
                          : 'No project ticket folders found yet.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="ticket-folders-grid">
                    {visibleFolders.map((folder) => {
                      const folderTickets = folder.tickets;

                      return (
                        <div
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

                            <h3 className="ticket-folder-name" title={folder.projectName}>
                              {folder.projectName}
                            </h3>
                            <p className="ticket-folder-sub">
                              {folder.department || 'Project Workspace'}
                              {folder.leadName ? ` • Lead: ${folder.leadName}` : ''}
                            </p>

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
              <div className="users-table-card">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Ticket Code</th>
                      <th>Title & Description</th>
                      <th>Project</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                          Loading tickets...
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="user-empty-state">
                            <Ticket size={40} style={{ opacity: 0.35, marginBottom: '10px' }} />
                            <p>
                              {activeFolder
                                ? `No tickets found inside ${activeFolder.projectName} matching your filters.`
                                : 'No tickets found matching your search or filters.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((t) => (
                        <tr
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
                            <span
                              className={`priority-badge ${TICKET_PRIORITY_CLASS_MAP[t.priority] || 'priority-medium'}`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-tag ${TICKET_STATUS_CLASS_MAP[t.status] || 'ticket-status-closed'}`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, color: '#334155' }}>
                            {t.assigned_to || 'Unassigned'}
                          </td>
                          <td>
                            <button
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
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div
          className="ticket-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="ticket-modal-card" role="dialog" aria-modal="true" aria-labelledby="raise-ticket-title">
            <div className="modal-header-user">
              <div className="ticket-modal-heading">
                <span className="ticket-modal-heading-icon"><Ticket size={18} /></span>
                <div>
                  <h3 id="raise-ticket-title">Raise a ticket</h3>
                  <p>Share the issue details and we’ll add it to your queue.</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
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
                    <label>Issue Type</label>
                    <CustomSelect
                      value={formData.type}
                      onChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                      options={MODAL_TYPE_OPTIONS}
                      variant="form"
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Priority</label>
                    <CustomSelect
                      value={formData.priority}
                      onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                      options={MODAL_PRIORITY_OPTIONS}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label>Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Short summary of the issue or requirement"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group-user">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Steps to reproduce, expected vs actual behavior..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group-user">
                    <label>Related Project</label>
                    <CustomSelect
                      value={formData.project_code}
                      onChange={(val) => setFormData((prev) => ({ ...prev, project_code: val }))}
                      options={projectOptions}
                      variant="form"
                    />
                  </div>

                  <div className="form-group-user">
                    <label>Assign To</label>
                    <CustomSelect
                      value={formData.assigned_to}
                      onChange={(val) => setFormData((prev) => ({ ...prev, assigned_to: val }))}
                      options={userOptions}
                      variant="form"
                    />
                  </div>
                </div>

                <div className="form-group-user">
                  <label>Attachments</label>
                  <label className="ticket-upload-box">
                    <Upload size={16} />
                    <span>Upload image or video</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleAttachmentChange} />
                  </label>

                  {(formData.attachments || []).length > 0 && (
                    <div className="attachment-list">
                      {(formData.attachments || []).map((attachment, index) => (
                        <div className="attachment-chip" key={`${attachment.name}-${index}`}>
                          {attachment.mediaType === 'image' ? <ImageIcon size={14} /> : attachment.mediaType === 'video' ? <Video size={14} /> : <FileText size={14} />}
                          <span>{attachment.name}</span>
                          <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(index)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-user">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTickets;
