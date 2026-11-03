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
  Check
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import RoleSidebar from '../../components/RoleSidebar/RoleSidebar';
import TicketDetailModal from '../../components/TicketDetailModal/TicketDetailModal';
import './AdminProjectWorkspace.css';

const WORKSPACE_FOLDERS = [
  { id: 'sheet', label: 'Sheet', detail: 'Project test sheets', icon: FileSpreadsheet },
  { id: 'tickets', label: 'Tickets', detail: 'Issues for this project', icon: Ticket },
  { id: 'lead', label: 'Project Lead', detail: 'Lead allocation & history', icon: ShieldCheck },
  { id: 'developers', label: 'Developers', detail: 'Assigned engineering devs', icon: Users },
  { id: 'documents', label: 'Documents', detail: 'Project document record', icon: FileText },
  { id: 'details', label: 'Details', detail: 'Project information', icon: Folder }
];

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

  // Lead Assignment State
  const [leadHistory, setLeadHistory] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadAssignNotes, setLeadAssignNotes] = useState('');
  const [leadAssignLoading, setLeadAssignLoading] = useState(false);
  const [leadAssignMsg, setLeadAssignMsg] = useState({ text: '', type: '' });

  // Developer Assignment State
  const [assignedDevs, setAssignedDevs] = useState([]);
  const [availableDevs, setAvailableDevs] = useState([]);
  const [devHistory, setDevHistory] = useState([]);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [selectedDevIds, setSelectedDevIds] = useState([]);
  const [devAssignNotes, setDevAssignNotes] = useState('');
  const [devAssignLoading, setDevAssignLoading] = useState(false);
  const [devAssignMsg, setDevAssignMsg] = useState({ text: '', type: '' });

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
      setAvailableLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
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
      fetchTickets()
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
    setActiveFolder(folderId);
  };

  const handleAssignProjectLead = async (e) => {
    e.preventDefault();
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
        { project_lead_id: selectedLeadId, notes: leadAssignNotes },
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
        { developer_ids: selectedDevIds, notes: devAssignNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDevAssignMsg({ text: 'Developers assigned successfully!', type: 'success' });
      await Promise.all([fetchDevsAndHistory(), fetchProjectData()]);
      setSelectedDevIds([]);
      setDevAssignNotes('');
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

  const formatDate = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const activeProject = project || {
    id: projectId,
    project_code: `PRJ-${projectId}`,
    name: 'QA Project Workspace',
    department: 'Quality Assurance',
    status: 'In Progress'
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
              <p>{activeProject.department || 'Quality Assurance'} &bull; {activeProject.status || 'Active'}</p>
            </div>
          </header>

          {/* Folder tabs */}
          <section className="project-workspace-folders" aria-label="Project folders">
            {WORKSPACE_FOLDERS.map(({ id, label, detail, icon: Icon }) => (
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
                {!isDeveloper && (
                  <button
                    className="pw-btn-action-primary"
                    onClick={() => {
                      setSelectedLeadId(activeProject.project_lead_id || '');
                      setIsLeadModalOpen(true);
                    }}
                  >
                    <UserCheck size={15} />
                    <span>{activeProject.project_lead_id ? 'Change Project Lead' : 'Assign Project Lead'}</span>
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
                    <span>Project Code: <strong>{activeProject.project_code}</strong></span>
                    <span>Status: <strong>{activeProject.status || 'Active'}</strong></span>
                    {activeProject.lead_assigned_at && (
                      <span>Assigned on: <strong>{new Date(activeProject.lead_assigned_at).toLocaleDateString()}</strong></span>
                    )}
                    {activeProject.lead_assigned_by && (
                      <span>Assigned by: <strong>{activeProject.lead_assigned_by}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lead Assignment History */}
              <div className="pw-section-sub">
                <h3><History size={15} /> Assignment History</h3>
                {leadHistory.length === 0 ? (
                  <p className="project-workspace-empty">No previous lead assignment history recorded for this project.</p>
                ) : (
                  <div className="pw-table-wrap">
                    <table className="pw-table">
                      <thead>
                        <tr>
                          <th>Project Lead</th>
                          <th>Email</th>
                          <th>Assigned By</th>
                          <th>Assigned Date</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadHistory.map((h) => (
                          <tr key={h.id}>
                            <td><strong>{h.project_lead_name}</strong></td>
                            <td>{h.project_lead_email}</td>
                            <td>{h.assigned_by}</td>
                            <td>{new Date(h.assigned_at).toLocaleDateString()}</td>
                            <td>{h.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 4: Developer Assignment (Section 4) */}
          {activeFolder === 'developers' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>ENGINEERING ALLOCATION</span><h2>Assigned Developers</h2></div>
                {!isDeveloper && (
                  <button
                    className="pw-btn-action-primary"
                    onClick={() => {
                      setSelectedDevIds([]);
                      setIsDevModalOpen(true);
                    }}
                  >
                    <UserPlus size={15} />
                    <span>Assign Developer</span>
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
                        <small>Assigned by {d.assigned_by} on {new Date(d.assigned_at).toLocaleDateString()}</small>
                      </div>
                      {!isDeveloper && (
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

              {/* Developer Assignment History */}
              <div className="pw-section-sub" style={{ marginTop: 24 }}>
                <h3><History size={15} /> Developer Assignment History</h3>
                {devHistory.length === 0 ? (
                  <p className="project-workspace-empty">No developer assignment history recorded yet.</p>
                ) : (
                  <div className="pw-table-wrap">
                    <table className="pw-table">
                      <thead>
                        <tr>
                          <th>Developer</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Assigned By</th>
                          <th>Assigned Date</th>
                          <th>Notes</th>
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
                            <td>{new Date(h.assigned_at).toLocaleDateString()}</td>
                            <td>{h.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 5: Documents */}
          {activeFolder === 'documents' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Documents</h2></div>
                <strong>{activeProject.documents || 0} tracked</strong>
              </div>
              <p className="project-workspace-empty">This project tracks {activeProject.documents || 0} documents. Individual document files are not available in the current project data.</p>
            </section>
          )}

          {/* Tab 6: Details */}
          {activeFolder === 'details' && (
            <section className="project-workspace-content">
              <div className="project-content-heading"><div><span>PROJECT CONTENTS</span><h2>Details</h2></div></div>
              <dl className="project-details-grid">
                <div><dt>Project code</dt><dd>{activeProject.project_code || 'Not set'}</dd></div>
                <div><dt>Project lead</dt><dd>{activeProject.lead_name || 'Not assigned'}</dd></div>
                <div><dt>Department</dt><dd>{activeProject.department || 'Not set'}</dd></div>
                <div><dt>Status</dt><dd>{activeProject.status || 'Not set'}</dd></div>
                <div><dt>Start date</dt><dd><CalendarDays size={15} />{formatDate(activeProject.start_date)}</dd></div>
                <div><dt>Team members</dt><dd><Users size={15} />{activeProject.team_members ?? 0}</dd></div>
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
              <h3>Assign Project Lead</h3>
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
                  <select
                    className="pw-select"
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Project Lead --</option>
                    {availableLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.full_name} ({lead.email}) {lead.emp_id ? `[${lead.emp_id}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pw-form-group">
                  <label>Assignment Notes (Optional)</label>
                  <textarea
                    className="pw-textarea"
                    placeholder="Provide any context or reason for this lead assignment..."
                    value={leadAssignNotes}
                    onChange={(e) => setLeadAssignNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="pw-modal-footer">
                <button type="button" className="pw-btn-secondary" onClick={() => setIsLeadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pw-btn-primary" disabled={leadAssignLoading || !selectedLeadId}>
                  {leadAssignLoading ? 'Assigning...' : 'Confirm Assignment'}
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
              <h3>Assign Developers to Project</h3>
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
                <div className="pw-form-group" style={{ marginTop: 14 }}>
                  <label>Assignment Notes (Optional)</label>
                  <input
                    type="text"
                    className="pw-input"
                    placeholder="e.g. Assigned to frontend bug triage"
                    value={devAssignNotes}
                    onChange={(e) => setDevAssignNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="pw-modal-footer">
                <button type="button" className="pw-btn-secondary" onClick={() => setIsDevModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pw-btn-primary" disabled={devAssignLoading || selectedDevIds.length === 0}>
                  {devAssignLoading ? 'Assigning...' : `Assign ${selectedDevIds.length} Developer(s)`}
                </button>
              </div>
            </form>
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
