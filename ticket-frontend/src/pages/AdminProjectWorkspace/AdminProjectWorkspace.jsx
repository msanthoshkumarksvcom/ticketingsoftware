import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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

const TESTING_PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import './AdminProjectWorkspace.css';

const WORKSPACE_FOLDERS = [
  { id: 'sheet', label: 'Sheet', detail: 'Project test sheets', icon: FileSpreadsheet },
  { id: 'tickets', label: 'Tickets', detail: 'Issues for this project', icon: Ticket },
  { id: 'lead', label: 'Project Lead', detail: 'Lead allocation & history', icon: ShieldCheck },
  { id: 'developers', label: 'Developers', detail: 'Assigned engineering devs', icon: Users },
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
  const isManager = currentUserRole === 'Manager' || currentUserRole === 'Super Admin' || currentUserRole === 'Admin';

  // Access rules: Only Manager & QA Lead (plus Super Admin, Admin) can assign Project Leads & Developers
  const canAssignLeadAndDevs = ['Manager', 'QA Lead', 'Super Admin', 'Admin'].includes(currentUserRole);
  // Everyone EXCEPT QA Members can upload documents and edit Application URL / GitHub Link
  const canEditDocsAndLinks = !isQAMember;
  // Only Project Lead and Manager can lock/unlock files & link fields and access Testing Request page
  const canLockContent = isManager || isProjectLead;
  const canManageTestingRequest = isManager || isProjectLead;

  const visibleWorkspaceFolders = useMemo(
    () => WORKSPACE_FOLDERS.filter((folder) => !folder.restrictedToLeadAndManager || canManageTestingRequest),
    [canManageTestingRequest]
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
    if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) && !fileUrl.startsWith('http://localhost:5000/uploads/')) {
      return { url: fileUrl, isBlob: false };
    }

    const token = localStorage.getItem('token');
    const endpoint = `http://localhost:5000/api/admin/projects/${projectId}/documents/${doc.id}/download${inline ? '?inline=1' : ''}`;
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
        axios.get(`http://localhost:5000/api/admin/projects/${projectId}/lead-history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
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
        axios.get(`http://localhost:5000/api/admin/projects/${projectId}/developer-history`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
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

  const openFolder = (folderId) => {
    if (folderId === 'sheet') {
      if (isDeveloper) {
        setShowRestrictedModal(true);
        return;
      }
      navigate(`/admin/projects/${projectId}/sheet`, { state: { project: project || { id: projectId, project_code: `PRJ-${projectId}` } } });
      return;
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
    if (!canAssignLeadAndDevs) {
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
    if (!canAssignLeadAndDevs) {
      setDevAssignMsg({ text: 'Access Denied: Only Manager and QA Lead can assign developers.', type: 'error' });
      return;
    }
    if (selectedDevIds.length === 0) {
      setDevAssignMsg({ text: 'Please select at least one developer.', type: 'error' });
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

      setDevAssignMsg({ text: 'Developers assigned successfully!', type: 'success' });
      await Promise.all([fetchDevsAndHistory(), fetchProjectData()]);
      setSelectedDevIds([]);
      setTimeout(() => {
        setIsDevModalOpen(false);
        setDevAssignMsg({ text: '', type: '' });
      }, 1000);
    } catch (err) {
      setDevAssignMsg({ text: err.response?.data?.error || 'Failed to assign developers.', type: 'error' });
    } finally {
      setDevAssignLoading(false);
    }
  };

  const handleRemoveDeveloper = async (developerId) => {
    if (!canAssignLeadAndDevs) {
      alert('Access Denied: Only Manager and QA Lead can remove developers.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this developer from the project?')) return;
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
  const formatDate = (value) => {
    if (!value) return 'Not set';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.trim().split('-');
      return `${d}/${m}/${y}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowLogoutModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title">Sign out of your workspace?</h2>
            <p className="modal-text">You can sign back in at any time with your account credentials.</p>
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

      {/* Restricted Access Modal for Developer */}
      {showRestrictedModal && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowRestrictedModal(false)}>
          <section className="modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 440 }}>
            <div className="modal-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <AlertCircle size={24} />
            </div>
            <h2 className="modal-title" style={{ fontSize: 18, color: '#0F172A' }}>Test Sheet Access Restricted</h2>
            <p className="modal-text" style={{ fontSize: 13, lineHeight: 1.5, color: '#475569' }}>
              Full Google Sheets-style test case execution matrices are reserved for <strong>QA Members</strong> and <strong>Project Leads</strong>.
              <br /><br />
              As an engineering developer, you have access to defect tickets assigned to you in the <strong>Tickets</strong> tab and your <strong>Developer Dashboard</strong>.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-confirm" onClick={() => setShowRestrictedModal(false)}>
                Understood
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Sidebar based on role */}
      {isDeveloper ? (
        <RoleSidebar roleName="Developer" homeRoute="/developer" onLogout={() => setShowLogoutModal(true)} />
      ) : isProjectLead ? (
        <RoleSidebar roleName="Project Lead" homeRoute="/project-lead" onLogout={() => setShowLogoutModal(true)} />
      ) : (
        <AdminSidebar onLogout={() => setShowLogoutModal(true)} />
      )}

      <div className="main-content">
        <main className="project-workspace">
          <header className="project-workspace-header">
            <button className="project-workspace-back" onClick={() => navigate(isDeveloper ? '/developer' : isProjectLead ? '/project-lead' : '/admin/projects')}>
              <ArrowLeft size={16} /> Back
            </button>
            <div className="project-workspace-title">
              <span className="project-workspace-code">{activeProject.project_code}</span>
              <h1>{activeProject.name}</h1>
              <p>{activeProject.department || 'Website'} &bull; {activeProject.status || 'Active'}</p>
            </div>
          </header>

          {/* Folder tabs */}
          <section
            className={`project-workspace-folders${visibleWorkspaceFolders.length === 7 ? ' has-seven' : ''}`}
            aria-label="Project folders"
          >
            {visibleWorkspaceFolders.map(({ id, label, detail, icon: Icon }) => (
              <button
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
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Test Execution & Sheets</h2></div>
                {!isDeveloper && (
                  <button
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
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Google Sheets-Style Test Workbook</h3>
                <p style={{ color: '#52717b', fontSize: '14px', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Access multiple sheet tabs, test case execution matrix, screenshot proof column, copy-paste across rows & columns, and automated status calculations.
                </p>
                {!isDeveloper ? (
                  <button
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
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Bug Defect Tickets</h2></div>
                <strong>{ticketsUnavailable ? activeProject.tickets_count || 0 : tickets.length} total</strong>
              </div>
              {ticketsUnavailable ? (
                <p className="project-workspace-empty">Ticket details are unavailable right now. The project record tracks {activeProject.tickets_count || 0} tickets.</p>
              ) : tickets.length ? (
                <div className="project-ticket-list">
                  {tickets.map((ticket) => (
                    <article
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
                        <button type="button" className="pw-btn-preview" onClick={(e) => { e.stopPropagation(); setSelectedTicketId(ticket.id); }}>
                          <Eye size={13} /> View
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="project-workspace-empty">No tickets are linked to this project yet.</p>}
            </section>
          )}

          {/* Tab 3: Project Lead Assignment (Section 2.2) */}
          {activeFolder === 'lead' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT LEAD MANAGEMENT</span><h2>Project Lead Allocation</h2></div>
                {canAssignLeadAndDevs && (
                  <button
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
              <div className="pw-lead-card">
                <div className="pw-lead-avatar">
                  {activeProject.lead_name ? activeProject.lead_name.charAt(0).toUpperCase() : 'L'}
                </div>
                <div className="pw-lead-info">
                  <span className="pw-eyebrow-tag">CURRENT PROJECT LEAD</span>
                  <h3>{activeProject.lead_name || 'No Project Lead Assigned'}</h3>
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

              {/* Lead Assignment History (Collapsible) */}
              <div className="pw-section-sub" style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLeadHistory ? 12 : 0 }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={15} /> Assignment History ({leadHistory.length})
                  </h3>
                  <button
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
                      <table className="pw-table">
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
            </section>
          )}

          {/* Tab 4: Developer Assignment (Section 4) */}
          {activeFolder === 'developers' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>ENGINEERING ALLOCATION</span><h2>Assigned Developers</h2></div>
                {canAssignLeadAndDevs && (
                  <button
                    className="pw-btn-action-primary"
                    onClick={() => {
                      setSelectedDevIds([]);
                      setIsDevModalOpen(true);
                    }}
                  >
                    <UserPlus size={15} />
                    <span>Add Developers</span>
                  </button>
                )}
              </div>

              {/* List of currently assigned devs */}
              {assignedDevs.length === 0 ? (
                <div className="pw-empty-box">
                  <Users size={32} color="#94A3B8" />
                  <p>No engineering developers assigned to this project yet.</p>
                </div>
              ) : (
                <div className="pw-devs-grid">
                  {assignedDevs.map((d) => (
                    <div key={d.developer_id} className="pw-dev-card">
                      <div className="pw-dev-avatar">
                        {d.developer_name ? d.developer_name.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div className="pw-dev-info">
                        <strong>{d.developer_name}</strong>
                        <span>{d.emp_id || 'EMP'} &bull; {d.developer_email}</span>
                        <small>Assigned by {d.assigned_by} on {formatDate(d.assigned_at)}</small>
                      </div>
                      {canAssignLeadAndDevs && (
                        <button
                          type="button"
                          className="pw-btn-remove"
                          onClick={() => handleRemoveDeveloper(d.developer_id)}
                          title="Remove developer from project"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Developer Assignment History (Collapsible) */}
              <div className="pw-section-sub" style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showDevHistory ? 12 : 0 }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={15} /> Developer Assignment History ({devHistory.length})
                  </h3>
                  <button
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
                      <table className="pw-table">
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
            </section>
          )}

          {/* Tab 5: Documents & Application Links */}
          {activeFolder === 'documents' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div>
                  <span>PROJECT CONTENTS</span>
                  <h2>Project Documents & Application Links</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <strong>{documents.length} document{documents.length === 1 ? '' : 's'} tracked</strong>
                  {canLockContent && (
                    <button
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
              <form className="pw-links-card" onSubmit={handleSaveLinks}>
                <div className="pw-links-card-header">
                  <div>
                    <h3>Application Links</h3>
                    <p>
                      {linksMeta.links_locked
                        ? `Locked (Read-Only)${linksMeta.links_locked_by ? ` by ${linksMeta.links_locked_by}` : ''}`
                        : isQAMember
                        ? 'Read-only access for QA Members'
                        : 'Enter the live Application URL and GitHub repository link for this project'}
                    </p>
                  </div>
                  <div className="pw-links-header-actions">
                    <span className={`pw-lock-pill ${linksMeta.links_locked || isQAMember ? 'locked' : 'unlocked'}`}>
                      {linksMeta.links_locked ? (
                        <>
                          <Lock size={12} />
                          <span>Locked • Read Only</span>
                        </>
                      ) : isQAMember ? (
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
                    {canLockContent && (
                      <button
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
                        value={applicationUrl}
                        onChange={(e) => setApplicationUrl(e.target.value)}
                        readOnly={!canEditDocsAndLinks || linksMeta.links_locked}
                      />
                      {applicationUrl.trim() && !/^(javascript|vbscript|data):/i.test(applicationUrl.trim()) && (
                        <a
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
                        value={applicationGithubLink}
                        onChange={(e) => setApplicationGithubLink(e.target.value)}
                        readOnly={!canEditDocsAndLinks || linksMeta.links_locked}
                      />
                      {applicationGithubLink.trim() && !/^(javascript|vbscript|data):/i.test(applicationGithubLink.trim()) && (
                        <a
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
                  <h3>Uploaded Files</h3>
                  <span className={`pw-lock-pill ${linksMeta.documents_locked || isQAMember ? 'locked' : 'unlocked'}`}>
                    {linksMeta.documents_locked ? (
                      <>
                        <Lock size={12} />
                        <span>
                          Files Locked • Read Only{linksMeta.documents_locked_by ? ` by ${linksMeta.documents_locked_by}` : ''}
                        </span>
                      </>
                    ) : isQAMember ? (
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
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {canLockContent && (
                    <button
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
                    <label className="pw-btn-upload-doc">
                      <Upload size={16} color="#FFFFFF" />
                      <span style={{ color: '#FFFFFF' }}>{docUploadLoading ? 'Uploading...' : 'Upload Documents'}</span>
                      <input
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
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                  Loading project documents...
                </div>
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
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
                    No Documents Uploaded Yet
                  </h4>
                  <p style={{ margin: '0 auto 16px', fontSize: '13px', color: '#64748B', maxWidth: '440px' }}>
                    {linksMeta.documents_locked
                      ? 'Document uploads are currently locked (read-only) by Project Lead or Manager.'
                      : canEditDocsAndLinks
                      ? 'Upload product specifications, test plans, architecture diagrams, or contract files for this project.'
                      : 'No documents have been uploaded for this project yet.'}
                  </p>
                  {canEditDocsAndLinks && !linksMeta.documents_locked && (
                    <label className="pw-btn-upload-doc">
                      <Upload size={16} color="#FFFFFF" />
                      <span style={{ color: '#FFFFFF' }}>{docUploadLoading ? 'Uploading...' : 'Upload Documents'}</span>
                      <input
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
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
                                {rowLocked && (
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
                              {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewDocument(doc)}
                                  className="pw-btn-doc-view"
                                  title="View document"
                                >
                                  <Eye size={13} />
                                  <span>View</span>
                                </button>
                                <button
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
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div>
                  <span>QA TESTING WORKFLOW</span>
                  <h2>Request to Start Testing</h2>
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

                <form onSubmit={handleRaiseTestingRequest} className="pw-test-req-form">
                  <div className="pw-test-req-row">
                    <div className="pw-form-group" style={{ minWidth: '180px' }}>
                      <label htmlFor="pw-testing-priority">Request Priority</label>
                      <CustomSelect
                        id="pw-testing-priority"
                        value={testingPriority}
                        onChange={setTestingPriority}
                        options={TESTING_PRIORITY_OPTIONS}
                        variant="filter"
                      />
                    </div>

                    <div className="pw-form-group" style={{ flex: 1 }}>
                      <label htmlFor="pw-testing-notes">Testing Notes / Build Details for QA Lead</label>
                      <input
                        id="pw-testing-notes"
                        type="text"
                        className="pw-input"
                        placeholder="e.g. Build v1.0 deployed on staging, credentials & test scope in Documents..."
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
                <h3>Testing Request History ({testingRequests.length})</h3>
                {testingRequestsLoading ? (
                  <p className="project-workspace-empty">Loading testing requests...</p>
                ) : testingRequests.length === 0 ? (
                  <p className="project-workspace-empty">
                    No request to start testing has been raised for this project yet.
                  </p>
                ) : (
                  <div className="pw-table-wrap">
                    <table className="pw-table">
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
            <section className="project-workspace-content">
              <div className="project-content-heading"><div><span>PROJECT CONTENTS</span><h2>Details</h2></div></div>
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
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setIsLeadModalOpen(false)}>
          <div className="pw-modal-box">
            <div className="pw-modal-header">
              <h3>Add Project Lead</h3>
              <button className="pw-modal-close" onClick={() => setIsLeadModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssignProjectLead}>
              <div className="pw-modal-body">
                {leadAssignMsg.text && (
                  <div className={`pw-alert ${leadAssignMsg.type}`}>
                    {leadAssignMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{leadAssignMsg.text}</span>
                  </div>
                )}
                <div className="pw-form-group">
                  <label>Select Project Lead *</label>
                  <CustomSelect
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
                <button type="button" className="pw-btn-secondary" onClick={() => setIsLeadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pw-btn-primary" disabled={leadAssignLoading || !selectedLeadId}>
                  {leadAssignLoading ? 'Assigning...' : 'Add Project Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Developers */}
      {isDevModalOpen && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setIsDevModalOpen(false)}>
          <div className="pw-modal-box" style={{ maxWidth: 580 }}>
            <div className="pw-modal-header">
              <h3>Add Developers to Project</h3>
              <button className="pw-modal-close" onClick={() => setIsDevModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssignDevelopers}>
              <div className="pw-modal-body">
                {devAssignMsg.text && (
                  <div className={`pw-alert ${devAssignMsg.type}`}>
                    {devAssignMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{devAssignMsg.text}</span>
                  </div>
                )}
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Select Developers</label>
                <div className="pw-dev-select-grid">
                  {availableDevs.map((dev) => {
                    const isAlready = assignedDevs.some((d) => d.developer_id === dev.id);
                    const isSelected = selectedDevIds.includes(dev.id);
                    return (
                      <div
                        key={dev.id}
                        className={`pw-dev-pick-item ${isSelected ? 'selected' : ''} ${isAlready ? 'disabled' : ''}`}
                        onClick={() => !isAlready && toggleSelectDev(dev.id)}
                      >
                        <div className="pw-dev-pick-checkbox">
                          {isSelected && <Check size={14} color="#fff" />}
                        </div>
                        <div className="pw-dev-pick-info">
                          <strong>{dev.full_name}</strong>
                          <span>{dev.email}</span>
                          {isAlready && <span className="pw-tag-already">Already on Project</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pw-modal-footer">
                <button type="button" className="pw-btn-secondary" onClick={() => setIsDevModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pw-btn-primary" disabled={devAssignLoading || selectedDevIds.length === 0}>
                  {devAssignLoading ? 'Adding...' : `Add Developers (${selectedDevIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Preview / View */}
      {previewDoc && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closePreviewModal()}>
          <div className="pw-modal-box" style={{ maxWidth: 860, width: '92%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="pw-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <FileText size={22} color="#2563EB" />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {previewDoc.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {previewDoc.file_size} &bull; Uploaded by {previewDoc.uploaded_by || 'Admin'} on {previewDoc.uploaded_at ? new Date(previewDoc.uploaded_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
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
                <button className="pw-modal-close" onClick={closePreviewModal} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}>
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
                  <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{previewDoc.name}</h4>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                    This document format ({previewDoc.file_type || previewDoc.name.split('.').pop()?.toUpperCase()}) can be opened in a browser tab or downloaded to your device for viewing with compatible software.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <a
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
