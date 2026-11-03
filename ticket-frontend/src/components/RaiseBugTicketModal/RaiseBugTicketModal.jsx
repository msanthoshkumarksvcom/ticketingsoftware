import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
  ShieldAlert,
  FolderKanban,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import './RaiseBugTicketModal.css';

const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const PRIORITY_OPTIONS = ['Urgent', 'High', 'Medium', 'Low'];
const CATEGORY_OPTIONS = [
  'Functional Bug',
  'Validation Bug',
  'UI Bug',
  'Performance Bug',
  'Integration Bug',
  'Security Bug',
  'Data Issue',
  'Other'
];

export default function RaiseBugTicketModal({
  isOpen,
  onClose,
  project,
  testCaseData,
  onTicketCreated
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [severity, setSeverity] = useState('High');
  const [priority, setPriority] = useState('High');
  const [category, setCategory] = useState('Functional Bug');
  const [actualResult, setActualResult] = useState('');
  
  // Attachments: array of { url: string, name: string }
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Preview Mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);

  // Duplicate Check Warning
  const [existingWarning, setExistingWarning] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef(null);

  const currentUser = typeof window !== 'undefined'
    ? (localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'QA Member')
    : 'QA Member';

  useEffect(() => {
    if (isOpen && testCaseData) {
      const tcId = testCaseData.col_id || testCaseData.id || 'TC-001';
      const tcTitle = testCaseData.col_title || testCaseData.title || 'Failed test scenario';
      
      setTitle(`[${tcId}] ${tcTitle} - Test Failure`);
      setDescription(`Test execution failed for ${tcId}. Expected: "${testCaseData.col_expected || 'Expected behavior'}".`);
      setStepsToReproduce(testCaseData.col_steps || '1. Navigate to target screen\n2. Execute test steps\n3. Observe unexpected behavior');
      setActualResult(testCaseData.col_actual || testCaseData.actual_result || 'Operation failed or produced incorrect output.');
      setSeverity(testCaseData.col_priority === 'Critical' ? 'Critical' : 'High');
      setPriority(testCaseData.col_priority === 'Critical' ? 'Urgent' : 'High');

      // If test case row already has a screenshot attached, carry it over!
      const initialImages = [];
      if (testCaseData.col_screenshot && typeof testCaseData.col_screenshot === 'string' && testCaseData.col_screenshot.trim() !== '') {
        initialImages.push({ url: testCaseData.col_screenshot.trim(), name: 'Test-Case-Proof.png' });
      }
      setAttachments(initialImages);
      setIsPreviewMode(false);
      setSubmitError('');
      setExistingWarning(null);

      // Check for duplicate active ticket on this test case
      checkExistingTicket(project?.id, tcId);
    }
  }, [isOpen, testCaseData, project]);

  const checkExistingTicket = async (projectId, testCaseId) => {
    if (!projectId || !testCaseId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/admin/tickets?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const match = res.data.find(
        (t) => t.test_case_id === testCaseId && ['Open', 'In Progress', 'Reopened'].includes(t.status)
      );
      if (match) {
        setExistingWarning(match);
      }
    } catch (e) {
      // quiet fallback
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError('');
    setIsUploading(true);

    files.forEach((file) => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Invalid format. Please upload JPG, PNG, or WEBP images.');
        setIsUploading(false);
        return;
      }
      // Validate file size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`File ${file.name} is too large. Max allowed size is 8MB.`);
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post(
            'http://localhost:5000/api/admin/tickets/upload-image',
            { imageBase64: reader.result, filename: file.name, fileType: file.type },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAttachments((prev) => [...prev, { url: res.data.url, name: file.name }]);
        } catch (err) {
          // If backend upload fails, fall back to base64 data URL
          setAttachments((prev) => [...prev, { url: reader.result, name: file.name }]);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read image file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if (activeImageIndex >= index && activeImageIndex > 0) {
      setActiveImageIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (forceCreate = false) => {
    if (!title.trim()) {
      setSubmitError('Please enter a clear bug title.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        project_id: project?.id,
        project_code: project?.project_code || 'PRJ',
        project_name: project?.name,
        test_case_id: testCaseData?.col_id || testCaseData?.id || 'TC-001',
        module: testCaseData?.col_module || 'General',
        sub_module: testCaseData?.col_submodule || '',
        test_scenario: testCaseData?.col_title || title,
        test_steps: stepsToReproduce,
        test_data: testCaseData?.col_data || '',
        expected_result: testCaseData?.col_expected || '',
        actual_result: actualResult,
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce,
        severity,
        priority,
        category,
        attachments: attachments.map((a) => a.url),
        force: forceCreate
      };

      const res = await axios.post('http://localhost:5000/api/admin/tickets/from-test-case', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onTicketCreated) {
        onTicketCreated(res.data.ticket);
      }
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.warning) {
        setExistingWarning(err.response.data.existingTicket);
        setSubmitError(err.response.data.warning);
      } else {
        setSubmitError(err.response?.data?.error || 'Failed to submit bug ticket. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rbt-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`rbt-modal-card ${isPreviewMode ? 'rbt-preview-card' : ''}`}>
        {/* Modal Header */}
        <div className="rbt-modal-header">
          <div className="rbt-header-title-box">
            <div className="rbt-header-badge">
              <AlertCircle size={17} />
              <span>{isPreviewMode ? 'BUG REPORT PREVIEW' : 'RAISE PROJECT BUG TICKET'}</span>
            </div>
            <h2>{isPreviewMode ? 'Review Bug Report Before Submission' : 'Log Defect from Failed Test Case'}</h2>
            <p className="rbt-header-subtitle">
              Project: <strong>{project?.name || 'Selected Project'}</strong> ({project?.project_code}) &bull; Linked to Test Case:{' '}
              <span className="rbt-tc-pill">{testCaseData?.col_id || testCaseData?.id || 'TC-001'}</span>
            </p>
          </div>
          <button type="button" className="rbt-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="rbt-modal-body">
          {/* Warning Banner if Duplicate Active Ticket Exists */}
          {existingWarning && (
            <div className="rbt-warning-banner">
              <ShieldAlert size={20} className="rbt-warning-icon" />
              <div className="rbt-warning-text">
                <strong>Active Ticket Already Exists:</strong> A bug ticket (<code>{existingWarning.ticket_code}</code>) is currently{' '}
                <span className="rbt-status-tag">{existingWarning.status}</span> for this test case.
              </div>
            </div>
          )}

          {submitError && (
            <div className="rbt-error-alert">
              <AlertCircle size={16} />
              <span>{submitError}</span>
            </div>
          )}

          {!isPreviewMode ? (
            /* =======================================================
               MODE A: FORM EDITING
               ======================================================= */
            <div className="rbt-form-container">
              {/* 1. Auto-Populated Test Case Summary Box */}
              <div className="rbt-tc-autofill-card">
                <div className="rbt-autofill-header">
                  <FileSpreadsheet size={15} color="#2563EB" />
                  <span>Auto-Retrieved Test Case Details</span>
                  <span className="rbt-autofill-tag">Verified by QA Sheet</span>
                </div>
                <div className="rbt-autofill-grid">
                  <div className="rbt-af-item">
                    <label>Module / Screen</label>
                    <div className="rbt-af-val">{testCaseData?.col_module || 'General Module'}</div>
                  </div>
                  <div className="rbt-af-item">
                    <label>Test Scenario</label>
                    <div className="rbt-af-val">{testCaseData?.col_title || 'Execution Scenario'}</div>
                  </div>
                  <div className="rbt-af-item rbt-af-full">
                    <label>Expected Result</label>
                    <div className="rbt-af-val rbt-af-expected">{testCaseData?.col_expected || 'Expected result as per test specification.'}</div>
                  </div>
                </div>
              </div>

              {/* 2. User Editable Fields */}
              <div className="rbt-fields-grid">
                {/* Bug Title */}
                <div className="rbt-field-group rbt-field-full">
                  <label className="rbt-label">
                    Bug Title <span className="rbt-req">*</span>
                  </label>
                  <input
                    type="text"
                    className="rbt-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Concise defect title..."
                  />
                </div>

                {/* Severity, Priority, Category Row */}
                <div className="rbt-field-group">
                  <label className="rbt-label">Severity <span className="rbt-req">*</span></label>
                  <select
                    className="rbt-select"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="rbt-field-group">
                  <label className="rbt-label">Priority <span className="rbt-req">*</span></label>
                  <select
                    className="rbt-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="rbt-field-group">
                  <label className="rbt-label">Bug Category <span className="rbt-req">*</span></label>
                  <select
                    className="rbt-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Actual Result Observed */}
                <div className="rbt-field-group rbt-field-full">
                  <label className="rbt-label">
                    Actual Result Observed <span className="rbt-req">*</span>
                  </label>
                  <textarea
                    rows={2}
                    className="rbt-textarea"
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    placeholder="Describe what actually occurred during test execution..."
                  />
                </div>

                {/* Detailed Steps to Reproduce */}
                <div className="rbt-field-group rbt-field-full">
                  <label className="rbt-label">Steps to Reproduce</label>
                  <textarea
                    rows={3}
                    className="rbt-textarea"
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    placeholder="Step-by-step reproduction instructions for engineering developers..."
                  />
                </div>

                {/* Additional Description & Technical Details */}
                <div className="rbt-field-group rbt-field-full">
                  <label className="rbt-label">Additional Description & Notes</label>
                  <textarea
                    rows={2}
                    className="rbt-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="System logs, browser version, device info, error stack, etc..."
                  />
                </div>

                {/* 3. Image Attachments Section */}
                <div className="rbt-field-group rbt-field-full">
                  <div className="rbt-attach-header">
                    <label className="rbt-label">
                      Screenshot & Evidence Attachments
                      <span className="rbt-badge-count">{attachments.length}</span>
                    </label>
                    <span className="rbt-sublabel">PNG, JPG, WEBP up to 8MB each</span>
                  </div>

                  {uploadError && <div className="rbt-error-inline">{uploadError}</div>}

                  <div className="rbt-attach-box">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      className="rbt-upload-trigger-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload size={16} />
                      <span>{isUploading ? 'Processing Image...' : 'Upload Screenshots'}</span>
                    </button>
                    <span className="rbt-drop-hint">or paste screenshot directly</span>
                  </div>

                  {/* Thumbnail Strip */}
                  {attachments.length > 0 && (
                    <div className="rbt-thumbs-grid">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="rbt-thumb-card">
                          <img
                            src={att.url}
                            alt={att.name || `Screenshot ${idx + 1}`}
                            className="rbt-thumb-img"
                            onClick={() => setZoomImage(att.url)}
                          />
                          <div className="rbt-thumb-overlay">
                            <button
                              type="button"
                              className="rbt-thumb-zoom-btn"
                              onClick={() => setZoomImage(att.url)}
                              title="Enlarge preview"
                            >
                              <Maximize2 size={12} />
                            </button>
                            <button
                              type="button"
                              className="rbt-thumb-remove-btn"
                              onClick={() => removeAttachment(idx)}
                              title="Remove image"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <span className="rbt-thumb-name" title={att.name}>{att.name || `Image-${idx + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* =======================================================
               MODE B: STRUCTURED BUG REPORT PREVIEW (SECTION 8)
               ======================================================= */
            <div className="rbt-preview-document">
              <div className="rbt-doc-banner">
                <div className="rbt-doc-badge">FORMAL DEFECT REPORT</div>
                <div className="rbt-doc-code">
                  Ticket ID: <span>[Generated on Submit: {project?.project_code}-BUG-XXX]</span>
                </div>
              </div>

              {/* Project & Ownership Header */}
              <div className="rbt-doc-section">
                <div className="rbt-doc-section-title">
                  <FolderKanban size={14} /> 1. Project & Module Context
                </div>
                <div className="rbt-doc-grid-2">
                  <div><strong>Project Name:</strong> {project?.name}</div>
                  <div><strong>Project Code:</strong> {project?.project_code}</div>
                  <div><strong>Module:</strong> {testCaseData?.col_module || 'General'}</div>
                  <div><strong>Submodule / Screen:</strong> {testCaseData?.col_submodule || 'Default View'}</div>
                </div>
              </div>

              {/* Linked Test Case Specification */}
              <div className="rbt-doc-section">
                <div className="rbt-doc-section-title">
                  <FileSpreadsheet size={14} /> 2. Test Execution Details
                </div>
                <div className="rbt-doc-grid-2">
                  <div><strong>Test Case ID:</strong> <code>{testCaseData?.col_id || testCaseData?.id}</code></div>
                  <div><strong>Execution Status:</strong> <span className="rbt-fail-pill">FAILED</span></div>
                  <div className="rbt-doc-full"><strong>Test Scenario:</strong> {testCaseData?.col_title || title}</div>
                  <div className="rbt-doc-full"><strong>Test Steps:</strong> <pre className="rbt-doc-pre">{stepsToReproduce}</pre></div>
                  <div className="rbt-doc-full"><strong>Expected Result:</strong> <div className="rbt-doc-res-box expected">{testCaseData?.col_expected || 'Standard specification behavior'}</div></div>
                  <div className="rbt-doc-full"><strong>Actual Result:</strong> <div className="rbt-doc-res-box actual">{actualResult}</div></div>
                </div>
              </div>

              {/* Bug Details */}
              <div className="rbt-doc-section">
                <div className="rbt-doc-section-title">
                  <AlertCircle size={14} /> 3. Defect Classification & Description
                </div>
                <div className="rbt-doc-grid-3">
                  <div><strong>Severity:</strong> <span className={`rbt-sev-badge ${severity.toLowerCase()}`}>{severity}</span></div>
                  <div><strong>Priority:</strong> <span className={`rbt-pri-badge ${priority.toLowerCase()}`}>{priority}</span></div>
                  <div><strong>Category:</strong> {category}</div>
                </div>
                <div className="rbt-doc-field-mt">
                  <strong>Bug Title:</strong>
                  <p className="rbt-doc-title-lead">{title}</p>
                </div>
                {description && (
                  <div className="rbt-doc-field-mt">
                    <strong>Additional Notes:</strong>
                    <p className="rbt-doc-desc">{description}</p>
                  </div>
                )}
              </div>

              {/* Screenshots Gallery */}
              <div className="rbt-doc-section">
                <div className="rbt-doc-section-title">
                  <ImageIcon size={14} /> 4. Attached Defect Evidence ({attachments.length})
                </div>
                {attachments.length === 0 ? (
                  <div className="rbt-doc-no-evidence">No screenshot attachments uploaded.</div>
                ) : (
                  <div className="rbt-doc-evidence-gallery">
                    <div className="rbt-gallery-main-view">
                      <img
                        src={attachments[activeImageIndex]?.url}
                        alt="Evidence Full View"
                        className="rbt-gallery-main-img"
                        onClick={() => setZoomImage(attachments[activeImageIndex]?.url)}
                      />
                      {attachments.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="rbt-gallery-nav prev"
                            onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1))}
                            title="Previous image"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            className="rbt-gallery-nav next"
                            onClick={() => setActiveImageIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0))}
                            title="Next image"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                      <span className="rbt-gallery-counter">
                        {activeImageIndex + 1} of {attachments.length} &bull; Click to zoom
                      </span>
                    </div>

                    {attachments.length > 1 && (
                      <div className="rbt-gallery-strip">
                        {attachments.map((att, idx) => (
                          <img
                            key={idx}
                            src={att.url}
                            alt="thumb"
                            className={`rbt-gallery-thumb ${idx === activeImageIndex ? 'active' : ''}`}
                            onClick={() => setActiveImageIndex(idx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reporter Metadata */}
              <div className="rbt-doc-meta-footer">
                <div><span>Reported By:</span> <strong>{currentUser}</strong></div>
                <div><span>Reported Date:</span> <strong>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong></div>
                <div><span>Project Ownership:</span> <strong>{project?.name}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="rbt-modal-footer">
          {!isPreviewMode ? (
            <>
              <button type="button" className="rbt-btn-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="rbt-btn-preview"
                onClick={() => setIsPreviewMode(true)}
                disabled={!title.trim() || isSubmitting}
              >
                <Eye size={15} />
                <span>Preview Bug Report</span>
              </button>
              <button
                type="button"
                className="rbt-btn-submit"
                onClick={() => handleSubmit(false)}
                disabled={!title.trim() || isSubmitting}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Raising Ticket...' : 'Submit Bug Ticket'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rbt-btn-cancel"
                onClick={() => setIsPreviewMode(false)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={15} />
                <span>Back to Edit</span>
              </button>
              <button
                type="button"
                className="rbt-btn-submit"
                onClick={() => handleSubmit(Boolean(existingWarning))}
                disabled={isSubmitting}
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Submitting...' : 'Confirm & Submit Ticket'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lightbox Full Zoom View */}
      {zoomImage && (
        <div className="rbt-zoom-lightbox" onClick={() => setZoomImage(null)}>
          <div className="rbt-zoom-content" onClick={(e) => e.stopPropagation()}>
            <img src={zoomImage} alt="Full Resolution" className="rbt-zoom-img" />
            <button type="button" className="rbt-zoom-close" onClick={() => setZoomImage(null)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
