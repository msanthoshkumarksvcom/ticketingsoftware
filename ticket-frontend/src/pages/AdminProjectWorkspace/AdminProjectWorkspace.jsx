import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../utils/apiConfig';
import { INPUT_LIMITS, validateFields, validateMeaningfulText } from '../../utils/inputValidation';
import {
  ArrowLeft,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Folder,
  LogOut,
  Ticket,
  Users,
  ExternalLink,
  UserCheck,
  UserPlus,
  ShieldCheck,
  History,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Check,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Globe,
  GitBranch,
  Save,
  Send
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import { formatIndianDate } from '../../utils/dateFormat';

const TESTING_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TopNavbar from '../../components/TopNavbar/TopNavbar';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import './AdminProjectWorkspace.css';

const WORKSPACE_FOLDERS = [
  { id: 'sheet', label: 'Sheet', detail: 'Project test sheets', icon: FileSpreadsheet },
  { id: 'tickets', label: 'Tickets', detail: 'Issues for this project', icon: Ticket },
  { id: 'members', label: 'Project Members', detail: 'Lead, Developers & QA', icon: Users },
  { id: 'documents', label: 'Documents', detail: 'Project document record', icon: FileText },
  { id: 'testing-request', label: 'Testing Request', detail: 'Start testing approval', icon: Send, restrictedToLeadAndManager: true },
  { id: 'details', label: 'Details', detail: 'Project information', icon: Folder }
];

const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'ppt', 'pptx', 'apk'];
const ALLOWED_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export default function AdminProjectWorkspace() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(location.state?.project || null);
  const [loading, setLoading] = useState(!location.state?.project);
  const [tickets, setTickets] = useState([]);
  const [activeFolder, setActiveFolder] = useState('details');
  const [ticketsUnavailable, setTicketsUnavailable] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // User info & Role
  const currentUserRole = localStorage.getItem('userRole') || 'Manager';

  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';
  const isQAMember = currentUserRole === 'QA Member';
  const isQALead = currentUserRole === 'QA Lead';
  const isManager = currentUserRole === 'Manager' || currentUserRole === 'Super Admin' || currentUserRole === 'Admin';

  // Access rules: Manager, QA Lead, Super Admin, Admin can assign Project Leads (NOT Project Lead)
  const canAssignProjectLead = !isProjectLead && !isQAMember && !isDeveloper && ['Manager', 'QA Lead', 'Super Admin', 'Admin'].includes(currentUserRole);
  // Manager, QA Lead, Project Lead (plus Super Admin, Admin) can assign Team Members
  const canAssignTeamMembers = ['Manager', 'QA Lead', 'Project Lead', 'Super Admin', 'Admin'].includes(currentUserRole);
  // Everyone EXCEPT QA Members can upload documents and edit Application URL / GitHub Link (when not locked)
  // Developers CAN edit and upload when unlocked; when locked by Manager or QA Lead, they cannot edit/update
  const canEditDocsAndLinks = !isQAMember;
  // Manager, QA Lead, and Project Lead can lock/unlock files & link fields and access Testing Request page
  const canLockContent = isManager || isProjectLead || isQALead;
  const canManageTestingRequest = isManager || isProjectLead;

  // Assignment History is restricted to Manager and QA Lead only (hidden in all other sections)
  const canViewAssignmentHistory = isManager || isQALead;

  const visibleWorkspaceFolders = useMemo(
    () =>
      WORKSPACE_FOLDERS.filter((folder) => {
        if (isDeveloper) {
          return ['sheet', 'documents', 'details'].includes(folder.id);
        }
        return !folder.restrictedToLeadAndManager || canManageTestingRequest;
      }),
    [canManageTestingRequest, isDeveloper]
  );

  const activeProject = project || {
    id: projectId,
    project_code: `PRJ-${projectId}`,
    name: 'QA Project Workspace',
    lead_name: 'Unassigned',
    department: 'Website',
    status: 'In Progress',
    team_members: 0
  };

  // Lead Assignment State
  const [leadHistory, setLeadHistory] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadAssignNotes, setLeadAssignNotes] = useState('');
  const [leadAssignLoading, setLeadAssignLoading] = useState(false);
  const [leadAssignMsg, setLeadAssignMsg] = useState({ text: '', type: '' });
  const [showLeadHistory, setShowLeadHistory] = useState(false);

  // Developer Assignment State
  const [assignedDevs, setAssignedDevs] = useState([]);
  const [availableDevs, setAvailableDevs] = useState([]);
  const [devHistory, setDevHistory] = useState([]);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [selectedDevIds, setSelectedDevIds] = useState([]);
  const [devAssignNotes, setDevAssignNotes] = useState('');
  const [devAssignLoading, setDevAssignLoading] = useState(false);
  const [devAssignMsg, setDevAssignMsg] = useState({ text: '', type: '' });
  const [showDevHistory, setShowDevHistory] = useState(false);

  // Filter team members assignable: for Project Lead, show only Developers
  const assignableTeamMembers = useMemo(() => {
    if (isProjectLead) {
      return availableDevs.filter((dev) => dev.role === 'Developer');
    }
    return availableDevs;
  }, [availableDevs, isProjectLead]);

  // Documents & Application Links State
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [applicationUrl, setApplicationUrl] = useState('');
  const [applicationGithubLink, setApplicationGithubLink] = useState('');
  const [linksMeta, setLinksMeta] = useState({
    application_url: '',
    application_github_link: '',
    links_locked: false,
    links_locked_by: null,
    links_locked_at: null,
    documents_locked: false,
    documents_locked_by: null,
    documents_locked_at: null
  });
  const [linksSaving, setLinksSaving] = useState(false);
  const [lockUpdating, setLockUpdating] = useState('');
  const [docLockUpdatingId, setDocLockUpdatingId] = useState(null);

  // Testing Request State (Project Lead & Manager only)
  const [testingRequests, setTestingRequests] = useState([]);
  const [testingRequestsLoading, setTestingRequestsLoading] = useState(false);
  const [testingPriority, setTestingPriority] = useState('High');
  const [testingNotes, setTestingNotes] = useState('');
  const [testingSubmitting, setTestingSubmitting] = useState(false);
  const [testingMsg, setTestingMsg] = useState({ text: '', type: '' });

  const [docDownloadingId, setDocDownloadingId] = useState(null);

  const isImage = (filename = '') => /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
  const isPdf = (filename = '') => /\.pdf$/i.test(filename);

  const isDocumentEmpty = (doc) => {
    if (!doc) return true;
    if (doc.is_empty) return true;
    if (typeof doc.file_url === 'string' && doc.file_url.startsWith('data:')) {
      const commaIdx = doc.file_url.indexOf(',');
      if (commaIdx === -1 || !doc.file_url.slice(commaIdx + 1).trim()) return true;
    }
    return !doc.file_url;
  };

  const closePreviewModal = () => {
    if (previewDoc?.blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewDoc.blobUrl);
    }
    setPreviewDoc(null);
  };

  const fetchDocumentBlobUrl = async (doc, { inline = false } = {}) => {
    if (isDocumentEmpty(doc)) {
      throw new Error(`Document "${doc.name}" is empty (0 bytes) because an empty file was uploaded. Please delete it and upload a non-empty file.`);
    }

    const fileUrl = doc.file_url || '';
    if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !fileUrl.startsWith(`${API_BASE}/uploads/`) && !fileUrl.startsWith('http://localhost:5000/uploads/')) {
      return { url: fileUrl, isBlob: false };
    }

    const token = localStorage.getItem('token');
    const endpoint = `${API_BASE}/api/admin/projects/${projectId}/documents/${doc.id}/download${inline ? '?inline=1' : ''}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (!response.ok) {
      let errMsg = 'Failed to download document.';
      try {
        const errBody = await response.json();
        if (errBody?.error) errMsg = errBody.error;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errMsg);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error(`Document "${doc.name}" is empty (0 bytes). Please delete it and re-upload a valid file.`);
    }

    return { url: URL.createObjectURL(blob), isBlob: true };
  };

  const handleViewDocument = async (doc) => {
    setDocError('');
    try {
      if (previewDoc?.blobUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.blobUrl);
      }
      const { url } = await fetchDocumentBlobUrl(doc, { inline: true });
      setPreviewDoc({ ...doc, blobUrl: url });
    } catch (err) {
      setDocError(err.message || 'Failed to preview document.');
    }
  };

  const handleDownloadDocument = async (doc) => {
    setDocError('');
    setDocDownloadingId(doc.id);
    try {
      const { url, isBlob } = await fetchDocumentBlobUrl(doc, { inline: false });
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (isBlob) {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      setDocError(err.message || 'Failed to download document.');
    } finally {
      setDocDownloadingId(null);
    }
  };

  // Ticket Preview Modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Restricted Access Warning Modal for Developer
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);

  const fetchProjectData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const matching = data.find((item) => String(item.id) === String(projectId) || item.project_code === projectId);
      if (matching) {
        setProject(matching);
      }
    } catch (err) {
      console.warn('Could not refresh project:', err.message);
    }
  };

  const fetchLeadsAndHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [leadsRes, histRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/project-leads', { headers: { Authorization: `Bearer ${token}` } }),
        canViewAssignmentHistory
          ? axios.get(`http://localhost:5000/api/admin/projects/${projectId}/lead-history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);
      const rawLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
      const filteredLeads = rawLeads.filter((u) => {
        const r = (u.role || '').toLowerCase();
        return r !== 'qa member' && r !== 'manager' && !r.includes('admin');
      });
      setAvailableLeads(filteredLeads);
      setLeadHistory(Array.isArray(histRes.data) ? histRes.data : []);
    } catch (err) {
      console.warn('Failed to load lead data:', err.message);
    }
  };

  const fetchDevsAndHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [assignedRes, availRes, histRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/admin/projects/${projectId}/developers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/admin/developers', { headers: { Authorization: `Bearer ${token}` } }),
        canViewAssignmentHistory
          ? axios.get(`http://localhost:5000/api/admin/projects/${projectId}/developer-history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] })
      ]);
      setAssignedDevs(Array.isArray(assignedRes.data) ? assignedRes.data : []);
      setAvailableDevs(Array.isArray(availRes.data) ? availRes.data : []);
      setDevHistory(Array.isArray(histRes.data) ? histRes.data : []);
    } catch (err) {
      console.warn('Failed to load dev data:', err.message);
    }
  };

  const fetchTickets = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get('http://localhost:5000/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(data.filter((ticket) => ticket.project_code === project?.project_code || String(ticket.project_id) === String(projectId)));
    } catch (err) {
      setTicketsUnavailable(true);
    }
  };

  const fetchDocuments = async () => {
    const token = localStorage.getItem('token');
    if (!token || !projectId) return;
    setDocumentsLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/admin/projects/${projectId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load project documents:', err.message);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchProjectLinks = async () => {
    const token = localStorage.getItem('token');
    if (!token || !projectId) return;
    try {
      const { data } = await axios.get(`http://localhost:5000/api/admin/projects/${projectId}/links`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLinksMeta({
        application_url: data.application_url || '',
        application_github_link: data.application_github_link || '',
        links_locked: Boolean(data.links_locked),
        links_locked_by: data.links_locked_by || null,
        links_locked_at: data.links_locked_at || null,
        documents_locked: Boolean(data.documents_locked),
        documents_locked_by: data.documents_locked_by || null,
        documents_locked_at: data.documents_locked_at || null
      });
      setApplicationUrl(data.application_url || '');
      setApplicationGithubLink(data.application_github_link || '');
    } catch (err) {
      console.warn('Could not load project links:', err.message);
    }
  };

  const fetchTestingRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token || !projectId || !canManageTestingRequest) return;
    setTestingRequestsLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/admin/projects/${projectId}/testing-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load testing requests:', err.message);
    } finally {
      setTestingRequestsLoading(false);
    }
  };

  const handleSaveLinks = async (e) => {
    if (e) e.preventDefault();
    if (!canEditDocsAndLinks) {
      setDocError('Access Denied: QA Members have read-only access to project links.');
      return;
    }
    if (linksMeta.links_locked) {
      setDocError('Application fields are locked (read-only). Unlock them first to make edits.');
      return;
    }

    const linkErr = validateFields([
      { value: applicationUrl, options: { label: 'Application URL', required: false, isUrl: true, maxLength: INPUT_LIMITS.URL } },
      { value: applicationGithubLink, options: { label: 'Application GitHub Link', required: false, isUrl: true, maxLength: INPUT_LIMITS.URL } }
    ]);
    if (linkErr) {
      setDocError(linkErr);
      return;
    }

    const token = localStorage.getItem('token');
    setLinksSaving(true);
    setDocError('');
    setDocSuccess('');
    try {
      const { data } = await axios.put(
        `http://localhost:5000/api/admin/projects/${projectId}/links`,
        {
          application_url: applicationUrl,
          application_github_link: applicationGithubLink
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.links) {
        setLinksMeta((prev) => ({ ...prev, ...data.links }));
        setApplicationUrl(data.links.application_url || '');
        setApplicationGithubLink(data.links.application_github_link || '');
      }
      setDocSuccess('Application URL and GitHub link saved successfully!');
      setTimeout(() => setDocSuccess(''), 4000);
    } catch (err) {
      setDocError(err.response?.data?.error || 'Failed to save application links.');
    } finally {
      setLinksSaving(false);
    }
  };

  const handleToggleSectionLock = async (target, nextLocked) => {
    if (!canLockContent) {
      setDocError('Access Denied: Only Project Lead and Manager can lock or unlock files and fields.');
      return;
    }

    const token = localStorage.getItem('token');
    setLockUpdating(target);
    setDocError('');
    setDocSuccess('');
    try {
      const payload = { target, locked: nextLocked };
      if ((target === 'links' || target === 'all') && nextLocked && !linksMeta.links_locked) {
        payload.application_url = applicationUrl;
        payload.application_github_link = applicationGithubLink;
      }

      const { data } = await axios.put(
        `http://localhost:5000/api/admin/projects/${projectId}/locks`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.links) {
        setLinksMeta((prev) => ({ ...prev, ...data.links }));
        setApplicationUrl(data.links.application_url || '');
        setApplicationGithubLink(data.links.application_github_link || '');
      }
      if (target === 'documents' || target === 'all') {
        fetchDocuments();
      }
      setDocSuccess(data?.message || (nextLocked ? 'Locked (Read-only).' : 'Unlocked (Editable).'));
      setTimeout(() => setDocSuccess(''), 3500);
    } catch (err) {
      setDocError(err.response?.data?.error || 'Failed to update lock status.');
    } finally {
      setLockUpdating('');
    }
  };

  const handleToggleDocLock = async (doc) => {
    if (!canLockContent) {
      setDocError('Access Denied: Only Project Lead and Manager can lock or unlock files.');
      return;
    }
    const token = localStorage.getItem('token');
    setDocLockUpdatingId(doc.id);
    setDocError('');
    setDocSuccess('');
    try {
      const nextLocked = !doc.is_locked;
      const { data } = await axios.put(
        `http://localhost:5000/api/admin/projects/${projectId}/documents/${doc.id}/lock`,
        { locked: nextLocked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.document) {
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data.document : d)));
      }
      setDocSuccess(nextLocked ? `"${doc.name}" locked (read-only).` : `"${doc.name}" unlocked.`);
      setTimeout(() => setDocSuccess(''), 3000);
    } catch (err) {
      setDocError(err.response?.data?.error || 'Failed to toggle file lock.');
    } finally {
      setDocLockUpdatingId(null);
    }
  };

  const handleRaiseTestingRequest = async (e) => {
    if (e) e.preventDefault();
    if (!canManageTestingRequest) {
      setTestingMsg({ text: 'Access Denied: Only Project Lead and Manager can raise a request for testing.', type: 'error' });
      return;
    }
    const notesErr = validateMeaningfulText(testingNotes, {
      label: 'Testing Notes',
      required: false,
      maxLength: INPUT_LIMITS.DESCRIPTION
    });
    if (notesErr) {
      setTestingMsg({ text: notesErr, type: 'error' });
      return;
    }
    const token = localStorage.getItem('token');
    setTestingSubmitting(true);
    setTestingMsg({ text: '', type: '' });
    try {
      const { data } = await axios.post(
        `http://localhost:5000/api/admin/projects/${projectId}/testing-request`,
        {
          priority: testingPriority,
          details: testingNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.approval) {
        setTestingRequests((prev) => [data.approval, ...prev]);
        window.dispatchEvent(new CustomEvent('workspace-approvals-updated'));
      }
      setTestingNotes('');
      setTestingMsg({
        text: `Testing request (${data?.approval?.req_code || 'Submitted'}) sent to QA Lead's Approvals & Requests module.`,
        type: 'success'
      });
    } catch (err) {
      setTestingMsg({
        text: err.response?.data?.error || 'Failed to send testing request.',
        type: 'error'
      });
    } finally {
      setTestingSubmitting(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canEditDocsAndLinks) {
      setDocError('Access Denied: QA Members are not permitted to upload project documents.');
      event.target.value = '';
      return;
    }

    if (linksMeta.documents_locked) {
      setDocError('Uploaded documents are locked (read-only) by Project Lead or Manager.');
      event.target.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_DOCUMENT_EXTENSIONS.includes(fileExt)) {
      setDocError('Invalid file type. Allowed formats: PDF, DOC/DOCX, XLS/XLSX/CSV, TXT, PNG, JPG/JPEG, PPT/PPTX, APK.');
      event.target.value = '';
      return;
    }

    const maxSizeMb = fileExt === 'apk' ? 100 : 25;
    if (file.size === 0) {
      setDocError('Cannot upload an empty (0 B) file. Please select a valid non-empty file.');
      event.target.value = '';
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setDocError(`File is too large. Maximum allowed size is ${maxSizeMb} MB.`);
      event.target.value = '';
      return;
    }

    setDocError('');
    setDocSuccess('');
    setDocUploadLoading(true);

    const fileSizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : file.size >= 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${file.size} B`;

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `http://localhost:5000/api/admin/projects/${projectId}/documents/upload`,
        file,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
            'X-File-Size': fileSizeStr,
            'X-File-Type': fileExt.toUpperCase()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 0
        }
      );
      setDocuments((prev) => [res.data, ...prev]);
      setDocSuccess(`Document "${file.name}" uploaded successfully!`);
      fetchProjectData();
      setTimeout(() => setDocSuccess(''), 4000);
    } catch (apiErr) {
      setDocError(apiErr.response?.data?.error || 'Failed to upload document. Please try again.');
    } finally {
      setDocUploadLoading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId, docName) => {
    if (!canEditDocsAndLinks) {
      setDocError('Access Denied: QA Members cannot delete documents.');
      return;
    }
    const targetDoc = documents.find((d) => d.id === docId);
    if (linksMeta.documents_locked || targetDoc?.is_locked) {
      setDocError('This file is locked (read-only). Unlock it first to delete.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${docName}"?`)) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/projects/${projectId}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setDocSuccess(`Document deleted successfully.`);
      fetchProjectData();
      setTimeout(() => setDocSuccess(''), 3000);
    } catch (err) {
      setDocError(err.response?.data?.error || 'Failed to delete document.');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetchProjectData(),
      fetchLeadsAndHistory(),
      fetchDevsAndHistory(),
      fetchTickets(),
      fetchDocuments(),
      fetchProjectLinks(),
      canManageTestingRequest ? fetchTestingRequests() : Promise.resolve()
    ]).finally(() => setLoading(false));
  }, [projectId]);

  useRealtimeSync(['projects', 'tickets', 'sheets', 'approvals'], () => {
    fetchProjectData();
    fetchLeadsAndHistory();
    fetchDevsAndHistory();
    fetchTickets();
    fetchDocuments();
    fetchProjectLinks();
    if (canManageTestingRequest) fetchTestingRequests();
  });

  const openFolder = (folderId) => {
    if (folderId === 'sheet') {
      navigate(`/admin/projects/${projectId}/sheet`, { state: { project: project || { id: projectId, project_code: `PRJ-${projectId}` } } });
      return;
    }
    if (folderId === 'members') {
      fetchLeadsAndHistory();
      fetchDevsAndHistory();
    }
    if (folderId === 'documents') {
      fetchDocuments();
      fetchProjectLinks();
    }
    if (folderId === 'testing-request') {
      if (!canManageTestingRequest) return;
      fetchProjectLinks();
      fetchTestingRequests();
    }
    setActiveFolder(folderId);
  };

  const handleAssignProjectLead = async (e) => {
    e.preventDefault();
    if (!canAssignProjectLead) {
      setLeadAssignMsg({ text: 'Access Denied: Only Manager and QA Lead can assign a Project Lead.', type: 'error' });
      return;
    }
    if (!selectedLeadId) {
      setLeadAssignMsg({ text: 'Please select a Project Lead.', type: 'error' });
      return;
    }

    try {
      setLeadAssignLoading(true);
      setLeadAssignMsg({ text: '', type: '' });
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/admin/projects/${projectId}/lead`,
        { project_lead_id: selectedLeadId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeadAssignMsg({ text: 'Project Lead updated successfully!', type: 'success' });
      await Promise.all([fetchProjectData(), fetchLeadsAndHistory()]);
      setTimeout(() => {
        setIsLeadModalOpen(false);
        setLeadAssignMsg({ text: '', type: '' });
      }, 1000);
    } catch (err) {
      setLeadAssignMsg({ text: err.response?.data?.error || 'Failed to update Project Lead.', type: 'error' });
    } finally {
      setLeadAssignLoading(false);
    }
  };

  const handleAssignDevelopers = async (e) => {
    e.preventDefault();
    if (!canAssignTeamMembers) {
      setDevAssignMsg({ text: 'Access Denied: Only Manager, QA Lead, and Project Lead can assign team members.', type: 'error' });
      return;
    }
    if (selectedDevIds.length === 0) {
      setDevAssignMsg({ text: 'Please select at least one team member.', type: 'error' });
      return;
    }

    try {
      setDevAssignLoading(true);
      setDevAssignMsg({ text: '', type: '' });
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/admin/projects/${projectId}/developers`,
        { developer_ids: selectedDevIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDevAssignMsg({ text: 'Team members assigned successfully!', type: 'success' });
      await Promise.all([fetchDevsAndHistory(), fetchProjectData()]);
      setSelectedDevIds([]);
      setTimeout(() => {
        setIsDevModalOpen(false);
        setDevAssignMsg({ text: '', type: '' });
      }, 1000);
    } catch (err) {
      setDevAssignMsg({ text: err.response?.data?.error || 'Failed to assign team members.', type: 'error' });
    } finally {
      setDevAssignLoading(false);
    }
  };

  const handleRemoveDeveloper = async (developerId) => {
    if (!canAssignTeamMembers) {
      alert('Access Denied: Only Manager, QA Lead, and Project Lead can remove team members.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this team member from the project?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/projects/${projectId}/developers/${developerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDevsAndHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove developer.');
    }
  };

  const toggleSelectDev = (id) => {
    setSelectedDevIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  // Format date to Indian Standard (DD/MM/YYYY)
  const formatDate = (value) => formatIndianDate(value, 'Not set');

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Logout Modal */}
      {showLogoutModal && (
        <div id="pw-logout-modal-overlay" className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section id="pw-logout-modal" className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 id="pw-logout-modal-title" className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account credentials.</p>
            <div className="modal-actions">
              <button id="pw-logout-cancel-btn" className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button id="pw-logout-confirm-btn" className="modal-btn modal-btn-confirm" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Restricted Access Modal for Developer */}
      {showRestrictedModal && (
        <div id="pw-restricted-modal-overlay" className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowRestrictedModal(false)}>
          <section id="pw-restricted-modal" className="modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 440 }}>
            <div className="modal-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <AlertCircle size={24} />
            </div>
            <h2 id="pw-restricted-modal-title" className="modal-title" style={{ fontSize: 18, color: '#0F172A' }}>Test Sheet Access Restricted</h2>
            <p className="modal-text" style={{ fontSize: 13, lineHeight: 1.5, color: '#475569' }}>
              Full Google Sheets-style test case execution matrices are reserved for <strong>QA Members</strong> and <strong>Project Leads</strong>.
              <br /><br />
              As an engineering developer, you have access to defect tickets assigned to you in the <strong>Tickets</strong> tab and your <strong>Developer Dashboard</strong>.
            </p>
            <div className="modal-actions">
              <button id="pw-restricted-ok-btn" className="modal-btn modal-btn-confirm" onClick={() => setShowRestrictedModal(false)}>
                Understood
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sidebar based on role */}
      <RoleSidebar roleName={currentUserRole} onLogout={() => setShowLogoutModal(true)} />

      <div className="main-content">
        <TopNavbar
          pageTitle={activeProject?.name || 'Project Workspace'}
          breadcrumbs={[{ label: 'Projects', to: '/admin/projects' }]}
        />
        <main id="pw-main-content" className="project-workspace">
          <header id="pw-header" className="project-workspace-header">
            <button id="pw-back-btn" className="project-workspace-back" onClick={() => navigate(isDeveloper ? '/developer' : isProjectLead ? '/project-lead' : '/admin/projects')}>
              <ArrowLeft size={16} /> Back
            </button>
            <div className="project-workspace-title">
              <span className="project-workspace-code">{activeProject.project_code}</span>
              <h1 id="pw-project-heading">{activeProject.name}</h1>
              <p>{activeProject.department || 'Website'} &bull; {activeProject.status || 'Active'}</p>
            </div>
          </header>

          {/* Folder tabs */}
          <section
            id="pw-folders-section"
            className={`project-workspace-folders${visibleWorkspaceFolders.length === 7 ? ' has-seven' : visibleWorkspaceFolders.length === 3 ? ' has-three' : ''}`}
            aria-label="Project folders"
          >
            {visibleWorkspaceFolders.map(({ id, label, detail, icon: Icon }) => (
              <button
                id={`pw-folder-tab-${id}-btn`}
                className={`project-folder ${activeFolder === id ? 'active' : ''}`}
                key={id}
                onClick={() => openFolder(id)}
              >
                <span className={`project-folder-icon ${id}`}><Icon size={21} /></span>
                <span className="project-folder-copy">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </button>
            ))}
          </section>

          {/* Tab 1: Sheet */}
          {activeFolder === 'sheet' && (
            <section id="pw-sheet-section" className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2 id="pw-sheet-heading">Test Execution & Sheets</h2></div>
                {!isDeveloper && (
                  <button
                    id="pw-open-sheets-header-btn"
                    className="pj-btn-primary"
                    onClick={() => navigate(`/admin/projects/${projectId}/sheet`, { state: { project: activeProject } })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0F9D58', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Open Google Sheets Workspace</span>
                  </button>
                )}
              </div>
              <div style={{ background: '#fff', border: '1px solid #dce5e7', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', margin: '16px 0' }}>
                <FileSpreadsheet size={46} color="#0F9D58" style={{ margin: '0 auto 12px' }} />
                <h3 id="pw-sheet-card-heading" style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Google Sheets-Style Test Workbook</h3>
                <p style={{ color: '#52717b', fontSize: '14px', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Access multiple sheet tabs, test case execution matrix, screenshot proof column, copy-paste across rows & columns, and automated status calculations.
                </p>
                {!isDeveloper ? (
                  <button
                    id="pw-launch-sheets-btn"
                    onClick={() => navigate(`/admin/projects/${projectId}/sheet`, { state: { project: activeProject } })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: '#0F9D58', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <ExternalLink size={16} />
                    <span>Launch Full Sheet Workspace</span>
                  </button>
                ) : (
                  <span style={{ color: '#DC2626', fontWeight: 600, fontSize: '13px' }}>
                    Sheet matrix view is restricted to QA Members and Project Leads.
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Tab 2: Tickets */}
          {activeFolder === 'tickets' && (
            <section id="pw-tickets-section" className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2 id="pw-tickets-heading">Bug Defect Tickets</h2></div>
                <strong>{ticketsUnavailable ? activeProject.tickets_count || 0 : tickets.length} total</strong>
              </div>
              {ticketsUnavailable ? (
                <p className="project-workspace-empty">Ticket details are unavailable right now. The project record tracks {activeProject.tickets_count || 0} tickets.</p>
              ) : tickets.length ? (
                <div className="project-ticket-list">
                  {tickets.map((ticket) => (
                    <article
                      id={`pw-ticket-row-${ticket.id}`}
                      className="project-ticket-row"
                      key={ticket.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div>
                        <strong>{ticket.title}</strong>
                        <span>{ticket.ticket_code} &bull; {ticket.module || 'General'} &bull; Dev: {ticket.assigned_to || 'Unassigned'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`project-ticket-status ${String(ticket.status || '').toLowerCase().replaceAll(' ', '-')}`}>
                          {ticket.status}
                        </span>
                        <button id={`pw-ticket-view-btn-${ticket.id}`} type="button" className="pw-btn-preview" onClick={(e) => { e.stopPropagation(); setSelectedTicketId(ticket.id); }}>
                          <Eye size={13} /> View
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="project-workspace-empty">No tickets are linked to this project yet.</p>}
            </section>
          )}

          {/* Tab 3: Merged Project Members (Project Lead + Team Allocation) */}
          {activeFolder === 'members' && (
            <section id="pw-members-section" className="project-workspace-content">
              {/* Part 1: Project Lead Allocation */}
              <div className="project-content-heading">
                <div><span>PROJECT LEAD MANAGEMENT</span><h2 id="pw-lead-heading">Project Lead Allocation</h2></div>
                {canAssignProjectLead && (
                  <button
                    id="pw-add-lead-btn"
                    className="pw-btn-action-primary"
                    onClick={() => {
                      setSelectedLeadId(activeProject.project_lead_id || '');
                      setIsLeadModalOpen(true);
                    }}
                  >
                    <UserCheck size={15} />
                    <span>Add Project lead</span>
                  </button>
                )}
              </div>

              {/* Current Lead Card */}
              <div id="pw-current-lead-card" className="pw-lead-card">
                <div className="pw-lead-avatar">
                  {activeProject.lead_name ? activeProject.lead_name.charAt(0).toUpperCase() : 'L'}
                </div>
                <div className="pw-lead-info">
                  <span className="pw-eyebrow-tag">CURRENT PROJECT LEAD</span>
                  <h3 id="pw-current-lead-name">{activeProject.lead_name || 'No Project Lead Assigned'}</h3>
                  <div className="pw-lead-details-row">
                    {activeProject.lead_assigned_at && (
                      <span>Assigned on: <strong>{formatDate(activeProject.lead_assigned_at)}</strong></span>
                    )}
                    {activeProject.lead_assigned_by && (
                      <span>Assigned by: <strong>{activeProject.lead_assigned_by}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lead Assignment History (Collapsible) - Only for Manager & QA Lead */}
              {canViewAssignmentHistory && (
                <div className="pw-section-sub" style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLeadHistory ? 12 : 0 }}>
                    <h3 id="pw-lead-history-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={15} /> Assignment History ({leadHistory.length})
                    </h3>
                    <button
                      id="pw-lead-history-toggle-btn"
                      type="button"
                      className="pw-history-toggle-btn"
                      onClick={() => setShowLeadHistory((prev) => !prev)}
                    >
                      {showLeadHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{showLeadHistory ? 'Hide History' : 'View History'}</span>
                    </button>
                  </div>
                  {showLeadHistory && (
                    leadHistory.length === 0 ? (
                      <p className="project-workspace-empty" style={{ marginTop: 12 }}>No previous lead assignment history recorded for this project.</p>
                    ) : (
                      <div className="pw-table-wrap" style={{ marginTop: 12 }}>
                        <table id="pw-lead-history-table" className="pw-table">
                          <thead>
                            <tr>
                              <th>Project Lead</th>
                              <th>Email</th>
                              <th>Assigned By</th>
                              <th>Assigned Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leadHistory.map((h) => (
                              <tr key={h.id}>
                                <td><strong>{h.project_lead_name || h.lead_name || 'Project Lead'}</strong></td>
                                <td>{h.project_lead_email || h.lead_email || '—'}</td>
                                <td>{h.assigned_by || 'Admin'}</td>
                                <td>{formatDate(h.assigned_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

              {/* Part 2: Team Allocation (Developers & QA Members) */}
              <div className="project-content-heading">
                <div><span>TEAM ALLOCATION</span><h2 id="pw-developers-heading">{isProjectLead ? 'Assigned Developers' : 'Assigned Team Members'}</h2></div>
                {canAssignTeamMembers && (
                  <button
                    id="pw-add-devs-btn"
                    className="pw-btn-action-primary"
                    onClick={() => {
                      setSelectedDevIds([]);
                      setIsDevModalOpen(true);
                    }}
                  >
                    <UserPlus size={15} />
                    <span>{isProjectLead ? 'Add Developers' : 'Add Team Members'}</span>
                  </button>
                )}
              </div>

              {/* List of currently assigned devs / team members */}
              {assignedDevs.length === 0 ? (
                <div className="pw-empty-box">
                  <Users size={32} color="#94A3B8" />
                  <p>{isProjectLead ? 'No developers assigned to this project yet.' : 'No team members assigned to this project yet.'}</p>
                </div>
              ) : (
                <div className="pw-devs-grid">
                  {assignedDevs.map((d) => (
                    <div key={d.developer_id} id={`pw-dev-card-${d.developer_id}`} className="pw-dev-card">
                      <div className="pw-dev-avatar">
                        {d.developer_name ? d.developer_name.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div className="pw-dev-info">
                        <strong>{d.developer_name}</strong>
                        <span>{d.emp_id || 'EMP'} &bull; {d.developer_email}</span>
                        <small>Assigned by {d.assigned_by} on {formatDate(d.assigned_at)}</small>
                      </div>
                      {canAssignTeamMembers && (
                        <button
                          id={`pw-remove-dev-btn-${d.developer_id}`}
                          type="button"
                          className="pw-btn-remove"
                          onClick={() => handleRemoveDeveloper(d.developer_id)}
                          title="Remove team member from project"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Developer Assignment History (Collapsible) - Only for Manager & QA Lead */}
              {canViewAssignmentHistory && (
                <div className="pw-section-sub" style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDevHistory ? 12 : 0 }}>
                    <h3 id="pw-dev-history-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={15} /> Team Assignment History ({devHistory.length})
                    </h3>
                    <button
                      id="pw-dev-history-toggle-btn"
                      type="button"
                      className="pw-history-toggle-btn"
                      onClick={() => setShowDevHistory((prev) => !prev)}
                    >
                      {showDevHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{showDevHistory ? 'Hide History' : 'View History'}</span>
                    </button>
                  </div>
                  {showDevHistory && (
                    devHistory.length === 0 ? (
                      <p className="project-workspace-empty" style={{ marginTop: 12 }}>No developer assignment history recorded yet.</p>
                    ) : (
                      <div className="pw-table-wrap" style={{ marginTop: 12 }}>
                        <table id="pw-dev-history-table" className="pw-table">
                          <thead>
                            <tr>
                              <th>Developer</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Assigned By</th>
                              <th>Assigned Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {devHistory.map((h) => (
                              <tr key={h.id}>
                                <td><strong>{h.developer_name}</strong></td>
                                <td>{h.developer_email}</td>
                                <td>
                                  <span className={`pw-status-pill ${h.status.toLowerCase()}`}>{h.status}</span>
                                </td>
                                <td>{h.assigned_by}</td>
                                <td>{formatDate(h.assigned_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {/* Tab 5: Documents & Application Links */}
          {activeFolder === 'documents' && (
            <section id="pw-documents-section" className="project-workspace-content">
              <div className="project-content-heading">
                <div>
                  <span>PROJECT CONTENTS</span>
                  <h2 id="pw-documents-heading">Project Documents & Application Links</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <strong>{documents.length} document{documents.length === 1 ? '' : 's'} tracked</strong>
                  {canLockContent && (
                    <button
                      id="pw-lock-all-content-btn"
                      type="button"
                      className={`pw-btn-lock ${linksMeta.links_locked && linksMeta.documents_locked ? 'locked' : ''}`}
                      onClick={() =>
                        handleToggleSectionLock(
                          'all',
                          !(linksMeta.links_locked && linksMeta.documents_locked)
                        )
                      }
                      disabled={lockUpdating === 'all'}
                      title={
                        linksMeta.links_locked && linksMeta.documents_locked
                          ? 'Unlock all fields and uploaded files'
                          : 'Lock all fields and uploaded files (Read-only)'
                      }
                    >
                      {linksMeta.links_locked && linksMeta.documents_locked ? (
                        <>
                          <Unlock size={14} />
                          <span>{lockUpdating === 'all' ? 'Unlocking...' : 'Unlock All'}</span>
                        </>
                      ) : (
                        <>
                          <Lock size={14} />
                          <span>{lockUpdating === 'all' ? 'Locking...' : 'Lock All'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Status Notifications */}
              {docSuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>{docSuccess}</span>
                </div>
              )}

              {docError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  <AlertCircle size={16} color="#EF4444" />
                  <span>{docError}</span>
                </div>
              )}

              {/* Application URL & Application GitHub Link Card */}
              <form id="pw-links-form" className="pw-links-card" onSubmit={handleSaveLinks}>
                <div className="pw-links-card-header">
                  <div>
                    <h3 id="pw-links-heading">Application Links</h3>
                    <p>
                      {isQAMember
                        ? 'Application and repository links for this project'
                        : linksMeta.links_locked
                        ? `Locked (Read-Only)${linksMeta.links_locked_by ? ` by ${linksMeta.links_locked_by}` : ''}`
                        : 'Enter the live Application URL and GitHub repository link for this project'}
                    </p>
                  </div>
                  <div className="pw-links-header-actions">
                    {!isQAMember && (
                      <span className={`pw-lock-pill ${linksMeta.links_locked ? 'locked' : 'unlocked'}`}>
                        {linksMeta.links_locked ? (
                          <>
                            <Lock size={12} />
                            <span>Locked • Read Only</span>
                          </>
                        ) : !canEditDocsAndLinks ? (
                          <>
                            <Eye size={12} />
                            <span>Read Only</span>
                          </>
                        ) : (
                          <>
                            <Unlock size={12} />
                            <span>Editable</span>
                          </>
                        )}
                      </span>
                    )}
                    {canLockContent && (
                      <button
                        id="pw-lock-links-btn"
                        type="button"
                        className={`pw-btn-lock ${linksMeta.links_locked ? 'locked' : ''}`}
                        onClick={() => handleToggleSectionLock('links', !linksMeta.links_locked)}
                        disabled={lockUpdating === 'links'}
                      >
                        {linksMeta.links_locked ? (
                          <>
                            <Unlock size={13} />
                            <span>{lockUpdating === 'links' ? 'Unlocking...' : 'Unlock Fields'}</span>
                          </>
                        ) : (
                          <>
                            <Lock size={13} />
                            <span>{lockUpdating === 'links' ? 'Locking...' : 'Lock Fields'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pw-links-grid">
                  <div className="pw-form-group">
                    <label htmlFor="pw-app-url">
                      <Globe size={13} />
                      <span>Application URL</span>
                    </label>
                    <div className="pw-link-input-wrap">
                      <input
                        id="pw-app-url"
                        type="url"
                        className={`pw-input${!canEditDocsAndLinks || linksMeta.links_locked ? ' pw-input-readonly' : ''}`}
                        placeholder="https://app.example.com"
                        autoComplete="url"
                        maxLength={INPUT_LIMITS.URL}
                        value={applicationUrl}
                        onChange={(e) => setApplicationUrl(e.target.value)}
                        readOnly={!canEditDocsAndLinks || linksMeta.links_locked}
                      />
                      {applicationUrl.trim() && !/^(javascript|vbscript|data):/i.test(applicationUrl.trim()) && (
                        <a
                          id="pw-app-url-open-link"
                          href={/^https?:\/\//i.test(applicationUrl.trim()) ? applicationUrl.trim() : `https://${applicationUrl.trim()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="pw-link-open-btn"
                          title="Open Application URL"
                        >
                          <ExternalLink size={14} />
                          <span>Open</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pw-form-group">
                    <label htmlFor="pw-github-url">
                      <GitBranch size={13} />
                      <span>Application GitHub Link</span>
                    </label>
                    <div className="pw-link-input-wrap">
                      <input
                        id="pw-github-url"
                        type="url"
                        className={`pw-input${!canEditDocsAndLinks || linksMeta.links_locked ? ' pw-input-readonly' : ''}`}
                        placeholder="https://github.com/organization/repository"
                        autoComplete="url"
                        maxLength={INPUT_LIMITS.URL}
                        value={applicationGithubLink}
                        onChange={(e) => setApplicationGithubLink(e.target.value)}
                        readOnly={!canEditDocsAndLinks || linksMeta.links_locked}
                      />
                      {applicationGithubLink.trim() && !/^(javascript|vbscript|data):/i.test(applicationGithubLink.trim()) && (
                        <a
                          id="pw-github-url-open-link"
                          href={/^https?:\/\//i.test(applicationGithubLink.trim()) ? applicationGithubLink.trim() : `https://${applicationGithubLink.trim()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="pw-link-open-btn"
                          title="Open GitHub Repository"
                        >
                          <ExternalLink size={14} />
                          <span>Open</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {canEditDocsAndLinks && !linksMeta.links_locked && (
                  <div className="pw-links-footer">
                    <button
                      id="pw-save-links-btn"
                      type="submit"
                      className="pw-btn-primary"
                      disabled={linksSaving}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Save size={14} />
                      <span>{linksSaving ? 'Saving...' : 'Save Links'}</span>
                    </button>
                  </div>
                )}
              </form>

              {/* Uploaded Files Section Header */}
              <div className="pw-docs-section-bar">
                <div className="pw-docs-section-title">
                  <h3 id="pw-uploaded-files-heading">Uploaded Files</h3>
                  {!isQAMember && (
                    <span className={`pw-lock-pill ${linksMeta.documents_locked || !canEditDocsAndLinks ? 'locked' : 'unlocked'}`}>
                      {linksMeta.documents_locked ? (
                        <>
                          <Lock size={12} />
                          <span>
                            Files Locked • Read Only{linksMeta.documents_locked_by ? ` by ${linksMeta.documents_locked_by}` : ''}
                          </span>
                        </>
                      ) : !canEditDocsAndLinks ? (
                        <>
                          <Eye size={12} />
                          <span>View & Download Only</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={12} />
                          <span>Editable</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {canLockContent && (
                    <button
                      id="pw-lock-documents-btn"
                      type="button"
                      className={`pw-btn-lock ${linksMeta.documents_locked ? 'locked' : ''}`}
                      onClick={() => handleToggleSectionLock('documents', !linksMeta.documents_locked)}
                      disabled={lockUpdating === 'documents'}
                    >
                      {linksMeta.documents_locked ? (
                        <>
                          <Unlock size={13} />
                          <span>{lockUpdating === 'documents' ? 'Unlocking...' : 'Unlock Files'}</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} />
                          <span>{lockUpdating === 'documents' ? 'Locking...' : 'Lock Files'}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Document upload allowed for everyone except QA Members, unless locked */}
                  {canEditDocsAndLinks && !linksMeta.documents_locked && (
                    <label className="pw-btn-upload-doc" htmlFor="pw-doc-upload-primary">
                      <Upload size={16} color="#FFFFFF" />
                      <span style={{ color: '#FFFFFF' }}>{docUploadLoading ? 'Uploading...' : 'Upload Documents'}</span>
                      <input
                        id="pw-doc-upload-primary"
                        type="file"
                        onChange={handleFileUpload}
                        disabled={docUploadLoading}
                        style={{ display: 'none' }}
                        accept={ALLOWED_DOCUMENT_ACCEPT}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Documents Content view */}
              {documentsLoading ? (
                <SkeletonLoader variant="table" rows={3} />
              ) : documents.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  margin: '12px 0'
                }}>
                  <FileText size={42} color="#94A3B8" style={{ marginBottom: '12px' }} />
                  <h4 id="pw-docs-empty-heading" style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
                    No Documents Uploaded Yet
                  </h4>
                  <p style={{ margin: '0 auto 16px', fontSize: '13px', color: '#64748B', maxWidth: '440px' }}>
                    {isQAMember
                      ? 'No documents have been uploaded for this project yet.'
                      : linksMeta.documents_locked
                      ? 'Document uploads are currently locked (read-only) by Manager or QA Lead.'
                      : canEditDocsAndLinks
                      ? 'Upload product specifications, test plans, architecture diagrams, or contract files for this project.'
                      : 'No documents have been uploaded for this project yet.'}
                  </p>
                  {canEditDocsAndLinks && !linksMeta.documents_locked && (
                    <label className="pw-btn-upload-doc" htmlFor="pw-doc-upload-empty">
                      <Upload size={16} color="#FFFFFF" />
                      <span style={{ color: '#FFFFFF' }}>{docUploadLoading ? 'Uploading...' : 'Upload Documents'}</span>
                      <input
                        id="pw-doc-upload-empty"
                        type="file"
                        onChange={handleFileUpload}
                        disabled={docUploadLoading}
                        style={{ display: 'none' }}
                        accept={ALLOWED_DOCUMENT_ACCEPT}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
                  <table id="pw-documents-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Document Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Size</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Uploaded By</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Upload Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => {
                        const rowLocked = Boolean(linksMeta.documents_locked || doc.is_locked);
                        return (
                          <tr key={doc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <FileText size={18} color="#2563EB" />
                                <span style={{ fontWeight: 600, color: '#0F172A' }}>{doc.name}</span>
                                {isDocumentEmpty(doc) && (
                                  <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                    Empty (0 B)
                                  </span>
                                )}
                                {rowLocked && !isQAMember && (
                                  <span className="pw-file-locked-badge" title={doc.locked_by ? `Locked by ${doc.locked_by}` : 'Locked (Read-Only)'}>
                                    <Lock size={11} />
                                    <span>Locked</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>
                              <span style={{
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 600
                              }}>
                                {doc.file_type || 'FILE'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{doc.file_size || '—'}</td>
                            <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>{doc.uploaded_by || 'Admin'}</td>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>
                              {formatIndianDate(doc.uploaded_at, '—')}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  id={`pw-doc-view-btn-${doc.id}`}
                                  type="button"
                                  onClick={() => handleViewDocument(doc)}
                                  className="pw-btn-doc-view"
                                  title="View document"
                                >
                                  <Eye size={13} />
                                  <span>View</span>
                                </button>
                                <button
                                  id={`pw-doc-download-btn-${doc.id}`}
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  disabled={docDownloadingId === doc.id}
                                  className="pw-btn-doc-download"
                                  title="Download document"
                                >
                                  <Download size={13} />
                                  <span>{docDownloadingId === doc.id ? 'Downloading...' : 'Download'}</span>
                                </button>
                                {canLockContent && !linksMeta.documents_locked && (
                                  <button
                                    id={`pw-doc-lock-btn-${doc.id}`}
                                    type="button"
                                    onClick={() => handleToggleDocLock(doc)}
                                    disabled={docLockUpdatingId === doc.id}
                                    className={`pw-btn-doc-lock ${doc.is_locked ? 'locked' : ''}`}
                                    title={doc.is_locked ? 'Unlock file' : 'Lock file (Read-only)'}
                                  >
                                    {doc.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                                  </button>
                                )}
                                {canEditDocsAndLinks && !rowLocked && (
                                  <button
                                    id={`pw-doc-delete-btn-${doc.id}`}
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                                    className="pw-btn-doc-delete"
                                    title="Delete document"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Tab 6: Testing Request (Project Lead & Manager Only) */}
          {activeFolder === 'testing-request' && canManageTestingRequest && (
            <section id="pw-testing-request-section" className="project-workspace-content">
              <div className="project-content-heading">
                <div>
                  <span>QA TESTING WORKFLOW</span>
                  <h2 id="pw-testing-request-heading">Request to Start Testing</h2>
                </div>
                {testingRequests.length > 0 && (
                  <span className={`pw-req-status-badge ${String(testingRequests[0].status || 'Pending').toLowerCase()}`}>
                    Latest: {testingRequests[0].status} ({testingRequests[0].req_code})
                  </span>
                )}
              </div>

              {testingMsg.text && (
                <div className={`pw-alert ${testingMsg.type}`} style={{ marginBottom: '16px' }}>
                  {testingMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{testingMsg.text}</span>
                </div>
              )}

              <div className="pw-test-req-card">
                <div className="pw-test-req-summary">
                  <div>
                    <small>Project</small>
                    <strong>{activeProject.name} ({activeProject.project_code})</strong>
                  </div>
                  <div>
                    <small>Application URL</small>
                    <strong>{applicationUrl.trim() || 'Not set yet'}</strong>
                  </div>
                  <div>
                    <small>GitHub Repository</small>
                    <strong>{applicationGithubLink.trim() || 'Not set yet'}</strong>
                  </div>
                  <div>
                    <small>Uploaded Documents</small>
                    <strong>{documents.length} file{documents.length === 1 ? '' : 's'}</strong>
                  </div>
                </div>

                <form id="pw-testing-request-form" onSubmit={handleRaiseTestingRequest} className="pw-test-req-form">
                  <div className="pw-test-req-row">
                    <div className="pw-form-group" style={{ minWidth: '180px' }}>
                      <label htmlFor="pw-testing-priority">Request Priority</label>
                      <CustomSelect
                        id="pw-testing-priority"
                        value={testingPriority}
                        onChange={setTestingPriority}
                        options={TESTING_PRIORITY_OPTIONS}
                        variant="form"
                      />
                    </div>

                    <div className="pw-form-group" style={{ flex: 1 }}>
                      <label htmlFor="pw-testing-notes">Testing Notes / Build Details for QA Lead</label>
                      <input
                        id="pw-testing-notes"
                        type="text"
                        className="pw-input"
                        placeholder="e.g. Build v1.0 deployed on staging, credentials & test scope in Documents..."
                        autoComplete="off"
                        maxLength={INPUT_LIMITS.DESCRIPTION}
                        value={testingNotes}
                        onChange={(e) => setTestingNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pw-test-req-actions">
                    <p className="pw-test-req-hint">
                      Submitting sends this project testing request directly to the QA Lead&apos;s Approvals &amp; Requests module.
                    </p>
                    <button
                      id="pw-raise-testing-btn"
                      type="submit"
                      className="pw-btn-raise-testing"
                      disabled={testingSubmitting || testingRequests[0]?.status === 'Pending'}
                    >
                      <Send size={15} />
                      <span>
                        {testingSubmitting
                          ? 'Sending Request...'
                          : testingRequests[0]?.status === 'Pending'
                          ? 'Request Pending QA Lead Approval'
                          : 'Raise Request for Testing'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="pw-section-sub" style={{ marginTop: 24 }}>
                <h3 id="pw-testing-history-heading">Testing Request History ({testingRequests.length})</h3>
                {testingRequestsLoading ? (
                  <SkeletonLoader variant="table" rows={3} />
                ) : testingRequests.length === 0 ? (
                  <p className="project-workspace-empty">
                    No request to start testing has been raised for this project yet.
                  </p>
                ) : (
                  <div className="pw-table-wrap">
                    <table id="pw-testing-history-table" className="pw-table">
                      <thead>
                        <tr>
                          <th>Request Code</th>
                          <th>Priority</th>
                          <th>Requested By</th>
                          <th>Notes</th>
                          <th>Status</th>
                          <th>Reviewed By</th>
                          <th>Submitted On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testingRequests.map((reqItem) => (
                          <tr key={reqItem.id}>
                            <td><strong>{reqItem.req_code}</strong></td>
                            <td>{reqItem.priority}</td>
                            <td>{reqItem.requested_by}</td>
                            <td>{reqItem.details || '—'}</td>
                            <td>
                              <span className={`pw-req-status-badge ${String(reqItem.status || 'Pending').toLowerCase()}`}>
                                {reqItem.status}
                              </span>
                            </td>
                            <td>{reqItem.reviewed_by || 'Awaiting QA Lead'}</td>
                            <td>{formatDate(reqItem.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 7: Details */}
          {activeFolder === 'details' && (
            <section id="pw-details-section" className="project-workspace-content">
              <div className="project-content-heading"><div><span>PROJECT CONTENTS</span><h2 id="pw-details-heading">Details</h2></div></div>
              <dl className="project-details-grid">
                <div><dt>Project code</dt><dd>{activeProject.project_code || 'Not set'}</dd></div>
                <div><dt>Project lead</dt><dd>{activeProject.lead_name || 'Not assigned'}</dd></div>
                <div><dt>Project Type</dt><dd>{activeProject.department || 'Not set'}</dd></div>
                <div><dt>Status</dt><dd>{activeProject.status || 'Not set'}</dd></div>
                <div><dt>Start date</dt><dd><CalendarDays size={15} />{formatDate(activeProject.start_date)}</dd></div>
                <div><dt>Team members</dt><dd><Users size={15} />{(activeProject.team_members !== undefined && activeProject.team_members !== null && activeProject.team_members !== 0) ? activeProject.team_members : (assignedDevs.length || activeProject.team_members || 0)}</dd></div>
                <div className="project-details-description"><dt>Description</dt><dd>{activeProject.description || 'No description has been added.'}</dd></div>
              </dl>
            </section>
          )}
        </main>
      </div>

      {/* Modal: Assign / Change Project Lead */}
      {isLeadModalOpen && (
        <div id="pw-lead-modal-overlay" className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setIsLeadModalOpen(false)}>
          <div id="pw-lead-modal" className="pw-modal-box">
            <div className="pw-modal-header">
              <h3 id="pw-lead-modal-title">Add Project Lead</h3>
              <button id="pw-lead-modal-close-btn" className="pw-modal-close" onClick={() => setIsLeadModalOpen(false)}><X size={18} /></button>
            </div>
            <form id="pw-assign-lead-form" onSubmit={handleAssignProjectLead}>
              <div className="pw-modal-body">
                {leadAssignMsg.text && (
                  <div className={`pw-alert ${leadAssignMsg.type}`}>
                    {leadAssignMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{leadAssignMsg.text}</span>
                  </div>
                )}
                <div className="pw-form-group">
                  <label htmlFor="pw-select-lead">Select Project Lead *</label>
                  <CustomSelect
                    id="pw-select-lead"
                    value={selectedLeadId}
                    onChange={setSelectedLeadId}
                    options={[
                      { value: '', label: '-- Choose Project Lead --' },
                      ...availableLeads.map((lead) => ({
                        value: String(lead.id),
                        label: `${lead.full_name} (${lead.email}) ${lead.emp_id ? `[${lead.emp_id}]` : ''} - ${lead.role || 'Member'}`
                      }))
                    ]}
                    variant="form"
                    placeholder="-- Choose Project Lead --"
                  />
                </div>
              </div>
              <div className="pw-modal-footer">
                <button id="pw-lead-modal-cancel-btn" type="button" className="pw-btn-secondary" onClick={() => setIsLeadModalOpen(false)}>
                  Cancel
                </button>
                <button id="pw-lead-modal-submit-btn" type="submit" className="pw-btn-primary" disabled={leadAssignLoading || !selectedLeadId}>
                  {leadAssignLoading ? 'Assigning...' : 'Add Project Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Developers */}
      {isDevModalOpen && (
        <div id="pw-dev-modal-overlay" className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setIsDevModalOpen(false)}>
          <div id="pw-dev-modal" className="pw-modal-box" style={{ maxWidth: 580 }}>
            <div className="pw-modal-header">
              <h3 id="pw-dev-modal-title">{isProjectLead ? 'Add Developers to Project' : 'Add Team Members to Project'}</h3>
              <button id="pw-dev-modal-close-btn" className="pw-modal-close" onClick={() => setIsDevModalOpen(false)}><X size={18} /></button>
            </div>
            <form id="pw-assign-devs-form" onSubmit={handleAssignDevelopers}>
              <div className="pw-modal-body">
                {devAssignMsg.text && (
                  <div className={`pw-alert ${devAssignMsg.type}`}>
                    {devAssignMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{devAssignMsg.text}</span>
                  </div>
                )}
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  {isProjectLead ? 'Select Developers' : 'Select Team Members (Developers & QA)'}
                </label>
                <div className="pw-dev-select-grid">
                  {assignableTeamMembers.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#64748B', padding: '12px 0' }}>
                      {isProjectLead ? 'No available developers found.' : 'No available team members found.'}
                    </p>
                  ) : (
                    assignableTeamMembers.map((dev) => {
                      const isAlready = assignedDevs.some((d) => d.developer_id === dev.id);
                      const isSelected = selectedDevIds.includes(dev.id);
                      return (
                        <div
                          id={`pw-avail-dev-option-${dev.id}`}
                          key={dev.id}
                          className={`pw-dev-pick-item ${isSelected ? 'selected' : ''} ${isAlready ? 'disabled' : ''}`}
                          onClick={() => !isAlready && toggleSelectDev(dev.id)}
                        >
                          <div className="pw-dev-pick-checkbox">
                            {isSelected && <Check size={14} color="#fff" />}
                          </div>
                          <div className="pw-dev-pick-info">
                            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {dev.full_name}
                              <span style={{ fontSize: 11, fontWeight: 600, color: dev.role === 'QA Member' ? '#0284C7' : '#4F46E5', background: dev.role === 'QA Member' ? '#E0F2FE' : '#EEF2FF', padding: '1px 6px', borderRadius: 4 }}>
                                {dev.role || 'Member'}
                              </span>
                            </strong>
                            <span>{dev.email}</span>
                            {isAlready && <span className="pw-tag-already">Already on Project</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="pw-modal-footer">
                <button id="pw-dev-modal-cancel-btn" type="button" className="pw-btn-secondary" onClick={() => setIsDevModalOpen(false)}>
                  Cancel
                </button>
                <button id="pw-dev-modal-submit-btn" type="submit" className="pw-btn-primary" disabled={devAssignLoading || selectedDevIds.length === 0}>
                  {devAssignLoading ? 'Adding...' : isProjectLead ? `Add Developers (${selectedDevIds.length})` : `Add Team Members (${selectedDevIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Preview / View */}
      {previewDoc && (
        <div id="pw-doc-preview-modal-overlay" className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closePreviewModal()}>
          <div id="pw-doc-preview-modal" className="pw-modal-box" style={{ maxWidth: 860, width: '92%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="pw-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <FileText size={22} color="#2563EB" />
                <div style={{ minWidth: 0 }}>
                  <h3 id="pw-doc-preview-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {previewDoc.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {previewDoc.file_size} &bull; Uploaded by {previewDoc.uploaded_by || 'Admin'} on {formatIndianDate(previewDoc.uploaded_at, 'Recent')}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  id="pw-doc-preview-open-link"
                  href={previewDoc.blobUrl || previewDoc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    textDecoration: 'none',
                    border: '1px solid #BFDBFE'
                  }}
                  title="Open in new window"
                >
                  <ExternalLink size={14} />
                  <span>Open in Tab</span>
                </a>
                <button
                  id="pw-doc-preview-download-btn"
                  type="button"
                  onClick={() => handleDownloadDocument(previewDoc)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button id="pw-doc-preview-close-btn" className="pw-modal-close" onClick={closePreviewModal} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="pw-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', minHeight: '360px' }}>
              {isImage(previewDoc.name) ? (
                <img
                  src={previewDoc.blobUrl || previewDoc.file_url}
                  alt={previewDoc.name}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
              ) : isPdf(previewDoc.name) ? (
                <iframe
                  src={previewDoc.blobUrl || previewDoc.file_url}
                  title={previewDoc.name}
                  style={{ width: '100%', height: '65vh', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFFFFF' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', maxWidth: '480px', width: '100%' }}>
                  <FileText size={48} color="#2563EB" style={{ margin: '0 auto 12px' }} />
                  <h4 id="pw-doc-preview-fallback-heading" style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{previewDoc.name}</h4>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                    This document format ({previewDoc.file_type || previewDoc.name.split('.').pop()?.toUpperCase()}) can be opened in a browser tab or downloaded to your device for viewing with compatible software.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <a
                      id="pw-doc-preview-fallback-open-link"
                      href={previewDoc.blobUrl || previewDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '13px',
                        textDecoration: 'none',
                        border: '1px solid #BFDBFE'
                      }}
                    >
                      <ExternalLink size={15} />
                      <span>Open in Browser Tab</span>
                    </a>
                    <button
                      id="pw-doc-preview-fallback-download-btn"
                      type="button"
                      onClick={() => handleDownloadDocument(previewDoc)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={15} />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          ticketId={selectedTicketId}
          userRole={currentUserRole}
          onTicketUpdated={fetchTickets}
        />
      )}
    </div>
  );
}
