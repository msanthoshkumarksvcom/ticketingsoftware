import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  Code2,
  Package,
  Search,
  Copy,
  Check,
  WrapText,
  AlertCircle,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import {
  detectFileCategory,
  getFileExtension,
  getMimeTypeForExtension,
  columnIndexToLetter,
  parseExcelArrayBuffer,
  parsePowerPointArrayBuffer,
  parseWordArrayBuffer,
  parseArchiveArrayBuffer,
  parseTextArrayBuffer
} from '../../utils/filePreviewParsers';
import { formatIndianDate } from '../../utils/dateFormat';
import './UniversalFileViewer.css';

const CATEGORY_META = {
  image: { label: 'Image', icon: ImageIcon, color: '#2563EB' },
  video: { label: 'Video', icon: Video, color: '#7C3AED' },
  audio: { label: 'Audio', icon: Music, color: '#0284C7' },
  pdf: { label: 'PDF Document', icon: FileText, color: '#DC2626' },
  excel: { label: 'Spreadsheet', icon: FileSpreadsheet, color: '#16A34A' },
  ppt: { label: 'Presentation', icon: Presentation, color: '#EA580C' },
  word: { label: 'Word Document', icon: FileText, color: '#2563EB' },
  text: { label: 'Text / Code', icon: Code2, color: '#475569' },
  archive: { label: 'Package / Archive', icon: Package, color: '#6366F1' },
  other: { label: 'File Preview', icon: FileText, color: '#475569' }
};

