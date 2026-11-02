import { useEffect, useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import './AdminProjectWorkspace.css';

const WORKSPACE_FOLDERS = [
  { id: 'sheet', label: 'Sheet', detail: 'Project test sheets', icon: FileSpreadsheet },
  { id: 'tickets', label: 'Tickets', detail: 'Issues for this project', icon: Ticket },
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    axios.get('http://localhost:5000/api/admin/projects', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      const matchingProject = data.find((item) => String(item.id) === String(projectId) || item.project_code === projectId);
      if (matchingProject) {
        setProject(matchingProject);
      } else if (!project) {
        setProject({
          id: projectId,
          project_code: `PRJ-${projectId}`,
          name: 'QA Project Workspace',
          department: 'Quality Assurance',
          status: 'In Progress',
          team_members: 4,
          test_cases: 25,
          documents: 5,
          tickets_count: 0
        });
      }
    }).catch((error) => {
      console.warn('Could not refresh project details:', error.message);
      if (!project) {
        setProject({
          id: projectId,
          project_code: `PRJ-${projectId}`,
          name: 'QA Project Workspace',
          department: 'Quality Assurance',
          status: 'In Progress'
        });
      }
    }).finally(() => {
      setLoading(false);
    });

    axios.get('http://localhost:5000/api/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setTickets(data.filter((ticket) => ticket.project_code === project?.project_code || String(ticket.project_id) === String(projectId)));
    }).catch(() => {
      setTicketsUnavailable(true);
    });
  }, [projectId, project?.project_code]);

  const openFolder = (folderId) => {
    if (folderId === 'sheet') {
      navigate(`/admin/projects/${projectId}/sheet`, { state: { project: project || { id: projectId, project_code: `PRJ-${projectId}` } } });
      return;
    }
    setActiveFolder(folderId);
  };

  const formatDate = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDepartment');
    navigate('/', { replace: true });
  };

  const logoutConfirmation = showLogoutModal && (
    <div className="modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setShowLogoutModal(false);
    }}>
      <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="project-logout-title">
        <div className="modal-icon"><LogOut size={21} /></div>
        <h2 className="modal-title" id="project-logout-title">Sign out of your workspace?</h2>
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
  );

  if (loading && !project) {
    return (
      <div className="admin-layout">
        {logoutConfirmation}
        <AdminSidebar onLogout={() => setShowLogoutModal(true)} />
        <div className="main-content">
          <main className="project-workspace">
            <button className="project-workspace-back" onClick={() => navigate('/admin/projects')}>
              <ArrowLeft size={16} /> Projects
            </button>
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#627780' }}>
              Loading project workspace...
            </div>
          </main>
        </div>
      </div>
    );
  }

  const activeProject = project || {
    id: projectId,
    project_code: `PRJ-${projectId}`,
    name: 'QA Project Workspace',
    department: 'Quality Assurance',
    status: 'In Progress'
  };

  return (
    <div className="admin-layout">
      {logoutConfirmation}
      <AdminSidebar onLogout={() => setShowLogoutModal(true)} />
      <div className="main-content">
        <main className="project-workspace">
          <header className="project-workspace-header">
            <button className="project-workspace-back" onClick={() => navigate('/admin/projects')}>
              <ArrowLeft size={16} /> Projects
            </button>
            <div className="project-workspace-title">
              <span className="project-workspace-code">{activeProject.project_code}</span>
              <h1>{activeProject.name}</h1>
              <p>{activeProject.department || 'Department not set'} · {activeProject.status || 'Status not set'}</p>
            </div>
          </header>

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

          {activeFolder === 'sheet' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Test Execution & Sheets</h2></div>
                <button
                  className="pj-btn-primary"
                  onClick={() => navigate(`/admin/projects/${projectId}/sheet`, { state: { project: activeProject } })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0F9D58', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  <FileSpreadsheet size={16} />
                  <span>Open Google Sheets Workspace</span>
                </button>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dce5e7', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', margin: '16px 0' }}>
                <FileSpreadsheet size={46} color="#0F9D58" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Google Sheets-Style Test Workbook</h3>
                <p style={{ color: '#52717b', fontSize: '14px', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Access multiple sheet tabs, test case execution matrix, screenshot proof column, copy-paste across rows & columns, and automated status calculations.
                </p>
                <button
                  onClick={() => navigate(`/admin/projects/${projectId}/sheet`, { state: { project: activeProject } })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: '#0F9D58', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  <ExternalLink size={16} />
                  <span>Launch Full Sheet Workspace</span>
                </button>
              </div>
            </section>
          )}

          {activeFolder === 'tickets' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Tickets</h2></div>
                <strong>{ticketsUnavailable ? activeProject.tickets_count || 0 : tickets.length} total</strong>
              </div>
              {ticketsUnavailable ? (
                <p className="project-workspace-empty">Ticket details are unavailable right now. The project record tracks {activeProject.tickets_count || 0} tickets.</p>
              ) : tickets.length ? (
                <div className="project-ticket-list">
                  {tickets.map((ticket) => (
                    <article className="project-ticket-row" key={ticket.id}>
                      <div><strong>{ticket.title}</strong><span>{ticket.ticket_code} · {ticket.type || 'Ticket'}</span></div>
                      <span className={`project-ticket-status ${String(ticket.status || '').toLowerCase().replaceAll(' ', '-')}`}>{ticket.status}</span>
                    </article>
                  ))}
                </div>
              ) : <p className="project-workspace-empty">No tickets are linked to this project yet.</p>}
            </section>
          )}

          {activeFolder === 'documents' && (
            <section className="project-workspace-content">
              <div className="project-content-heading">
                <div><span>PROJECT CONTENTS</span><h2>Documents</h2></div>
                <strong>{activeProject.documents || 0} tracked</strong>
              </div>
              <p className="project-workspace-empty">This project tracks {activeProject.documents || 0} documents. Individual document files are not available in the current project data.</p>
            </section>
          )}

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
    </div>
  );
}
