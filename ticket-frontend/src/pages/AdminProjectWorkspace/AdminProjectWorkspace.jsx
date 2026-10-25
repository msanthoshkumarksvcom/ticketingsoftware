import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Folder,
  Ticket,
  Users
} from 'lucide-react';
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
  const [tickets, setTickets] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [ticketsUnavailable, setTicketsUnavailable] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios.get('http://localhost:5000/api/admin/projects', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      const matchingProject = data.find((item) => String(item.id) === String(projectId));
      if (matchingProject) setProject(matchingProject);
    }).catch((error) => {
      console.warn('Could not refresh project details:', error.message);
    });

    axios.get('http://localhost:5000/api/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setTickets(data.filter((ticket) => ticket.project_code === project?.project_code));
    }).catch(() => {
      setTicketsUnavailable(true);
    });
  }, [projectId, project?.project_code]);

  const openFolder = (folderId) => {
    if (folderId === 'sheet') {
      navigate(`/admin/projects/${projectId}/sheet`, { state: { project } });
      return;
    }
    setActiveFolder(folderId);
  };

  const formatDate = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  if (!project) {
    return (
      <main className="project-workspace">
        <button className="project-workspace-back" onClick={() => navigate('/admin/projects')}>
          <ArrowLeft size={16} /> Projects
        </button>
        <p className="project-workspace-empty">Project details are unavailable. Return to Projects and open it again.</p>
      </main>
    );
  }

  return (
    <main className="project-workspace">
      <header className="project-workspace-header">
        <button className="project-workspace-back" onClick={() => navigate('/admin/projects')}>
          <ArrowLeft size={16} /> Projects
        </button>
        <div className="project-workspace-title">
          <span className="project-workspace-code">{project.project_code}</span>
          <h1>{project.name}</h1>
          <p>{project.department || 'Department not set'} · {project.status || 'Status not set'}</p>
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

      {activeFolder === 'tickets' && (
        <section className="project-workspace-content">
          <div className="project-content-heading">
            <div><span>PROJECT CONTENTS</span><h2>Tickets</h2></div>
            <strong>{ticketsUnavailable ? project.tickets_count || 0 : tickets.length} total</strong>
          </div>
          {ticketsUnavailable ? (
            <p className="project-workspace-empty">Ticket details are unavailable right now. The project record tracks {project.tickets_count || 0} tickets.</p>
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
            <strong>{project.documents || 0} tracked</strong>
          </div>
          <p className="project-workspace-empty">This project tracks {project.documents || 0} documents. Individual document files are not available in the current project data.</p>
        </section>
      )}

      {activeFolder === 'details' && (
        <section className="project-workspace-content">
          <div className="project-content-heading"><div><span>PROJECT CONTENTS</span><h2>Details</h2></div></div>
          <dl className="project-details-grid">
            <div><dt>Project code</dt><dd>{project.project_code || 'Not set'}</dd></div>
            <div><dt>Project lead</dt><dd>{project.lead_name || 'Not assigned'}</dd></div>
            <div><dt>Department</dt><dd>{project.department || 'Not set'}</dd></div>
            <div><dt>Status</dt><dd>{project.status || 'Not set'}</dd></div>
            <div><dt>Start date</dt><dd><CalendarDays size={15} />{formatDate(project.start_date)}</dd></div>
            <div><dt>Team members</dt><dd><Users size={15} />{project.team_members ?? 0}</dd></div>
            <div className="project-details-description"><dt>Description</dt><dd>{project.description || 'No description has been added.'}</dd></div>
          </dl>
        </section>
      )}
    </main>
  );
}