export default function UniversalFileViewer({
  isOpen,
  file,
  files,
  activeIndex,
  onSelectIndex,
  onClose,
  showDownload = true
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerData, setViewerData] = useState(null);
  const [mediaLoadError, setMediaLoadError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Image controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [darkStage, setDarkStage] = useState(true);

  // Excel state
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [sheetSearch, setSheetSearch] = useState('');

  // PPT state
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(true);

  // Text / Code state
  const [wordWrap, setWordWrap] = useState(true);
  const [copiedText, setCopiedText] = useState(false);

  const cleanupRef = useRef([]);

  const runCleanups = () => {
    for (const fn of cleanupRef.current) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
    cleanupRef.current = [];
  };

  const category = useMemo(() => detectFileCategory(file), [file]);
  const ext = useMemo(() => getFileExtension(file), [file]);
  const catMeta = CATEGORY_META[category] || CATEGORY_META.other;
  const CategoryIcon = catMeta.icon;

  const hasSiblingNav = Array.isArray(files) && files.length > 1 && typeof activeIndex === 'number' && typeof onSelectIndex === 'function';

  useEffect(() => {
    if (!isOpen || !file) {
      runCleanups();
      setViewerData(null);
      setError('');
      setMediaLoadError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setMediaLoadError('');
    setViewerData(null);
    setZoomLevel(100);
    setRotation(0);
    setActiveSheetIdx(0);
    setSheetSearch('');
    setActiveSlideIdx(0);
    setCopiedText(false);
    runCleanups();

    const loadFileContent = async () => {
      try {
        const directUrl = file.blobUrl || file.url || file.file_url || '';

        const obtainArrayBuffer = async () => {
          if (typeof file.loadArrayBuffer === 'function') {
            return await file.loadArrayBuffer();
          }
          if (!directUrl) {
            throw new Error('File source is unavailable.');
          }
          const resp = await fetch(directUrl, { cache: 'no-store' });
          if (!resp.ok) throw new Error(`Unable to load file (${resp.status}).`);
          return await resp.arrayBuffer();
        };

        // Fast path for already-resolved image/video/audio media URLs when no binary parsing is required
        if (category === 'image' || category === 'video' || category === 'audio') {
          let mediaUrl = directUrl;
          if (!mediaUrl || typeof file.loadArrayBuffer === 'function') {
            const buf = await obtainArrayBuffer();
            if (cancelled) return;
            const mime = getMimeTypeForExtension(ext, file.type || (category === 'image' ? 'image/png' : category === 'video' ? 'video/mp4' : 'audio/mpeg'));
            mediaUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
            cleanupRef.current.push(() => URL.revokeObjectURL(mediaUrl));
          }
          if (!cancelled) {
            setViewerData({ kind: category, url: mediaUrl });
          }
          return;
        }

        // PDF: always ensure a Blob URL with explicit application/pdf MIME so browsers render inline cleanly
        if (category === 'pdf') {
          let pdfUrl = '';
          if (directUrl.startsWith('data:application/pdf')) {
            pdfUrl = directUrl;
          } else {
            const buf = await obtainArrayBuffer();
            if (cancelled) return;
            pdfUrl = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
            cleanupRef.current.push(() => URL.revokeObjectURL(pdfUrl));
          }
          if (!cancelled) {
            setViewerData({ kind: 'pdf', url: pdfUrl });
          }
          return;
        }

        // Client-side parsed formats
        const arrayBuffer = await obtainArrayBuffer();
        if (cancelled) return;

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error(`File "${file.name || 'Document'}" is empty (0 bytes).`);
        }

        if (category === 'excel') {
          const parsed = await parseExcelArrayBuffer(arrayBuffer);
          if (!cancelled) setViewerData({ kind: 'excel', ...parsed });
          return;
        }

        if (category === 'ppt') {
          const parsed = await parsePowerPointArrayBuffer(arrayBuffer, ext);
          if (parsed.revokeUrls) cleanupRef.current.push(parsed.revokeUrls);
          if (!cancelled) setViewerData({ kind: 'ppt', ...parsed });
          return;
        }

        if (category === 'word') {
          const parsed = await parseWordArrayBuffer(arrayBuffer, ext);
          if (!cancelled) setViewerData({ kind: 'word', wordData: parsed });
          return;
        }

        if (category === 'archive') {
          const parsed = await parseArchiveArrayBuffer(arrayBuffer);
          if (!cancelled) setViewerData({ kind: 'archive', ...parsed });
          return;
        }

        if (category === 'text') {
          const parsed = parseTextArrayBuffer(arrayBuffer, ext);
          if (!cancelled) setViewerData({ kind: 'text', ...parsed });
          return;
        }

        // Attempt graceful text preview or fallback inspector for unknown formats
        if (!cancelled) {
          setViewerData({ kind: 'other', byteSize: arrayBuffer.byteLength });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to render this file inside the viewer.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFileContent();

    return () => {
      cancelled = true;
      runCleanups();
    };
  }, [isOpen, file, category, ext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape' && onClose) onClose();
        return;
      }
      if (e.key === 'Escape' && onClose) {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (viewerData?.kind === 'ppt' && viewerData.slides?.length > 1) {
          setActiveSlideIdx((prev) => Math.min(viewerData.slides.length - 1, prev + 1));
        } else if (hasSiblingNav && activeIndex < files.length - 1) {
          onSelectIndex(activeIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (viewerData?.kind === 'ppt' && viewerData.slides?.length > 1) {
          setActiveSlideIdx((prev) => Math.max(0, prev - 1));
        } else if (hasSiblingNav && activeIndex > 0) {
          onSelectIndex(activeIndex - 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, viewerData, hasSiblingNav, activeIndex, files, onSelectIndex]);

  const handleCopyText = async () => {
    if (!viewerData?.text) return;
    try {
      await navigator.clipboard.writeText(viewerData.text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleTriggerDownload = () => {
    if (!file) return;
    if (typeof file.onDownload === 'function') {
      file.onDownload();
      return;
    }
    const href = viewerData?.url || file.blobUrl || file.url || file.file_url;
    if (!href) return;
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', file.name || 'document');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Excel rows
  const currentSheet = viewerData?.kind === 'excel' ? viewerData.sheets?.[activeSheetIdx] : null;
  const filteredSheetRows = useMemo(() => {
    if (!currentSheet) return [];
    const rows = currentSheet.rows || [];
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return rows.map((cells, idx) => ({ rowNum: idx + 1, cells }));
    return rows
      .map((cells, idx) => ({ rowNum: idx + 1, cells }))
      .filter((entry) => entry.cells.some((c) => String(c).toLowerCase().includes(q)));
  }, [currentSheet, sheetSearch]);

  if (!isOpen || !file) return null;

  const displayTitle = file.title || file.name || 'File Preview';
  const showSubtitleFile = file.title && file.name && file.title !== file.name;
  const currentSlide = viewerData?.kind === 'ppt' ? viewerData.slides?.[activeSlideIdx] : null;

  return (
    <div
      id="ufv-overlay"
      className="ufv-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        id="ufv-modal"
        className={`ufv-modal ${isFullscreen ? 'is-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="ufv-header">
          <div className="ufv-title-group">
            <div className="ufv-icon-badge" style={{ color: catMeta.color, background: `${catMeta.color}14`, borderColor: `${catMeta.color}30` }}>
              <CategoryIcon size={18} />
            </div>
            <div className="ufv-title-meta">
              <div className="ufv-title-row">
                <h3 id="ufv-file-title" title={displayTitle}>{displayTitle}</h3>
                <span className="ufv-type-pill">{(ext || catMeta.label).toUpperCase()}</span>
              </div>
              <span className="ufv-subtitle">
                {showSubtitleFile ? `${file.name} • ` : ''}
                {file.file_size ? `${file.file_size} • ` : ''}
                {catMeta.label}
                {file.uploaded_by ? ` • Uploaded by ${file.uploaded_by}` : ''}
                {file.uploaded_at ? ` on ${formatIndianDate(file.uploaded_at, '')}` : ''}
              </span>
            </div>
          </div>

          <div className="ufv-header-actions">
            {hasSiblingNav && (
              <div className="ufv-nav-group">
                <button
                  id="ufv-prev-file-btn"
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => onSelectIndex(activeIndex - 1)}
                  disabled={activeIndex <= 0}
                  title="Previous file"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="ufv-nav-counter">{activeIndex + 1} / {files.length}</span>
                <button
                  id="ufv-next-file-btn"
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => onSelectIndex(activeIndex + 1)}
                  disabled={activeIndex >= files.length - 1}
                  title="Next file"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {viewerData?.kind === 'image' && (
              <div className="ufv-toolbar-controls">
                <button
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
                  title="Zoom out"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="ufv-zoom-label">{zoomLevel}%</span>
                <button
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}
                  title="Zoom in"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  type="button"
                  className="ufv-tool-btn"
                  onClick={() => setDarkStage((d) => !d)}
                  title={darkStage ? 'Switch to light backdrop' : 'Switch to dark backdrop'}
                >
                  {darkStage ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>
            )}

            {viewerData?.kind === 'text' && (
              <div className="ufv-toolbar-controls">
                <button
                  type="button"
                  className={`ufv-tool-btn ${wordWrap ? 'active' : ''}`}
                  onClick={() => setWordWrap((w) => !w)}
                  title="Toggle line wrapping"
                >
                  <WrapText size={15} />
                </button>
                <button
                  type="button"
                  className="ufv-tool-btn"
                  onClick={handleCopyText}
                  title="Copy content"
                >
                  {copiedText ? <Check size={15} color="#16A34A" /> : <Copy size={15} />}
                </button>
              </div>
            )}

            <button
              id="ufv-fullscreen-btn"
              type="button"
              className="ufv-tool-btn"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Exit fullscreen' : 'Expand viewer'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {showDownload && (file.onDownload || viewerData?.url || file.blobUrl || file.url || file.file_url) && (
              <button
                id="ufv-download-btn"
                type="button"
                className="ufv-download-btn"
                onClick={handleTriggerDownload}
                title="Download a local copy"
              >
                <Download size={14} />
                <span>Download</span>
              </button>
            )}

            <button
              id="ufv-close-btn"
              type="button"
              className="ufv-close-btn"
              onClick={onClose}
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Stage */}
        <div className="ufv-body">
          {loading ? (
            <div className="ufv-center-state">
              <Loader2 size={32} className="ufv-spin" color="#2563EB" />
              <p>Loading {catMeta.label.toLowerCase()} inside viewer...</p>
            </div>
          ) : error ? (
            <div className="ufv-center-state">
              <div className="ufv-error-card">
                <AlertCircle size={36} color="#DC2626" />
                <h4>Could Not Render File</h4>
                <p>{error}</p>
                {showDownload && file.onDownload && (
                  <button type="button" className="ufv-download-btn" onClick={handleTriggerDownload}>
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewerData?.kind === 'image' ? (
            <div className={`ufv-media-stage ${darkStage ? 'dark' : 'light'}`}>
              <img
                src={viewerData.url}
                alt={displayTitle}
                className="ufv-image-el"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  maxHeight: zoomLevel === 100 ? '100%' : 'none',
                  maxWidth: zoomLevel === 100 ? '100%' : 'none'
                }}
              />
            </div>
          ) : viewerData?.kind === 'video' ? (
            <div className="ufv-media-stage dark">
              {mediaLoadError ? (
                <div className="ufv-error-card">
                  <Video size={36} color="#7C3AED" />
                  <h4>Video Codec Not Supported by Browser</h4>
                  <p>{mediaLoadError}</p>
                  {showDownload && (
                    <button type="button" className="ufv-download-btn" onClick={handleTriggerDownload}>
                      <Download size={14} />
                      <span>Download Video</span>
                    </button>
                  )}
                </div>
              ) : (
                <video
                  key={viewerData.url}
                  src={viewerData.url}
                  controls
                  autoPlay
                  playsInline
                  className="ufv-video-el"
                  onError={() =>
                    setMediaLoadError(
                      `Your browser could not decode this .${ext || 'video'} stream directly. Try converting to MP4/WebM or download the file.`
                    )
                  }
                />
              )}
            </div>
          ) : viewerData?.kind === 'audio' ? (
            <div className="ufv-center-state">
              <div className="ufv-audio-card">
                <div className="ufv-audio-icon">
                  <Music size={34} color="#2563EB" />
                </div>
                <h4>{displayTitle}</h4>
                <p>{ext.toUpperCase()} Audio Player</p>
                <audio key={viewerData.url} src={viewerData.url} controls autoPlay className="ufv-audio-el" />
              </div>
            </div>
          ) : viewerData?.kind === 'pdf' ? (
            <div className="ufv-pdf-stage">
              <iframe
                src={`${viewerData.url}#view=FitH`}
                title={displayTitle}
                className="ufv-pdf-frame"
              />
            </div>
          ) : viewerData?.kind === 'excel' ? (
            <div className="ufv-excel-stage">
              <div className="ufv-excel-topbar">
                <div className="ufv-sheet-tabs" role="tablist">
                  {viewerData.sheets.map((sheet, idx) => (
                    <button
                      key={sheet.name}
                      id={`ufv-sheet-tab-${idx}`}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeSheetIdx}
                      className={`ufv-sheet-tab ${idx === activeSheetIdx ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSheetIdx(idx);
                        setSheetSearch('');
                      }}
                    >
                      <FileSpreadsheet size={13} />
                      <span>{sheet.name}</span>
                    </button>
                  ))}
                </div>
                <div className="ufv-excel-controls">
                  <span className="ufv-excel-stats">
                    {currentSheet?.totalRows || 0} rows &times; {currentSheet?.colCount || 0} cols
                    {currentSheet?.truncatedRows > 0 ? ` (showing first 1,500)` : ''}
                  </span>
                  <div className="ufv-excel-search">
                    <Search size={13} />
                    <input
                      type="text"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      placeholder="Filter rows..."
                    />
                  </div>
                </div>
              </div>

              <div className="ufv-excel-table-wrap">
                {filteredSheetRows.length === 0 ? (
                  <div className="ufv-empty-inline">
                    <p>{sheetSearch ? 'No spreadsheet rows match your search.' : 'This worksheet is empty.'}</p>
                  </div>
                ) : (
                  <table className="ufv-excel-table">
                    <thead>
                      <tr>
                        <th className="ufv-excel-rownum">#</th>
                        {Array.from({ length: currentSheet.colCount }).map((_, cIdx) => (
                          <th key={cIdx}>{columnIndexToLetter(cIdx)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSheetRows.map((entry, rIdx) => (
                        <tr key={entry.rowNum} className={rIdx === 0 && !sheetSearch ? 'ufv-excel-first-row' : ''}>
                          <td className="ufv-excel-rownum">{entry.rowNum}</td>
                          {Array.from({ length: currentSheet.colCount }).map((_, cIdx) => (
                            <td key={cIdx}>{entry.cells[cIdx] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : viewerData?.kind === 'ppt' ? (
            <div className="ufv-ppt-stage">
              <div className="ufv-ppt-layout">
                {/* Slide Outline Sidebar */}
                <div className="ufv-ppt-sidebar">
                  <div className="ufv-ppt-sidebar-head">
                    Slides ({viewerData.slides.length})
                  </div>
                  <div className="ufv-ppt-thumb-list">
                    {viewerData.slides.map((slide, idx) => (
                      <button
                        key={slide.number}
                        id={`ufv-ppt-thumb-${idx}`}
                        type="button"
                        className={`ufv-ppt-thumb ${idx === activeSlideIdx ? 'active' : ''}`}
                        onClick={() => setActiveSlideIdx(idx)}
                      >
                        <span className="ufv-ppt-thumb-num">{slide.number}</span>
                        <span className="ufv-ppt-thumb-title">{slide.title || `Slide ${slide.number}`}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Slide Canvas */}
                <div className="ufv-ppt-main">
                  <div className="ufv-ppt-controls">
                    <div className="ufv-ppt-nav">
                      <button
                        id="ufv-ppt-prev-btn"
                        type="button"
                        className="ufv-ppt-nav-btn"
                        onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                        disabled={activeSlideIdx === 0}
                      >
                        <ChevronLeft size={15} />
                        <span>Previous</span>
                      </button>
                      <span className="ufv-ppt-counter">
                        Slide {activeSlideIdx + 1} of {viewerData.slides.length}
                      </span>
                      <button
                        id="ufv-ppt-next-btn"
                        type="button"
                        className="ufv-ppt-nav-btn"
                        onClick={() => setActiveSlideIdx((i) => Math.min(viewerData.slides.length - 1, i + 1))}
                        disabled={activeSlideIdx >= viewerData.slides.length - 1}
                      >
                        <span>Next</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    {currentSlide?.notes && (
                      <button
                        type="button"
                        className={`ufv-ppt-notes-toggle ${showNotes ? 'active' : ''}`}
                        onClick={() => setShowNotes((n) => !n)}
                      >
                        {showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes'}
                      </button>
                    )}
                  </div>

                  <div className="ufv-ppt-canvas-scroll">
                    {currentSlide && (
                      <div
                        className="ufv-ppt-slide-card"
                        style={{
                          aspectRatio: viewerData.aspectRatio || '16 / 9',
                          background: currentSlide.backgroundColor || '#FFFFFF'
                        }}
                      >
                        <div className="ufv-ppt-slide-inner">
                          {currentSlide.blocks.length === 0 &&
                            currentSlide.images.length === 0 &&
                            currentSlide.tables.length === 0 && (
                              <div className="ufv-empty-inline">
                                <Presentation size={32} color="#94A3B8" />
                                <p>Slide {currentSlide.number} contains no extractable text or images.</p>
                              </div>
                            )}

                          {currentSlide.blocks.map((block, bIdx) => (
                            <div
                              key={bIdx}
                              className={`ufv-ppt-block ${block.isTitle ? 'is-title' : block.isSubTitle ? 'is-subtitle' : ''}`}
                            >
                              {block.paragraphs.map((p, pIdx) => (
                                <p
                                  key={pIdx}
                                  className="ufv-ppt-para"
                                  style={{
                                    paddingLeft: `${Math.min(p.level || 0, 4) * 18}px`,
                                    fontWeight: p.bold ? 700 : 400,
                                    color: p.color || undefined,
                                    fontSize: p.fontSizePt ? `${Math.min(Math.max(p.fontSizePt, 12), 34)}px` : undefined
                                  }}
                                >
                                  {!block.isTitle && !block.isSubTitle && block.paragraphs.length > 1 ? '• ' : ''}
                                  {p.text}
                                </p>
                              ))}
                            </div>
                          ))}

                          {currentSlide.tables.map((tbl, tIdx) => (
                            <div key={tIdx} className="ufv-ppt-table-wrap">
                              <table className="ufv-ppt-table">
                                <tbody>
                                  {tbl.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx}>{cell}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}

                          {currentSlide.images.length > 0 && (
                            <div className="ufv-ppt-images-grid">
                              {currentSlide.images.map((img, iIdx) => (
                                <img key={iIdx} src={img.url} alt={img.name || `Slide asset ${iIdx + 1}`} className="ufv-ppt-slide-img" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentSlide?.notes && showNotes && (
                      <div className="ufv-ppt-notes-box">
                        <strong>Speaker Notes</strong>
                        <p>{currentSlide.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : viewerData?.kind === 'word' ? (
            <div className="ufv-word-stage">
              <div className="ufv-word-paper">
                {viewerData.wordData?.kind === 'html' ? (
                  <div
                    className="ufv-word-html"
                    dangerouslySetInnerHTML={{ __html: viewerData.wordData.html }}
                  />
                ) : (
                  <div className="ufv-word-paragraphs">
                    {(viewerData.wordData?.paragraphs || []).map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : viewerData?.kind === 'text' ? (
            <div className="ufv-text-stage">
              <div className="ufv-text-meta-bar">
                <span>{viewerData.lineCount} lines</span>
                {viewerData.truncated && <span>Showing first 250 KB</span>}
              </div>
              <pre className={`ufv-text-pre ${wordWrap ? 'wrap' : 'nowrap'}`}>
                {viewerData.text || '(Empty file)'}
              </pre>
            </div>
          ) : viewerData?.kind === 'archive' ? (
            <div className="ufv-archive-stage">
              <div className="ufv-archive-summary">
                <Package size={18} color="#2563EB" />
                <span>
                  Package Archive Contents: <strong>{viewerData.totalCount}</strong> entries
                  {viewerData.truncatedCount > 0 ? ` (showing first 400)` : ''}
                </span>
              </div>
              <div className="ufv-archive-table-wrap">
                <table className="ufv-archive-table">
                  <thead>
                    <tr>
                      <th>Path inside Archive</th>
                      <th style={{ textAlign: 'right' }}>Uncompressed Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewerData.entries.map((entry) => (
                      <tr key={entry.name}>
                        <td className="ufv-archive-path">{entry.name}</td>
                        <td style={{ textAlign: 'right' }}>{entry.isDir ? 'Folder' : entry.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="ufv-center-state">
              <div className="ufv-error-card">
                <FileText size={40} color="#2563EB" />
                <h4>{displayTitle}</h4>
                <p>
                  This binary format ({(ext || file.file_type || 'FILE').toUpperCase()}) cannot be rendered interactively. Use Download to save a local copy.
                </p>
                {showDownload && (
                  <button type="button" className="ufv-download-btn" onClick={handleTriggerDownload}>
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
