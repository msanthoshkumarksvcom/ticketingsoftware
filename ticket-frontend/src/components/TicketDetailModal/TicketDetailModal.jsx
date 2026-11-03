import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  FolderKanban,
  FileSpreadsheet,
  Upload,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Send,
  Code2,
  History,
  Check,
  AlertTriangle
} from 'lucide-react';
import './TicketDetailModal.css';

export default function TicketDetailModal({
  isOpen,
  onClose,
  ticketId,
  userRole,
  onTicketUpdated
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Available developers for assignment (for Project Lead / Admin)
  const [availableDevelopers, setAvailableDevelopers] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState('');
  const [assigningDev, setAssigningDev] = useState(false);

  // Developer Resolution Form
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [resDescription, setResDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [fixImplemented, setFixImplemented] = useState('');
  const [filesChanged, setFilesChanged] = useState('');
  const [resRemarks, setResRemarks] = useState('');
  const [resAttachments, setResAttachments] = useState([]);
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // QA Verification Form
  const [showReopenBox, setShowReopenBox] = useState(false);
  const [reopenComments, setReopenComments] = useState('');
  const [verifyingQA, setVerifyingQA] = useState(false);

  // Image Lightbox
  const [zoomImage, setZoomImage] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const resFileInputRef = useRef(null);

  const currentUserRole = userRole || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : '');
  const isDeveloper = currentUserRole === 'Developer';
  const isProjectLead = currentUserRole === 'Project Lead';
  const isQA = ['QA Member', 'QA Lead', 'Manager', 'Super Admin'].includes(currentUserRole);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
      if (!isDeveloper) {
        fetchDevelopers();
      }
    } else {
      setTicket(null);
      setShowResolutionForm(false);
      setShowReopenBox(false);
      setActionError('');
      setActionSuccess('');
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/admin/tickets/${ticketId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicket(res.data);
      if (res.data.assigned_developer_id) {
        setSelectedDevId(String(res.data.assigned_developer_id));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/developers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableDevelopers(res.data || []);
    } catch (err) {
      // quiet fallback
    }
  };

  // 1. Assign Developer
  const handleAssignDeveloper = async () => {
    if (!selectedDevId) return;
    setAssigningDev(true);
    setActionError('');
    setActionSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/admin/tickets/${ticketId}/assign-developer`,
        { developer_id: Number(selectedDevId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionSuccess(res.data.message || 'Developer assigned successfully.');
      fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to assign developer.');
    } finally {
      setAssigningDev(false);
    }
  };

  // 2. Developer starts working
  const handleStartProgress = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/admin/tickets/${ticketId}/start-progress`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionSuccess('Ticket moved to In Progress. Happy fixing!');
      fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update progress.');
    }
  };

  // 3. Resolution File Upload
  const handleResFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(
            'http://localhost:5000/api/admin/tickets/upload-image',
            { imageBase64: reader.result, filename: file.name, fileType: file.type },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setResAttachments((prev) => [...prev, res.data.url]);
        } catch (err) {
          setResAttachments((prev) => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 4. Developer Submits Resolution
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!resDescription.trim() || !rootCause.trim() || !fixImplemented.trim() || !resRemarks.trim()) {
      setActionError('All mandatory fields (Description, Root Cause, Fix, Remarks) must be filled.');
      return;
    }

    setSubmittingResolution(true);
    setActionError('');
    setActionSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        resolution_description: resDescription.trim(),
        root_cause: rootCause.trim(),
        fix_implemented: fixImplemented.trim(),
        files_changed: filesChanged.trim(),
        resolution_remarks: resRemarks.trim(),
        resolution_attachments: resAttachments
      };

      const res = await axios.put(
        `http://localhost:5000/api/admin/tickets/${ticketId}/resolve`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActionSuccess('Resolution submitted! Ticket is now pending QA verification.');
      setShowResolutionForm(false);
      fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to submit resolution.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // 5. QA Verification
  const handleQAVerify = async (action) => {
    if (action === 'reopen' && !reopenComments.trim()) {
      setActionError('Please provide a comment explaining why the fix was rejected.');
      return;
    }

    setVerifyingQA(true);
    setActionError('');
    setActionSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/admin/tickets/${ticketId}/verify-qa`,
        { action, reopen_comments: reopenComments.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActionSuccess(res.data.message || (action === 'approve' ? 'Ticket closed.' : 'Ticket reopened.'));
      setShowReopenBox(false);
      setReopenComments('');
      fetchTicketDetails();
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      setActionError(err.response?.data?.error || 'QA verification failed.');
    } finally {
      setVerifyingQA(false);
    }
  };

  if (!isOpen) return null;

  const attachmentsList = Array.isArray(ticket?.attachments) ? ticket.attachments : [];
  const resolutionAttachmentsList = Array.isArray(ticket?.resolution_attachments) ? ticket.resolution_attachments : [];

  return (
    <div className="tdm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tdm-card">
        {/* Modal Top Header */}
        <div className="tdm-header">
          <div className="tdm-header-left">
            <span className="tdm-badge-ticket-code">{ticket?.ticket_code || 'BUG TICKET'}</span>
            <span className={`tdm-status-pill ${(ticket?.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
              {ticket?.status || 'Open'}
            </span>
            <span className={`tdm-sev-pill ${(ticket?.severity || 'medium').toLowerCase()}`}>
              {ticket?.severity || 'Medium'} Severity
            </span>
          </div>
          <button type="button" className="tdm-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tdm-body">
          {loading ? (
            <div className="tdm-loading-state">
              <Clock className="tdm-spin" size={24} />
              <span>Loading defect ticket details...</span>
            </div>
          ) : error ? (
            <div className="tdm-error-state">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : ticket ? (
            <div className="tdm-content-grid">
              {/* Left Column: Defect Information */}
              <div className="tdm-main-col">
                {actionError && (
                  <div className="tdm-alert-box error">
                    <AlertCircle size={16} />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="tdm-alert-box success">
                    <CheckCircle2 size={16} />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Bug Title & Scope */}
                <div className="tdm-title-block">
                  <h1>{ticket.title}</h1>
                  <div className="tdm-meta-tags">
                    <span><FolderKanban size={13} /> {ticket.project_name || ticket.project_code}</span>
                    <span>&bull; Module: <strong>{ticket.module || 'General'}</strong></span>
                    {ticket.sub_module && <span>&bull; Screen: <strong>{ticket.sub_module}</strong></span>}
                    <span>&bull; Category: <strong>{ticket.category || 'Functional Bug'}</strong></span>
                  </div>
                </div>

                {/* Test Case Context Specification */}
                <div className="tdm-section-card">
                  <div className="tdm-section-title">
                    <FileSpreadsheet size={15} color="#2563EB" />
                    <span>Failed Test Case Context (Read-Only)</span>
                    <span className="tdm-tc-id-pill">{ticket.test_case_id || 'TC'}</span>
                  </div>
                  <div className="tdm-tc-details">
                    <div className="tdm-tc-row">
                      <strong>Test Scenario:</strong>
                      <span>{ticket.test_scenario || ticket.title}</span>
                    </div>
                    {ticket.test_steps && (
                      <div className="tdm-tc-row">
                        <strong>Test Steps:</strong>
                        <pre className="tdm-pre">{ticket.test_steps}</pre>
                      </div>
                    )}
                    <div className="tdm-tc-row">
                      <strong>Expected Result:</strong>
                      <div className="tdm-res-box expected">{ticket.expected_result || 'Expected behavior'}</div>
                    </div>
                    <div className="tdm-tc-row">
                      <strong>Actual Result:</strong>
                      <div className="tdm-res-box actual">{ticket.actual_result || ticket.description || 'Observed failure'}</div>
                    </div>
                  </div>
                </div>

                {/* Original Defect Description */}
                {ticket.description && (
                  <div className="tdm-section-card">
                    <div className="tdm-section-title">
                      <AlertCircle size={15} color="#DC2626" />
                      <span>Bug Description & Reproduction Notes</span>
                    </div>
                    <p className="tdm-description-text">{ticket.description}</p>
                  </div>
                )}

                {/* Screenshots & Evidence Attachments */}
                <div className="tdm-section-card">
                  <div className="tdm-section-title">
                    <Maximize2 size={15} color="#475569" />
                    <span>Screenshots & Defect Proof ({attachmentsList.length})</span>
                  </div>
                  {attachmentsList.length === 0 ? (
                    <div className="tdm-empty-attachments">No screenshots attached to this ticket.</div>
                  ) : (
                    <div className="tdm-evidence-strip">
                      {attachmentsList.map((url, idx) => (
                        <div key={idx} className="tdm-evidence-thumb-box" onClick={() => setZoomImage(url)}>
                          <img src={url} alt={`Evidence ${idx + 1}`} className="tdm-evidence-thumb" />
                          <div className="tdm-evidence-zoom-hover">
                            <Maximize2 size={13} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Developer Resolution Section */}
                {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                  <div className="tdm-section-card tdm-resolution-card">
                    <div className="tdm-section-title">
                      <CheckCircle2 size={15} color="#16A34A" />
                      <span>Engineering Resolution Details</span>
                      <span className="tdm-res-badge">Resolved by {ticket.resolved_by || 'Developer'}</span>
                    </div>
                    <div className="tdm-resolution-view">
                      <div className="tdm-res-field">
                        <label>Root Cause</label>
                        <p>{ticket.root_cause || 'Identified and fixed.'}</p>
                      </div>
                      <div className="tdm-res-field">
                        <label>Fix Implemented</label>
                        <p>{ticket.fix_implemented || 'Code patch applied.'}</p>
                      </div>
                      <div className="tdm-res-field">
                        <label>Resolution Remarks & Verification Notes</label>
                        <p>{ticket.resolution_remarks || ticket.resolution_description || 'Ready for QA verification.'}</p>
                      </div>
                      {ticket.files_changed && (
                        <div className="tdm-res-field">
                          <label>Files / Components Changed</label>
                          <code>{ticket.files_changed}</code>
                        </div>
                      )}
                      {resolutionAttachmentsList.length > 0 && (
                        <div className="tdm-res-field">
                          <label>Resolution Evidence / Proof Screenshots</label>
                          <div className="tdm-evidence-strip">
                            {resolutionAttachmentsList.map((url, idx) => (
                              <div key={idx} className="tdm-evidence-thumb-box" onClick={() => setZoomImage(url)}>
                                <img src={url} alt="Fix Evidence" className="tdm-evidence-thumb" />
                                <div className="tdm-evidence-zoom-hover"><Maximize2 size={13} /></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* DEVELOPER ACTION: Resolution Form */}
                {isDeveloper && (ticket.status === 'In Progress' || ticket.status === 'Reopened') && showResolutionForm && (
                  <div className="tdm-section-card tdm-form-card">
                    <div className="tdm-section-title">
                      <Code2 size={15} color="#2563EB" />
                      <span>Submit Resolution Details (Mandatory)</span>
                    </div>
                    <form onSubmit={handleSubmitResolution} className="tdm-resolution-form">
                      <div className="tdm-form-group">
                        <label>Root Cause *</label>
                        <input
                          type="text"
                          className="tdm-input"
                          value={rootCause}
                          onChange={(e) => setRootCause(e.target.value)}
                          placeholder="e.g. Unhandled null response from auth token service"
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label>Fix Implemented *</label>
                        <textarea
                          rows={2}
                          className="tdm-textarea"
                          value={fixImplemented}
                          onChange={(e) => setFixImplemented(e.target.value)}
                          placeholder="Describe the code solution implemented..."
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label>Files / Components Changed</label>
                        <input
                          type="text"
                          className="tdm-input"
                          value={filesChanged}
                          onChange={(e) => setFilesChanged(e.target.value)}
                          placeholder="e.g. src/auth/loginService.js, src/components/LoginForm.jsx"
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label>Resolution Description & Verification Instructions *</label>
                        <textarea
                          rows={2}
                          className="tdm-textarea"
                          value={resDescription}
                          onChange={(e) => setResDescription(e.target.value)}
                          placeholder="Detailed instructions for QA verification..."
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label>Resolution Remarks *</label>
                        <input
                          type="text"
                          className="tdm-input"
                          value={resRemarks}
                          onChange={(e) => setResRemarks(e.target.value)}
                          placeholder="e.g. Verified locally on build v1.4.0 with regression tests passing"
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label>Resolution Screenshot (Optional)</label>
                        <input
                          type="file"
                          ref={resFileInputRef}
                          multiple
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleResFileUpload}
                        />
                        <button
                          type="button"
                          className="tdm-upload-proof-btn"
                          onClick={() => resFileInputRef.current?.click()}
                        >
                          <Upload size={14} />
                          <span>Attach Fix Screenshot</span>
                        </button>
                        {resAttachments.length > 0 && (
                          <div className="tdm-evidence-strip" style={{ marginTop: 8 }}>
                            {resAttachments.map((url, i) => (
                              <img key={i} src={url} alt="proof" className="tdm-evidence-thumb" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="tdm-form-actions">
                        <button
                          type="button"
                          className="tdm-btn-secondary"
                          onClick={() => setShowResolutionForm(false)}
                          disabled={submittingResolution}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="tdm-btn-primary"
                          disabled={submittingResolution}
                        >
                          <CheckCircle2 size={15} />
                          <span>{submittingResolution ? 'Submitting...' : 'Submit to QA for Verification'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* QA ACTION: Reopen Comment Box */}
                {isQA && ticket.status === 'Resolved' && showReopenBox && (
                  <div className="tdm-section-card tdm-reopen-card">
                    <div className="tdm-section-title">
                      <RotateCcw size={15} color="#DC2626" />
                      <span>Reopen Ticket (Provide Verification Failure Details)</span>
                    </div>
                    <div className="tdm-reopen-form">
                      <textarea
                        rows={3}
                        className="tdm-textarea"
                        value={reopenComments}
                        onChange={(e) => setReopenComments(e.target.value)}
                        placeholder="Explain why the fix did not resolve the defect during re-testing..."
                      />
                      <div className="tdm-form-actions">
                        <button
                          type="button"
                          className="tdm-btn-secondary"
                          onClick={() => setShowReopenBox(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="tdm-btn-danger"
                          onClick={() => handleQAVerify('reopen')}
                          disabled={verifyingQA || !reopenComments.trim()}
                        >
                          <RotateCcw size={14} />
                          <span>{verifyingQA ? 'Reopening...' : 'Confirm Reopen Ticket'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar: Assignment & Status Actions */}
              <div className="tdm-side-col">
                {/* 1. Developer Assignment Panel (Project Lead / Manager) */}
                {!isDeveloper && (
                  <div className="tdm-side-card">
                    <h3>Assigned Developer</h3>
                    <div className="tdm-assign-box">
                      <select
                        className="tdm-select"
                        value={selectedDevId}
                        onChange={(e) => setSelectedDevId(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {availableDevelopers.map((dev) => (
                          <option key={dev.id} value={dev.id}>
                            {dev.full_name} ({dev.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="tdm-btn-assign"
                        onClick={handleAssignDeveloper}
                        disabled={assigningDev || !selectedDevId || selectedDevId === String(ticket.assigned_developer_id)}
                      >
                        {assigningDev ? 'Saving...' : 'Assign'}
                      </button>
                    </div>
                    {ticket.assigned_to && ticket.assigned_to !== 'Unassigned' && (
                      <div className="tdm-assigned-info">
                        <User size={13} />
                        <span>Currently: <strong>{ticket.assigned_to}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Actions Card for Developer */}
                {isDeveloper && (
                  <div className="tdm-side-card">
                    <h3>Developer Actions</h3>
                    {ticket.status === 'Open' || ticket.status === 'Reopened' ? (
                      <button
                        type="button"
                        className="tdm-btn-action-primary"
                        onClick={handleStartProgress}
                      >
                        <Clock size={16} />
                        <span>Start Working (In Progress)</span>
                      </button>
                    ) : ticket.status === 'In Progress' ? (
                      !showResolutionForm && (
                        <button
                          type="button"
                          className="tdm-btn-action-resolve"
                          onClick={() => setShowResolutionForm(true)}
                        >
                          <CheckCircle2 size={16} />
                          <span>Mark as Resolved</span>
                        </button>
                      )
                    ) : ticket.status === 'Resolved' ? (
                      <div className="tdm-status-notice">
                        <ShieldCheck size={16} color="#2563EB" />
                        <span>Submitted for QA Verification. Awaiting QA review.</span>
                      </div>
                    ) : (
                      <div className="tdm-status-notice closed">
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span>This defect is verified and closed.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Actions Card for QA (Verification) */}
                {isQA && ticket.status === 'Resolved' && (
                  <div className="tdm-side-card tdm-qa-card">
                    <h3>QA Verification Actions</h3>
                    <p className="tdm-side-subtext">The developer submitted a fix. Re-test and sign off.</p>
                    <div className="tdm-qa-btn-group">
                      <button
                        type="button"
                        className="tdm-btn-qa-approve"
                        onClick={() => handleQAVerify('approve')}
                        disabled={verifyingQA}
                      >
                        <ShieldCheck size={16} />
                        <span>{verifyingQA ? 'Verifying...' : 'Approve & Close Ticket'}</span>
                      </button>
                      <button
                        type="button"
                        className="tdm-btn-qa-reopen"
                        onClick={() => setShowReopenBox(true)}
                        disabled={verifyingQA}
                      >
                        <RotateCcw size={15} />
                        <span>Reject & Reopen Bug</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Ticket Metadata Card */}
                <div className="tdm-side-card">
                  <h3>Ticket Metadata</h3>
                  <div className="tdm-meta-list">
                    <div><span>Project:</span> <strong>{ticket.project_name || ticket.project_code}</strong></div>
                    <div><span>Reported By:</span> <strong>{ticket.raised_by || ticket.reporter || 'QA Member'}</strong></div>
                    <div><span>Reported Date:</span> <strong>{new Date(ticket.created_at).toLocaleDateString()}</strong></div>
                    <div><span>Priority:</span> <strong>{ticket.priority || 'Medium'}</strong></div>
                    <div><span>Severity:</span> <strong>{ticket.severity || 'Medium'}</strong></div>
                    {ticket.closed_by && <div><span>Closed By:</span> <strong>{ticket.closed_by}</strong></div>}
                  </div>
                </div>

                {/* 5. Ticket Activity / History Timeline */}
                <div className="tdm-side-card">
                  <div className="tdm-side-title-row">
                    <History size={14} />
                    <h3>Activity & History ({ticket.history?.length || 0})</h3>
                  </div>
                  <div className="tdm-history-timeline">
                    {ticket.history?.length ? (
                      ticket.history.map((h, i) => (
                        <div key={i} className="tdm-history-item">
                          <span className="tdm-history-dot" />
                          <div className="tdm-history-body">
                            <span className="tdm-history-action">{h.action}</span>
                            <span className="tdm-history-user">{h.performed_by} &bull; {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {h.details && <p className="tdm-history-details">{h.details}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="tdm-side-subtext">No historical events recorded.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Lightbox Zoom */}
      {zoomImage && (
        <div className="tdm-zoom-lightbox" onClick={() => setZoomImage(null)}>
          <div className="tdm-zoom-content" onClick={(e) => e.stopPropagation()}>
            <img src={zoomImage} alt="Enlarged screenshot" className="tdm-zoom-img" />
            <button type="button" className="tdm-zoom-close" onClick={() => setZoomImage(null)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

