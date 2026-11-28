import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
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
  AlertTriangle,
  Lock,
  Eye,
  Play,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { INPUT_LIMITS, validateFields, validateMeaningfulText } from '../../utils/inputValidation';
import { formatIndianDate, formatIndianDateTime, formatIndianTime } from '../../utils/dateFormat';
import {
  getFullMediaUrl,
  normalizeMediaItem,
  validateMediaFile,
  readFileAsDataUrl
} from '../../utils/mediaPreview';
import {
  TICKET_WORK_LOCK_HOURS,
  isTicketLockedByMe,
  isTicketLockedByOther,
  isTicketLockExpired,
  getTicketLockRemainingLabel
} from '../../utils/ticketLock';
import SkeletonLoader from '../SkeletonLoader/SkeletonLoader';
import UniversalFileViewer from '../UniversalFileViewer/UniversalFileViewer';
import './TicketDetailModal.css';
import { API_BASE, SOCKET_URL } from '../../utils/apiConfig';

// Prepend backend host for relative media uploads so they never break
export const getFullImageUrl = getFullMediaUrl;

export default function TicketDetailModal({
  isOpen,
  onClose,
  ticketId,
  userRole,
  onTicketUpdated,
  onTicketDeleted
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Developer Resolution Form
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [resDescription, setResDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [fixImplemented, setFixImplemented] = useState('');
  const [filesChanged, setFilesChanged] = useState('');
  const [resRemarks, setResRemarks] = useState('');
  const [resAttachments, setResAttachments] = useState([]);
  const [uploadingResMedia, setUploadingResMedia] = useState(false);
  const [uploadResError, setUploadResError] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // QA Verification Form
  const [showReopenBox, setShowReopenBox] = useState(false);
  const [reopenComments, setReopenComments] = useState('');
  const [verifyingQA, setVerifyingQA] = useState(false);

  // Media Lightbox ({ url, mediaType, name })
  const [zoomMedia, setZoomMedia] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [otherDeveloperTyping, setOtherDeveloperTyping] = useState(null);
  const resFileInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);

  const currentUserRole = String(userRole || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : '') || '').trim();
  const currentUserId = Number(localStorage.getItem('userId')) || null;
  const currentUserName = localStorage.getItem('userName') || 'Developer';
  const isDeveloper = currentUserRole.toLowerCase() === 'developer';
  const isProjectLead = currentUserRole.toLowerCase() === 'project lead';
  const canResolveTicket = isDeveloper || isProjectLead;
  const isQA = ['qa member', 'qa lead', 'manager', 'super admin', 'admin', 'administrator'].includes(currentUserRole.toLowerCase());
  const isQAMember = currentUserRole.toLowerCase() === 'qa member';
  const [deletingTicket, setDeletingTicket] = useState(false);

  const isLockedByMe = isTicketLockedByMe(ticket, currentUserId, currentUserName);
  const isLockedByOther = isTicketLockedByOther(ticket, currentUserId, currentUserName);
  const isExpiredLock = isTicketLockExpired(ticket);
  const lockRemainingLabel = getTicketLockRemainingLabel(ticket);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();

      // Connect to Socket.IO for real-time developer lock & intimation
      const socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        timeout: 5000
      });
      socketRef.current = socket;

      socket.emit('join_ticket_room', {
        ticketId,
        user: { id: currentUserId, name: currentUserName }
      });

      socket.on('ticket_lock_changed', (data) => {
        if (String(data.ticketId) === String(ticketId)) {
          setTicket((prev) => prev ? {
            ...prev,
            locked_by: data.locked_by,
            locked_by_id: data.locked_by_id,
            locked_at: data.locked_at,
            status: data.status || prev.status
          } : prev);
        }
      });

      socket.on('ticket_resolving_typing', (data) => {
        if (String(data.ticketId) === String(ticketId) && Number(data.user?.id) !== currentUserId) {
          setOtherDeveloperTyping(data.user?.name || 'Another developer');
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => {
            setOtherDeveloperTyping(null);
          }, 3500);
        }
      });

      return () => {
        socket.emit('leave_ticket_room', { ticketId });
        socket.disconnect();
      };
    } else {
      setTicket(null);
      setShowResolutionForm(false);
      setShowReopenBox(false);
      setActionError('');
      setActionSuccess('');
      setOtherDeveloperTyping(null);
    }
  }, [isOpen, ticketId, currentUserId, currentUserName]);

  // Emit typing event to intimate other developers in real time
  const notifyTyping = (field) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('ticket_resolving_typing', {
        ticketId,
        user: { id: currentUserId, name: currentUserName },
        field
      });
    }
  };

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/admin/tickets/${ticketId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicket(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  // Developer starts resolving & claims exclusive lock
  const handleStartResolving = async () => {
    setActionError('');
    setActionSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/admin/tickets/${ticketId}/lock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data.ticket);
      setShowResolutionForm(true);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('ticket_resolving_claim', {
          ticketId,
          user: { id: currentUserId, name: currentUserName }
        });
      }
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      if (err.response?.status === 423) {
        setActionError(err.response.data.error || 'This ticket is currently locked by another developer.');
        setTicket((prev) => ({
          ...prev,
          locked_by: err.response.data.locked_by,
          locked_by_id: err.response.data.locked_by_id,
          locked_at: err.response.data.locked_at
        }));
      } else {
        setActionError(err.response?.data?.error || 'Failed to claim ticket lock.');
      }
    }
  };

  // Developer cancels resolution and releases exclusive lock
  const handleCancelResolution = async () => {
    setShowResolutionForm(false);
    setActionError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/admin/tickets/${ticketId}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data.ticket);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('ticket_resolving_release', { ticketId });
      }
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (e) {
      // quiet fallback
    }
  };

  // 3. Resolution Image / Video Upload with live preview support
  const handleResFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadResError('');
    setUploadingResMedia(true);

    try {
      for (const file of files) {
        const validationMsg = validateMediaFile(file, 25 * 1024 * 1024);
        if (validationMsg) {
          setUploadResError(validationMsg);
          continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        const fallbackType = file.type?.startsWith('video/') ? 'video' : 'image';
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(
            `${API_BASE}/api/admin/tickets/upload-image`,
            { imageBase64: dataUrl, filename: file.name, fileType: file.type },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setResAttachments((prev) => [
            ...prev,
            {
              url: res.data.url,
              name: file.name,
              type: file.type,
              mediaType: res.data.mediaType || fallbackType
            }
          ]);
        } catch {
          setResAttachments((prev) => [
            ...prev,
            {
              url: dataUrl,
              name: file.name,
              type: file.type,
              mediaType: fallbackType
            }
          ]);
        }
      }
    } catch (err) {
      setUploadResError(err?.message || 'Failed to read selected file.');
    } finally {
      setUploadingResMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveResAttachment = (index) => {
    setResAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 4. Developer Submits Resolution
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    const validationErr = validateFields([
      { value: rootCause, options: { label: 'Root Cause', required: true, maxLength: INPUT_LIMITS.TITLE } },
      { value: fixImplemented, options: { label: 'Fix Implemented', required: true, maxLength: INPUT_LIMITS.DESCRIPTION } },
      { value: filesChanged, options: { label: 'Files / Components Changed', required: false, maxLength: INPUT_LIMITS.DESCRIPTION } },
      { value: resDescription, options: { label: 'Resolution Description', required: true, maxLength: INPUT_LIMITS.DESCRIPTION } },
      { value: resRemarks, options: { label: 'Resolution Remarks', required: true, maxLength: INPUT_LIMITS.TITLE } }
    ]);
    if (validationErr) {
      setActionError(validationErr);
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
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('ticket_resolving_release', { ticketId });
      }
      if (onTicketUpdated) onTicketUpdated(res.data.ticket);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to submit resolution.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // 5. QA Verification
  const handleQAVerify = async (action) => {
    if (action === 'reopen') {
      const reopenErr = validateMeaningfulText(reopenComments, {
        label: 'Reopen Comments',
        required: true,
        maxLength: INPUT_LIMITS.DESCRIPTION
      });
      if (reopenErr) {
        setActionError(reopenErr);
        return;
      }
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

  const handleDeleteTicket = async () => {
    if (!isQAMember) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete bug ticket ${ticket?.ticket_code || ''}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingTicket(true);
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onTicketDeleted) {
        onTicketDeleted(ticketId);
      } else if (onTicketUpdated) {
        onTicketUpdated();
      }
      handleSafeClose();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to delete bug ticket.');
      setDeletingTicket(false);
    }
  };

  const handleSafeClose = () => {
    // Keep the developer's 2-hour exclusive work claim active when closing the modal so they can fix the code in their IDE.
    onClose();
  };

  if (!isOpen) return null;

  const attachmentsList = Array.isArray(ticket?.attachments) ? ticket.attachments : [];
  const resolutionAttachmentsList = Array.isArray(ticket?.resolution_attachments) ? ticket.resolution_attachments : [];

  return (
    <div id="tdm-overlay" className="tdm-overlay" onMouseDown={(e) => e.target === e.currentTarget && handleSafeClose()}>
      <div id="tdm-card" className="tdm-card">
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
          <div className="tdm-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button id="tdm-close-btn" type="button" className="tdm-close-btn" onClick={handleSafeClose} aria-label="Close dialog">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="tdm-body">
          {loading ? (
            <SkeletonLoader variant="detail" />
          ) : error ? (
            <div className="tdm-error-state">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : ticket ? (
            <div className="tdm-content-grid">
              {/* Left Column: Defect Information */}
              <div className="tdm-main-col">
                {/* Developer Real-Time Lock Alert Banner */}
                {isLockedByOther && (
                  <div className="tdm-lock-alert-banner">
                    <div className="tdm-lock-alert-left">
                      <Lock size={18} className="tdm-lock-icon-pulse" />
                      <div>
                        <span className="tdm-lock-alert-title">Locked by {ticket.locked_by}</span>
                        <p className="tdm-lock-alert-desc">
                          {ticket.locked_by} is currently working on this defect. Another developer cannot work on or resolve it until finished or the {TICKET_WORK_LOCK_HOURS}-hour claim expires.
                        </p>
                      </div>
                    </div>
                    {ticket.locked_at && (
                      <span className="tdm-lock-time-tag">
                        {lockRemainingLabel || `Since ${formatIndianTime(ticket.locked_at)}`}
                      </span>
                    )}
                  </div>
                )}

                {!isLockedByOther && !isLockedByMe && isExpiredLock && canResolveTicket && (
                  <div className="tdm-alert-box" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E3A8A' }}>
                    <Clock size={16} color="#2563EB" />
                    <span>
                      Previous {TICKET_WORK_LOCK_HOURS}-hour work claim by <strong>{ticket.locked_by}</strong> expired without resolution. You can now claim and resolve this ticket.
                    </span>
                  </div>
                )}

                {/* Live Typing Intimation from Other Developer */}
                {otherDeveloperTyping && (
                  <div className="tdm-typing-indicator-banner">
                    <span className="tdm-typing-pulse-dot" />
                    <span>{otherDeveloperTyping} is actively typing resolution details right now...</span>
                  </div>
                )}

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
                  <h1 id="tdm-ticket-title">{ticket.title}</h1>
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

                {/* Screenshots & Video Evidence Attachments */}
                <div className="tdm-section-card">
                  <div className="tdm-section-title">
                    <Maximize2 size={15} color="#475569" />
                    <span>Defect Media &amp; Proof ({attachmentsList.length})</span>
                  </div>
                  {attachmentsList.length === 0 ? (
                    <div className="tdm-empty-attachments">No images or videos attached to this ticket.</div>
                  ) : (
                    <div className="tdm-evidence-grid">
                      {attachmentsList.map((item, idx) => {
                        const media = normalizeMediaItem(item, idx, 'Defect Proof');
                        if (!media.url) return null;
                        const isVideo = media.mediaType === 'video';
                        return (
                          <div id={`tdm-evidence-card-${idx}`} key={idx} className="tdm-evidence-card">
                            <div
                              id={`tdm-evidence-preview-${idx}`}
                              className="tdm-evidence-preview-wrap"
                              onClick={() => setZoomMedia(media)}
                            >
                              {isVideo ? (
                                <>
                                  <video
                                    src={media.url}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="tdm-evidence-video"
                                  />
                                  <span className="tdm-media-type-badge">VIDEO</span>
                                </>
                              ) : (
                                <img src={media.url} alt={media.name} className="tdm-evidence-img" />
                              )}
                              <div className="tdm-evidence-overlay">
                                {isVideo ? <Play size={18} /> : <Maximize2 size={16} />}
                                <span>{isVideo ? 'Click to Play' : 'Click to Enlarge'}</span>
                              </div>
                            </div>
                            <div className="tdm-evidence-card-footer">
                              <span className="tdm-evidence-label" title={media.name}>
                                {media.name || `${isVideo ? 'Video' : 'Screenshot'} #${idx + 1}`}
                              </span>
                              <div className="tdm-evidence-actions">
                                <button
                                  id={`tdm-evidence-view-btn-${idx}`}
                                  type="button"
                                  className="tdm-evidence-view-btn"
                                  onClick={() => setZoomMedia(media)}
                                  title={isVideo ? 'Play video in full view' : 'View full resolution image'}
                                >
                                  {isVideo ? <Play size={12} /> : <Eye size={12} />}
                                  <span>{isVideo ? 'Play' : 'View'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Developer Resolution Section */}
                {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                  <div className="tdm-section-card tdm-resolution-card">
                    <div className="tdm-section-title">
                      <CheckCircle2 size={15} color="#16A34A" />
                      <span>Engineering Resolution Details</span>
                      <span className="tdm-res-badge">Resolved by {ticket.resolved_by || 'Developer'}{ticket.resolved_at ? ` on ${formatIndianDate(ticket.resolved_at)}` : ''}</span>
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
                          <label>Resolution Evidence / Proof Media ({resolutionAttachmentsList.length})</label>
                          <div className="tdm-evidence-grid">
                            {resolutionAttachmentsList.map((item, idx) => {
                              const media = normalizeMediaItem(item, idx, 'Fix Evidence');
                              if (!media.url) return null;
                              const isVideo = media.mediaType === 'video';
                              return (
                                <div id={`tdm-res-evidence-card-${idx}`} key={idx} className="tdm-evidence-card">
                                  <div
                                    id={`tdm-res-evidence-preview-${idx}`}
                                    className="tdm-evidence-preview-wrap"
                                    onClick={() => setZoomMedia(media)}
                                  >
                                    {isVideo ? (
                                      <>
                                        <video
                                          src={media.url}
                                          muted
                                          playsInline
                                          preload="metadata"
                                          className="tdm-evidence-video"
                                        />
                                        <span className="tdm-media-type-badge">VIDEO</span>
                                      </>
                                    ) : (
                                      <img src={media.url} alt={media.name} className="tdm-evidence-img" />
                                    )}
                                    <div className="tdm-evidence-overlay">
                                      {isVideo ? <Play size={18} /> : <Maximize2 size={16} />}
                                      <span>{isVideo ? 'Click to Play' : 'Click to Enlarge'}</span>
                                    </div>
                                  </div>
                                  <div className="tdm-evidence-card-footer">
                                    <span className="tdm-evidence-label" title={media.name}>
                                      {media.name || `Fix Evidence #${idx + 1}`}
                                    </span>
                                    <div className="tdm-evidence-actions">
                                      <button
                                        id={`tdm-res-evidence-view-btn-${idx}`}
                                        type="button"
                                        className="tdm-evidence-view-btn"
                                        onClick={() => setZoomMedia(media)}
                                        title={isVideo ? 'Play video in full view' : 'View full resolution image'}
                                      >
                                        {isVideo ? <Play size={12} /> : <Eye size={12} />}
                                        <span>{isVideo ? 'Play' : 'View'}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* QA Verification Box when Closed */}
                {ticket.status === 'Closed' && (
                  <div className="tdm-section-card tdm-closed-audit-card">
                    <div className="tdm-section-title">
                      <ShieldCheck size={15} color="#16A34A" />
                      <span>QA Verification &amp; Sign-Off</span>
                      <span className="tdm-res-badge tdm-closed-badge">Closed &amp; Verified</span>
                    </div>
                    <div className="tdm-closed-audit-body">
                      <p>This defect was re-tested and marked as resolved by QA.</p>
                      <div className="tdm-audit-pill-row">
                        <span><strong>Resolved by:</strong> {ticket.resolved_by || 'Developer'}</span>
                        {ticket.resolved_at && <span><strong>Resolved Date:</strong> {formatIndianDateTime(ticket.resolved_at)}</span>}
                        <span><strong>Closed by:</strong> {ticket.closed_by || 'QA Member'}</span>
                        {ticket.closed_at && <span><strong>Closed Date:</strong> {formatIndianDateTime(ticket.closed_at)}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* DEVELOPER / PROJECT LEAD ACTION: Resolution Form */}
                {canResolveTicket && (ticket.status === 'In Progress' || ticket.status === 'Reopened') && showResolutionForm && (
                  <div className="tdm-section-card tdm-form-card">
                    <div className="tdm-section-title">
                      <Code2 size={15} color="#2563EB" />
                      <span>Submit Resolution Details (Mandatory)</span>
                    </div>
                    <form id="tdm-resolution-form" onSubmit={handleSubmitResolution} className="tdm-resolution-form">
                      <div className="tdm-form-group">
                        <label htmlFor="tdm-root-cause">Root Cause *</label>
                        <input
                          id="tdm-root-cause"
                          type="text"
                          className="tdm-input"
                          value={rootCause}
                          onChange={(e) => setRootCause(e.target.value)}
                          onKeyDown={() => notifyTyping('root_cause')}
                          placeholder="e.g. Unhandled null response from auth token service"
                          maxLength={INPUT_LIMITS.TITLE}
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label htmlFor="tdm-fix-implemented">Fix Implemented *</label>
                        <textarea
                          id="tdm-fix-implemented"
                          rows={2}
                          className="tdm-textarea"
                          value={fixImplemented}
                          onChange={(e) => setFixImplemented(e.target.value)}
                          onKeyDown={() => notifyTyping('fix_implemented')}
                          placeholder="Describe the code solution implemented..."
                          maxLength={INPUT_LIMITS.DESCRIPTION}
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label htmlFor="tdm-files-changed">Files / Components Changed</label>
                        <input
                          id="tdm-files-changed"
                          type="text"
                          className="tdm-input"
                          value={filesChanged}
                          onChange={(e) => setFilesChanged(e.target.value)}
                          onKeyDown={() => notifyTyping('files_changed')}
                          placeholder="e.g. src/auth/loginService.js, src/components/LoginForm.jsx"
                          maxLength={INPUT_LIMITS.DESCRIPTION}
                          autoComplete="off"
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label htmlFor="tdm-res-description">Resolution Description & Verification Instructions *</label>
                        <textarea
                          id="tdm-res-description"
                          rows={2}
                          className="tdm-textarea"
                          value={resDescription}
                          onChange={(e) => setResDescription(e.target.value)}
                          onKeyDown={() => notifyTyping('description')}
                          placeholder="Detailed instructions for QA verification..."
                          maxLength={INPUT_LIMITS.DESCRIPTION}
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <label htmlFor="tdm-res-remarks">Resolution Remarks *</label>
                        <input
                          id="tdm-res-remarks"
                          type="text"
                          className="tdm-input"
                          value={resRemarks}
                          onChange={(e) => setResRemarks(e.target.value)}
                          onKeyDown={() => notifyTyping('remarks')}
                          placeholder="e.g. Verified locally on build v1.4.0 with regression tests passing"
                          maxLength={INPUT_LIMITS.TITLE}
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="tdm-form-group">
                        <div className="tdm-res-upload-header">
                          <label htmlFor="tdm-res-screenshot-input">Resolution Image or Video Proof (Optional)</label>
                          <span className="tdm-upload-hint">PNG, JPG, WEBP, GIF or MP4, WEBM, MOV up to 25MB</span>
                        </div>
                        <input
                          id="tdm-res-screenshot-input"
                          type="file"
                          ref={resFileInputRef}
                          multiple
                          accept="image/*,video/*"
                          style={{ display: 'none' }}
                          onChange={handleResFileUpload}
                        />
                        <button
                          id="tdm-upload-proof-btn"
                          type="button"
                          className="tdm-upload-proof-btn"
                          onClick={() => resFileInputRef.current?.click()}
                          disabled={uploadingResMedia}
                        >
                          <Upload size={14} />
                          <span>{uploadingResMedia ? 'Uploading Media...' : 'Attach Fix Image or Video'}</span>
                        </button>
                        {uploadResError && (
                          <div className="tdm-alert-box error" style={{ marginTop: 6 }}>
                            <AlertCircle size={14} />
                            <span>{uploadResError}</span>
                          </div>
                        )}
                        {resAttachments.length > 0 && (
                          <div className="tdm-res-preview-grid" style={{ marginTop: 10 }}>
                            {resAttachments.map((item, i) => {
                              const media = normalizeMediaItem(item, i, 'Fix Proof');
                              const isVideo = media.mediaType === 'video';
                              return (
                                <div key={`${media.name}-${i}`} id={`tdm-res-upload-card-${i}`} className="tdm-res-preview-card">
                                  <div
                                    className="tdm-res-preview-media-wrap"
                                    onClick={() => setZoomMedia(media)}
                                    title={isVideo ? 'Click to play video preview' : 'Click to preview image'}
                                  >
                                    {isVideo ? (
                                      <>
                                        <video
                                          src={media.url}
                                          muted
                                          playsInline
                                          preload="metadata"
                                          className="tdm-res-preview-media"
                                        />
                                        <span className="tdm-media-type-badge">VIDEO</span>
                                      </>
                                    ) : (
                                      <img src={media.url} alt={media.name} className="tdm-res-preview-media" />
                                    )}
                                    <div className="tdm-evidence-overlay">
                                      {isVideo ? <Play size={16} /> : <Maximize2 size={14} />}
                                      <span>Preview</span>
                                    </div>
                                  </div>
                                  <div className="tdm-res-preview-footer">
                                    <span className="tdm-res-preview-name" title={media.name}>
                                      {media.name}
                                    </span>
                                    <div className="tdm-res-preview-actions">
                                      <button
                                        id={`tdm-res-preview-btn-${i}`}
                                        type="button"
                                        className="tdm-res-preview-icon-btn"
                                        onClick={() => setZoomMedia(media)}
                                        title={isVideo ? 'Preview video' : 'Preview image'}
                                      >
                                        {isVideo ? <Play size={12} /> : <Eye size={12} />}
                                      </button>
                                      <button
                                        id={`tdm-res-remove-btn-${i}`}
                                        type="button"
                                        className="tdm-res-preview-icon-btn danger"
                                        onClick={() => handleRemoveResAttachment(i)}
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
                      <div className="tdm-form-actions">
                        <button
                          id="tdm-cancel-resolution-btn"
                          type="button"
                          className="tdm-btn-secondary"
                          onClick={handleCancelResolution}
                          disabled={submittingResolution}
                        >
                          Cancel &amp; Release Lock
                        </button>
                        <button
                          id="tdm-submit-resolution-btn"
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
                  <div id="tdm-reopen-card" className="tdm-section-card tdm-reopen-card">
                    <div className="tdm-section-title">
                      <RotateCcw size={15} color="#DC2626" />
                      <span>Reopen Ticket (Provide Verification Failure Details)</span>
                    </div>
                    <div className="tdm-reopen-form">
                      <textarea
                        id="tdm-reopen-comments"
                        rows={3}
                        className="tdm-textarea"
                        value={reopenComments}
                        onChange={(e) => setReopenComments(e.target.value)}
                        maxLength={INPUT_LIMITS.DESCRIPTION}
                        placeholder="Explain why the fix did not resolve the defect during re-testing..."
                      />
                      <div className="tdm-form-actions">
                        <button
                          id="tdm-reopen-cancel-btn"
                          type="button"
                          className="tdm-btn-secondary"
                          onClick={() => setShowReopenBox(false)}
                        >
                          Cancel
                        </button>
                        <button
                          id="tdm-reopen-confirm-btn"
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

              {/* Right Sidebar: Status & Resolution Actions */}
              <div className="tdm-side-col">
                {/* 1. Resolution Actions Card for Developer & Project Lead */}
                {canResolveTicket && (
                  <div id="tdm-dev-actions-card" className="tdm-side-card">
                    <h3 id="tdm-dev-actions-heading">
                      {isProjectLead ? 'Resolve Bug (Project Lead)' : 'Developer Actions'}
                    </h3>
                    {isLockedByOther ? (
                      <div>
                        <button
                          id="tdm-dev-locked-btn"
                          type="button"
                          className="tdm-btn-locked"
                          disabled
                          title={`Locked by ${ticket.locked_by} (${lockRemainingLabel})`}
                        >
                          <Lock size={15} />
                          <span>Locked by {ticket.locked_by}</span>
                        </button>
                        <p className="tdm-lock-note">
                          {ticket.locked_by} holds an active claim ({lockRemainingLabel}). If unresolved after {TICKET_WORK_LOCK_HOURS} hours, any assigned developer or lead can resolve it.
                        </p>
                      </div>
                    ) : ticket.status === 'Open' || ticket.status === 'Reopened' ? (
                      <button
                        id="tdm-start-resolving-btn"
                        type="button"
                        className="tdm-btn-action-primary"
                        onClick={handleStartResolving}
                      >
                        <Clock size={16} />
                        <span>
                          {isExpiredLock
                            ? 'Take Over & Resolve Ticket'
                            : isProjectLead
                            ? 'Start Working & Resolve'
                            : 'Start Working & Claim Ticket'}
                        </span>
                      </button>
                    ) : ticket.status === 'In Progress' ? (
                      !showResolutionForm && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {isLockedByMe && (
                            <div className="tdm-status-notice" style={{ fontSize: '12px' }}>
                              <Clock size={14} color="#2563EB" />
                              <span>Claimed by you ({lockRemainingLabel}). Auto-assigned to you on resolve.</span>
                            </div>
                          )}
                          <button
                            id="tdm-mark-resolved-btn"
                            type="button"
                            className="tdm-btn-action-resolve"
                            onClick={handleStartResolving}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              {isLockedByMe
                                ? 'Continue Resolution'
                                : isExpiredLock
                                ? 'Take Over & Resolve Ticket'
                                : 'Start Working & Resolve'}
                            </span>
                          </button>
                          {isLockedByMe && (
                            <button
                              id="tdm-side-release-lock-btn"
                              type="button"
                              className="tdm-btn-secondary"
                              onClick={handleCancelResolution}
                            >
                              Release Claim
                            </button>
                          )}
                        </div>
                      )
                    ) : ticket.status === 'Resolved' ? (
                      <div className="tdm-status-notice">
                        <ShieldCheck size={16} color="#2563EB" />
                        <span>Submitted for QA Verification. Awaiting QA review.</span>
                      </div>
                    ) : (
                      <div className="tdm-status-notice closed">
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span>This defect is verified and closed{ticket.closed_by ? ` by ${ticket.closed_by}` : ''}{ticket.closed_at ? ` on ${formatIndianDate(ticket.closed_at)}` : ''}.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2b. QA / Manager Read-only Defect Status Notice */}
                {!canResolveTicket && (
                  <div id="tdm-defect-status-card" className="tdm-side-card">
                    <h3 id="tdm-defect-status-heading">Defect Status</h3>
                    {ticket.status === 'Open' ? (
                      <div className="tdm-status-notice">
                        <Clock size={16} color="#2563EB" />
                        <span>Pending Developer Pickup. Only assigned developers can resolve this defect.</span>
                      </div>
                    ) : ticket.status === 'In Progress' ? (
                      <div className="tdm-status-notice">
                        <Clock size={16} color="#D97706" />
                        <span>
                          {ticket.locked_by ? `Developer ${ticket.locked_by} is actively resolving this defect.` : 'Developer is actively working on resolution.'}
                        </span>
                      </div>
                    ) : ticket.status === 'Resolved' ? (
                      <div className="tdm-status-notice">
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span>Resolved by {ticket.resolved_by || 'Developer'}. Ready for QA re-testing &amp; verification.</span>
                      </div>
                    ) : (
                      <div className="tdm-status-notice closed">
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span>This defect is verified and closed{ticket.closed_by ? ` by ${ticket.closed_by}` : ''}.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Actions Card for QA (Verification) */}
                {isQA && ticket.status === 'Resolved' && (
                  <div id="tdm-qa-verify-card" className="tdm-side-card tdm-qa-card">
                    <h3 id="tdm-qa-verify-heading">QA Verification Actions</h3>
                    <p className="tdm-side-subtext">The developer submitted a fix. Re-test and sign off.</p>
                    <div className="tdm-qa-btn-group">
                      <button
                        id="tdm-qa-approve-btn"
                        type="button"
                        className="tdm-btn-qa-approve"
                        onClick={() => handleQAVerify('approve')}
                        disabled={verifyingQA}
                      >
                        <ShieldCheck size={16} />
                        <span>{verifyingQA ? 'Verifying...' : 'Approve & Close Ticket'}</span>
                      </button>
                      <button
                        id="tdm-qa-reopen-btn"
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
                <div id="tdm-metadata-card" className="tdm-side-card">
                  <h3 id="tdm-metadata-heading">Ticket Metadata</h3>
                  <div className="tdm-meta-list">
                    <div><span>Project:</span> <strong>{ticket.project_name || ticket.project_code}</strong></div>
                    <div><span>Reported By:</span> <strong>{ticket.raised_by || ticket.reporter || 'QA Member'}</strong></div>
                    <div><span>Reported Date:</span> <strong>{formatIndianDate(ticket.created_at)}</strong></div>
                    <div><span>Priority:</span> <strong>{ticket.priority || 'Medium'}</strong></div>
                    <div><span>Severity:</span> <strong>{ticket.severity || 'Medium'}</strong></div>
                    {ticket.resolved_by && <div><span>Resolved By:</span> <strong>{ticket.resolved_by}</strong></div>}
                    {ticket.resolved_at && <div><span>Resolved Date:</span> <strong>{formatIndianDate(ticket.resolved_at)}</strong></div>}
                    {ticket.closed_by && <div><span>Closed By:</span> <strong>{ticket.closed_by}</strong></div>}
                    {ticket.closed_at && <div><span>Closed Date:</span> <strong>{formatIndianDate(ticket.closed_at)}</strong></div>}
                  </div>
                </div>

                {/* 5. Ticket Activity / History Timeline */}
                <div id="tdm-history-card" className="tdm-side-card">
                  <div className="tdm-side-title-row">
                    <History size={14} />
                    <h3 id="tdm-history-heading">Activity & History ({ticket.history?.length || 0})</h3>
                  </div>
                  <div className="tdm-history-timeline">
                    {ticket.history?.length ? (
                      ticket.history.map((h, i) => (
                        <div key={i} className="tdm-history-item">
                          <span className="tdm-history-dot" />
                          <div className="tdm-history-body">
                            <span className="tdm-history-action">{h.action}</span>
                            <span className="tdm-history-user">{h.performed_by} &bull; {formatIndianDateTime(h.created_at)}</span>
                            {h.details && <p className="tdm-history-details">{h.details}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="tdm-side-subtext">No historical events recorded.</span>
                    )}
                  </div>
                </div>

                {/* 6. QA Member Delete Action (Bottom-Right, Icon Only) */}
                {isQAMember && (
                  <div id="tdm-delete-card" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', padding: '4px 0' }}>
                    <button
                      id="tdm-bottom-delete-btn"
                      type="button"
                      className="tdm-tiny-delete-btn"
                      onClick={handleDeleteTicket}
                      disabled={deletingTicket}
                      title="Delete this bug ticket"
                      aria-label="Delete this bug ticket"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* In-App Universal Media & File Viewer */}
      <UniversalFileViewer
        isOpen={Boolean(zoomMedia)}
        file={zoomMedia}
        onClose={() => setZoomMedia(null)}
      />
    </div>
  );
}

