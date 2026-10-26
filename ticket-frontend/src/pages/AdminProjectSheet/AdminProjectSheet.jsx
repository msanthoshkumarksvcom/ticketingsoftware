import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import {
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  Rows,
  Search,
  X,
  AlertTriangle,
  FolderKanban,
  LogOut
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import './AdminProjectSheet.css';

// Letters for columns: A, B, C, ... Z, AA, AB...
const getColLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Fallback starter sheets if backend is offline or empty
const FALLBACK_STARTER_SHEETS = [
  {
    id: 1,
    sheet_name: 'Test Execution Sheet',
    columns: [
      { id: 'col_id', label: 'TC ID', width: 110, type: 'text' },
      { id: 'col_title', label: 'Test Case Title', width: 260, type: 'text' },
      { id: 'col_module', label: 'Module', width: 140, type: 'text' },
      { id: 'col_priority', label: 'Priority', width: 120, type: 'priority' },
      { id: 'col_steps', label: 'Test Steps / Precondition', width: 280, type: 'text' },
      { id: 'col_expected', label: 'Expected Result', width: 240, type: 'text' },
      { id: 'col_status', label: 'Status', width: 130, type: 'status' },
      { id: 'col_assigned', label: 'Assigned QA', width: 160, type: 'text' },
      { id: 'col_date', label: 'Execution Date', width: 130, type: 'date' }
    ],
    rows: [
      {
        id: 'row-1',
        col_id: 'TC-001',
        col_title: 'Verify user login with valid credentials',
        col_module: 'Authentication',
        col_priority: 'High',
        col_steps: '1. Enter email, 2. Enter valid password, 3. Click Login',
        col_expected: 'User redirected to role workspace with active token',
        col_status: 'Pass',
        col_assigned: 'QA Lead',
        col_date: '2026-10-22'
      },
      {
        id: 'row-2',
        col_id: 'TC-002',
        col_title: 'Sheet inline cell editing and live auto-save',
        col_module: 'Sheet Module',
        col_priority: 'Critical',
        col_steps: '1. Double-click cell, 2. Enter value, 3. Press Enter',
        col_expected: 'Cell updates instantly and syncs with database',
        col_status: 'Pass',
        col_assigned: 'Automation QA',
        col_date: '2026-10-23'
      },
      {
        id: 'row-3',
        col_id: 'TC-003',
        col_title: 'Filter test cases by status in spreadsheet table',
        col_module: 'Spreadsheet Grid',
        col_priority: 'Medium',
        col_steps: '1. Click filter, 2. Choose status = Fail, 3. View table',
        col_expected: 'Table displays only matching test case rows',
        col_status: 'Pass',
        col_assigned: 'Tester 1',
        col_date: '2026-10-23'
      },
      {
        id: 'row-4',
        col_id: 'TC-004',
        col_title: 'Export sheet data to CSV formatted spreadsheet',
        col_module: 'Export / Import',
        col_priority: 'High',
        col_steps: '1. Click Export CSV button on sheet toolbar',
        col_expected: 'CSV file generated with all headers and row entries',
        col_status: 'In Progress',
        col_assigned: 'QA Lead',
        col_date: '2026-10-23'
      },
      {
        id: 'row-5',
        col_id: 'TC-005',
        col_title: 'Formula calculation for pass percentage and totals',
        col_module: 'Summary Bar',
        col_priority: 'Medium',
        col_steps: '1. Inspect bottom formula status bar',
        col_expected: 'Displays accurate Pass Rate %, total test count',
        col_status: 'Untested',
        col_assigned: 'QA Engineer',
        col_date: '2026-10-24'
      }
    ]
  },
  {
    id: 2,
    sheet_name: 'Requirements Matrix',
    columns: [
      { id: 'col_req_id', label: 'Req ID', width: 110, type: 'text' },
      { id: 'col_feature', label: 'Feature Description', width: 280, type: 'text' },
      { id: 'col_biz_priority', label: 'Business Priority', width: 140, type: 'priority' },
      { id: 'col_qa_lead', label: 'QA Lead', width: 160, type: 'text' },
      { id: 'col_dev_lead', label: 'Dev Lead', width: 160, type: 'text' },
      { id: 'col_coverage', label: 'Coverage Status', width: 150, type: 'status' },
      { id: 'col_signoff', label: 'Sign-Off Status', width: 140, type: 'status' }
    ],
    rows: [
      {
        id: 'row-1',
        col_req_id: 'REQ-01',
        col_feature: 'Spreadsheet-like Project Sheet View with inline edits',
        col_biz_priority: 'Critical',
        col_qa_lead: 'Santhosh',
        col_dev_lead: 'Karthikeyan',
        col_coverage: 'Pass',
        col_signoff: 'Pass'
      },
      {
        id: 'row-2',
        col_req_id: 'REQ-02',
        col_feature: 'Dedicated Project Sheets Module with custom columns & tabs',
        col_biz_priority: 'High',
        col_qa_lead: 'Manikandan',
        col_dev_lead: 'Pavishek',
        col_coverage: 'Pass',
        col_signoff: 'In Progress'
      }
    ]
  },
  {
    id: 3,
    sheet_name: 'Defect Log',
    columns: [
      { id: 'col_bug_id', label: 'Defect ID', width: 110, type: 'text' },
      { id: 'col_summary', label: 'Defect Summary', width: 300, type: 'text' },
      { id: 'col_severity', label: 'Severity', width: 130, type: 'priority' },
      { id: 'col_repro', label: 'Reproducibility', width: 140, type: 'text' },
      { id: 'col_status', label: 'Defect Status', width: 140, type: 'status' },
      { id: 'col_assigned_dev', label: 'Assigned Engineer', width: 170, type: 'text' },
      { id: 'col_target', label: 'Target Release', width: 130, type: 'text' }
    ],
    rows: [
      {
        id: 'row-1',
        col_bug_id: 'DEF-101',
        col_summary: 'Ensure table cell focus outline doesn\'t overflow table border',
        col_severity: 'Low',
        col_repro: 'Consistent',
        col_status: 'Pass',
        col_assigned_dev: 'Frontend Team',
        col_target: 'v1.0.1'
      }
    ]
  }
];

export default function AdminProjectSheet() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Project metadata
  const [project, setProject] = useState(() => location.state?.project || {
    id: projectId || 1,
    project_code: `PRJ-${projectId || '01'}`,
    name: 'Project Sheet Workspace',
    lead_name: 'Lead Tester',
    status: 'In Progress'
  });

  // Sheets data
  const [sheets, setSheets] = useState(FALLBACK_STARTER_SHEETS);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Active cell and editing state
  const [activeCell, setActiveCell] = useState({ rowIndex: 0, colId: 'col_title' });
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, colId }
  const [editValue, setEditValue] = useState('');
  const [formulaValue, setFormulaValue] = useState('');
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState('left');

  // Cloud save status
  const [cloudStatus, setCloudStatus] = useState('saved'); // 'saved' | 'saving'

  // Modals
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const cellInputRef = useRef(null);

  // Active Sheet Object
  const currentSheet = sheets[activeSheetIndex] || sheets[0] || { columns: [], rows: [] };
  const currentColumns = currentSheet.columns || [];
  const currentRows = currentSheet.rows || [];

  // Filtered rows for in-sheet search
  const visibleRows = useMemo(() => {
    if (!searchFilter.trim()) return currentRows;
    const q = searchFilter.toLowerCase();
    return currentRows.filter((r) => {
      return Object.values(r).some((val) => String(val).toLowerCase().includes(q));
    });
  }, [currentRows, searchFilter]);

  // Active column definition & coordinate (e.g. "B2")
  const activeColIndex = useMemo(() => {
    return currentColumns.findIndex((c) => c.id === activeCell.colId);
  }, [currentColumns, activeCell.colId]);

  const activeCoord = useMemo(() => {
    const letter = getColLetter(activeColIndex >= 0 ? activeColIndex : 0);
    const rowNum = activeCell.rowIndex + 1;
    return `${letter}${rowNum}`;
  }, [activeColIndex, activeCell.rowIndex]);

  // Load sheets from backend API or localStorage
  const loadProjectSheets = useCallback(async () => {
    const token = localStorage.getItem('token');
    const localKey = `pjs_sheets_${projectId}`;

    if (token) {
      try {
        const res = await axios.get(`http://localhost:5000/api/admin/projects/${projectId}/sheets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          if (res.data.project) setProject(res.data.project);
          if (Array.isArray(res.data.sheets) && res.data.sheets.length > 0) {
            setSheets(res.data.sheets);
            localStorage.setItem(localKey, JSON.stringify(res.data.sheets));
            return;
          }
        }
      } catch (err) {
        console.warn('Backend sheets API not reachable, loading fallback cache:', err.message);
      }
    }

    // Local storage fallback
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        setSheets(JSON.parse(cached));
      } catch (e) {
        setSheets(FALLBACK_STARTER_SHEETS);
      }
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectSheets();
  }, [loadProjectSheets]);

  // Sync active cell value to formula bar
  useEffect(() => {
    const targetRow = visibleRows[activeCell.rowIndex];
    if (targetRow && activeCell.colId) {
      const val = targetRow[activeCell.colId] ?? '';
      setFormulaValue(String(val));
    }
  }, [activeCell, visibleRows]);

  // Auto focus input in edit mode
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      if (cellInputRef.current.select) cellInputRef.current.select();
    }
  }, [editingCell]);

  // Save current sheet to backend & localStorage
  const persistSheetChanges = async (updatedSheets) => {
    setCloudStatus('saving');
    const localKey = `pjs_sheets_${projectId}`;
    localStorage.setItem(localKey, JSON.stringify(updatedSheets));

    const token = localStorage.getItem('token');
    const targetSheet = updatedSheets[activeSheetIndex];
    if (token && targetSheet?.id) {
      try {
        await axios.put(
          `http://localhost:5000/api/admin/projects/${projectId}/sheets/${targetSheet.id}`,
          {
            sheet_name: targetSheet.sheet_name,
            columns: targetSheet.columns,
            rows: targetSheet.rows
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn('Could not sync to cloud, stored locally:', err.message);
      }
    }

    setTimeout(() => {
      setCloudStatus('saved');
    }, 400);
  };

  // Commit Cell Edit
  const commitEdit = (rowIndex, colId, newVal) => {
    const row = visibleRows[rowIndex];
    if (!row) {
      setEditingCell(null);
      return;
    }

    if (row[colId] === newVal) {
      setEditingCell(null);
      return;
    }

    const updatedRows = currentRows.map((r) => {
      if (r.id === row.id) {
        return { ...r, [colId]: newVal };
      }
      return r;
    });

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      rows: updatedRows
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setEditingCell(null);
  };

  // Start cell editing
  const startEditing = (rowIndex, colId) => {
    const row = visibleRows[rowIndex];
    if (!row) return;

    setEditValue(String(row[colId] ?? ''));
    setEditingCell({ rowIndex, colId });
    setActiveCell({ rowIndex, colId });
  };

  // Cell click
  const handleCellClick = (rowIndex, colId) => {
    const row = visibleRows[rowIndex];
    if (row) setSelectedRowId(row.id);

    if (activeCell.rowIndex === rowIndex && activeCell.colId === colId) {
      startEditing(rowIndex, colId);
    } else {
      setActiveCell({ rowIndex, colId });
      setEditingCell(null);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colId, editValue);
        if (editingCell.rowIndex < visibleRows.length - 1) {
          setActiveCell({ rowIndex: editingCell.rowIndex + 1, colId: editingCell.colId });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit(editingCell.rowIndex, editingCell.colId, editValue);
        const nextIdx = (activeColIndex + 1) % currentColumns.length;
        setActiveCell({ rowIndex: editingCell.rowIndex, colId: currentColumns[nextIdx].id });
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
      return;
    }

    const { rowIndex, colId } = activeCell;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < visibleRows.length - 1) {
        setActiveCell({ rowIndex: rowIndex + 1, colId });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        setActiveCell({ rowIndex: rowIndex - 1, colId });
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeColIndex < currentColumns.length - 1) {
        setActiveCell({ rowIndex, colId: currentColumns[activeColIndex + 1].id });
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeColIndex > 0) {
        setActiveCell({ rowIndex, colId: currentColumns[activeColIndex - 1].id });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEditing(rowIndex, colId);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      commitEdit(rowIndex, colId, '');
    }
  };

  // Add Row
  const handleAddRow = (position = 'bottom') => {
    const newId = `row-${Date.now()}`;
    const newRow = { id: newId };
    currentColumns.forEach((col) => {
      newRow[col.id] = col.type === 'status' ? 'Untested' : '';
    });

    let updatedRows = [...currentRows];
    if (position === 'bottom') {
      updatedRows.push(newRow);
    } else if (position === 'above') {
      updatedRows.splice(activeCell.rowIndex, 0, newRow);
    } else if (position === 'below') {
      updatedRows.splice(activeCell.rowIndex + 1, 0, newRow);
    }

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    // Focus new row
    const targetIdx = position === 'bottom' ? updatedRows.length - 1 : activeCell.rowIndex;
    setActiveCell({ rowIndex: targetIdx, colId: currentColumns[0]?.id || 'col_title' });
  };

  // Delete Row
  const handleDeleteRow = () => {
    if (currentRows.length === 0) return;
    const rowToDelete = visibleRows[activeCell.rowIndex];
    if (!rowToDelete) return;

    const updatedRows = currentRows.filter((r) => r.id !== rowToDelete.id);
    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, rows: updatedRows };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    if (activeCell.rowIndex >= updatedRows.length && updatedRows.length > 0) {
      setActiveCell({ rowIndex: updatedRows.length - 1, colId: activeCell.colId });
    }
  };

  // Add Column
  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;

    const newColId = `col_${Date.now()}`;
    const newCol = {
      id: newColId,
      label: newColLabel.trim(),
      width: 150,
      type: newColType
    };

    const updatedColumns = [...currentColumns, newCol];
    const updatedRows = currentRows.map((r) => ({
      ...r,
      [newColId]: newColType === 'status' ? 'Untested' : ''
    }));

    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = {
      ...currentSheet,
      columns: updatedColumns,
      rows: updatedRows
    };

    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setShowAddColModal(false);
    setNewColLabel('');
    setNewColType('text');
  };

  // Delete Column
  const handleDeleteColumn = (colId) => {
    if (currentColumns.length <= 1) {
      alert('A sheet must have at least one column.');
      return;
    }
    const updatedColumns = currentColumns.filter((c) => c.id !== colId);
    const updatedSheets = [...sheets];
    updatedSheets[activeSheetIndex] = { ...currentSheet, columns: updatedColumns };
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);

    if (activeCell.colId === colId) {
      setActiveCell({ rowIndex: activeCell.rowIndex, colId: updatedColumns[0].id });
    }
  };

  // Add New Sheet Tab
  const handleAddSheetTab = () => {
    const sheetName = prompt('Enter name for the new sheet tab:', `Sheet ${sheets.length + 1}`);
    if (!sheetName || !sheetName.trim()) return;

    const newSheet = {
      id: Date.now(),
      sheet_name: sheetName.trim(),
      columns: [
        { id: 'col_a', label: 'Item / ID', width: 120, type: 'text' },
        { id: 'col_b', label: 'Title / Description', width: 260, type: 'text' },
        { id: 'col_c', label: 'Category', width: 140, type: 'text' },
        { id: 'col_status', label: 'Status', width: 130, type: 'status' }
      ],
      rows: [
        { id: 'row-1', col_a: '01', col_b: 'Sample row entry', col_c: 'General', col_status: 'Untested' }
      ]
    };

    const updatedSheets = [...sheets, newSheet];
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setActiveSheetIndex(updatedSheets.length - 1);
  };

  // Delete Current Sheet Tab
  const handleDeleteTab = (index, e) => {
    e.stopPropagation();
    if (sheets.length <= 1) {
      alert('Cannot delete the last sheet tab.');
      return;
    }
    if (!window.confirm(`Delete sheet "${sheets[index].sheet_name}"?`)) return;

    const updatedSheets = sheets.filter((_, idx) => idx !== index);
    setSheets(updatedSheets);
    persistSheetChanges(updatedSheets);
    setActiveSheetIndex(Math.max(0, index - 1));
  };

  // Export Sheet to CSV
  const handleExportCSV = () => {
    if (currentRows.length === 0) return;
    const headers = currentColumns.map((c) => `"${c.label}"`);
    const csvContent = [headers.join(',')];

    currentRows.forEach((r) => {
      const row = currentColumns.map((c) => `"${String(r[c.id] ?? '').replace(/"/g, '""')}"`);
      csvContent.push(row.join(','));
    });

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project.project_code || 'Project'}_${currentSheet.sheet_name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real-Time QA Metrics Calculations
  const qaMetrics = useMemo(() => {
    const total = currentRows.length;
    let pass = 0;
    let fail = 0;
    let blocked = 0;
    let inProgress = 0;
    let untested = 0;

    currentRows.forEach((r) => {
      const statusVal = (r.col_status || r.status || '').toLowerCase();
      if (statusVal === 'pass') pass++;
      else if (statusVal === 'fail') fail++;
      else if (statusVal === 'blocked') blocked++;
      else if (statusVal === 'in progress' || statusVal === 'inprogress') inProgress++;
      else untested++;
    });

    const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
    const failRate = total > 0 ? Math.round((fail / total) * 100) : 0;
    const blockedRate = total > 0 ? Math.round((blocked / total) * 100) : 0;

    return { total, pass, fail, blocked, inProgress, untested, passRate, failRate, blockedRate };
  }, [currentRows]);

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userDepartment');
    navigate('/', { replace: true });
  };

  return (
    <div className="pjs-layout">
      {showLogoutModal && (
        <div className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLogoutModal(false);
        }}>
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="sheet-logout-title">
            <div className="modal-icon"><LogOut size={21} /></div>
            <h2 className="modal-title" id="sheet-logout-title">Sign out of your workspace?</h2>
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
      )}
      <AdminSidebar defaultCollapsed onLogout={() => setShowLogoutModal(true)} />
      <main className="pjs-main" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* 1. Header Bar */}
        <header className="pjs-header">
          <div className="pjs-header-left">
            <button
              className="pjs-back-btn"
              onClick={() => navigate(`/admin/projects/${projectId}`, { state: { project } })}
              title="Back to Project workspace"
            >
              <ArrowLeft size={16} />
              <span>Projects</span>
            </button>

            <div className="pjs-breadcrumb">
              <span>Workspace</span>
              <span>/</span>
              <span>Projects</span>
              <span>/</span>
              <span className="pjs-breadcrumb-curr">{project.name}</span>
              <span>/</span>
              <span style={{ color: '#107c41', fontWeight: 700 }}>Sheet Module</span>
            </div>
          </div>

          <div className="pjs-header-right">
            <div className="pjs-proj-badge">
              <span className="pjs-proj-code">{project.project_code}</span>
              <span className="pjs-proj-title">{project.name}</span>
            </div>
          </div>
        </header>

        <section className="pjs-qa-overview" aria-label="Sheet quality summary">
          <div className="pjs-qa-stat total">
            <span className="pjs-qa-stat-icon"><FileSpreadsheet size={17} /></span>
            <span><small>Test cases</small><strong>{qaMetrics.total}</strong></span>
          </div>
          <div className="pjs-qa-stat pass">
            <span className="pjs-qa-stat-icon"><CheckCircle2 size={17} /></span>
            <span><small>Pass rate</small><strong>{qaMetrics.passRate}%</strong></span>
          </div>
          <div className="pjs-qa-stat fail">
            <span className="pjs-qa-stat-icon"><AlertTriangle size={17} /></span>
            <span><small>Issues</small><strong>{qaMetrics.fail + qaMetrics.blocked}</strong></span>
          </div>
          <div className="pjs-qa-stat pending">
            <span className="pjs-qa-stat-icon"><Clock size={17} /></span>
            <span><small>Needs testing</small><strong>{qaMetrics.untested + qaMetrics.inProgress}</strong></span>
          </div>
        </section>

        {/* 2. Sheet heading and toolbar */}
        <div className="pjs-ribbon-bar">
          <div className="pjs-menu-row">
            <div className="pjs-sheet-heading">
              <span className="pjs-sheet-eyebrow">PROJECT SHEET</span>
              <h1>{currentSheet.sheet_name || 'Untitled sheet'}</h1>
              <p>{currentRows.length} test cases <span>·</span> {currentColumns.length} columns</p>
            </div>

            <div className={`pjs-cloud-status ${cloudStatus === 'saving' ? 'saving' : ''}`}>
              {cloudStatus === 'saving' ? (
                <>
                  <Clock size={13} />
                  <span>Saving to cloud...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>All changes saved to cloud</span>
                </>
              )}
            </div>
          </div>

          {/* Action Toolbar buttons */}
          <div className="pjs-toolbar-row">
            <div className="pjs-toolbar-group">
              <button
                className={`pjs-tool-btn ${isBold ? 'active' : ''}`}
                onClick={() => setIsBold(!isBold)}
                title="Bold (Ctrl+B)"
              >
                <Bold size={14} />
              </button>
              <button
                className={`pjs-tool-btn ${isItalic ? 'active' : ''}`}
                onClick={() => setIsItalic(!isItalic)}
                title="Italic (Ctrl+I)"
              >
                <Italic size={14} />
              </button>

              <div className="pjs-tool-divider" />

              <button
                className={`pjs-tool-btn ${textAlign === 'left' ? 'active' : ''}`}
                onClick={() => setTextAlign('left')}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                className={`pjs-tool-btn ${textAlign === 'center' ? 'active' : ''}`}
                onClick={() => setTextAlign('center')}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                className={`pjs-tool-btn ${textAlign === 'right' ? 'active' : ''}`}
                onClick={() => setTextAlign('right')}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
            </div>

            <div className="pjs-toolbar-group">
              <div className="pjs-sheet-search">
                <Search size={13} color="#64748b" />
                <input
                  type="text"
                  placeholder="Find in sheet..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>

              <button className="pjs-action-pill-btn success" onClick={() => handleAddRow('bottom')} title="Add row at bottom">
                <Plus size={14} strokeWidth={2.5} />
                <span>Add row</span>
              </button>

              <button className="pjs-action-pill-btn primary" onClick={() => setShowAddColModal(true)} title="Add Column">
                <Columns size={14} />
                <span>Add column</span>
              </button>

              <button className="pjs-action-pill-btn pjs-delete-row-btn" onClick={handleDeleteRow} title="Delete selected row" aria-label="Delete selected row">
                <Trash2 size={13} />
              </button>

              {/* Export to CSV */}
              <button className="pjs-action-pill-btn" onClick={handleExportCSV} title="Export current sheet as CSV">
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Formula Bar (fx) */}
        <div className="pjs-formula-bar">
          <div className="pjs-cell-ref-box" title="Selected cell reference">
            {activeCoord}
          </div>
          <div className="pjs-fx-icon">fx</div>
          <input
            type="text"
            className="pjs-formula-text"
            placeholder="Type value or formula for active cell..."
            value={formulaValue}
            onChange={(e) => setFormulaValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit(activeCell.rowIndex, activeCell.colId, formulaValue);
              }
            }}
            onBlur={() => commitEdit(activeCell.rowIndex, activeCell.colId, formulaValue)}
          />
        </div>

        {/* 4. The Spreadsheet Grid */}
        <div className="pjs-grid-viewport">
          <table className="pjs-table">
            <thead>
              {/* Column Letter Headers (A, B, C...) */}
              <tr className="pjs-col-letter-row">
                <th className="pjs-row-num-cell">#</th>
                {currentColumns.map((col, cIdx) => (
                  <th key={col.id} style={{ width: col.width }}>
                    {getColLetter(cIdx)}
                  </th>
                ))}
              </tr>

              {/* Column Name Headers */}
              <tr className="pjs-col-name-row">
                <th className="pjs-row-num-cell">Row</th>
                {currentColumns.map((col) => (
                  <th key={col.id} style={{ width: col.width }}>
                    <div className="pjs-col-header-inner">
                      <span>{col.label}</span>
                      <button
                        className="pjs-col-del-btn"
                        onClick={() => handleDeleteColumn(col.id)}
                        title={`Delete column ${col.label}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rIdx) => {
                const isSelected = selectedRowId === row.id;

                return (
                  <tr key={row.id || rIdx} className={`pjs-row ${isSelected ? 'selected' : ''}`}>
                    {/* Row Index Number (1, 2, 3...) */}
                    <td
                      className="pjs-row-num-cell"
                      onClick={() => {
                        setSelectedRowId(row.id);
                        setActiveCell({ rowIndex: rIdx, colId: currentColumns[0]?.id });
                      }}
                    >
                      {rIdx + 1}
                    </td>

                    {/* Cells */}
                    {currentColumns.map((col) => {
                      const isActive = activeCell.rowIndex === rIdx && activeCell.colId === col.id;
                      const isEditing = editingCell?.rowIndex === rIdx && editingCell?.colId === col.id;
                      const rawVal = row[col.id] ?? '';

                      return (
                        <td
                          key={col.id}
                          className={`pjs-cell ${isActive ? 'active' : ''}`}
                          onClick={() => handleCellClick(rIdx, col.id)}
                          onDoubleClick={() => startEditing(rIdx, col.id)}
                          style={{ width: col.width }}
                        >
                          {isEditing ? (
                            col.type === 'status' ? (
                              <select
                                ref={cellInputRef}
                                className="pjs-cell-select"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  commitEdit(rIdx, col.id, e.target.value);
                                }}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              >
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                                <option value="Blocked">Blocked</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Untested">Untested</option>
                              </select>
                            ) : col.type === 'priority' ? (
                              <select
                                ref={cellInputRef}
                                className="pjs-cell-select"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  commitEdit(rIdx, col.id, e.target.value);
                                }}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              >
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            ) : (
                              <input
                                ref={cellInputRef}
                                type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                                className="pjs-cell-editor"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(rIdx, col.id, editValue)}
                              />
                            )
                          ) : col.type === 'status' ? (
                            <div className="pjs-cell-content" style={{ justifyContent: textAlign }}>
                              <span className={`pjs-status-chip ${String(rawVal).toLowerCase().replace(/\s+/g, '')}`}>
                                {rawVal || 'Untested'}
                              </span>
                            </div>
                          ) : col.type === 'priority' ? (
                            <div className="pjs-cell-content" style={{ justifyContent: textAlign }}>
                              <span className={`pjs-priority-chip ${String(rawVal).toLowerCase()}`}>
                                {rawVal || 'Medium'}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="pjs-cell-content"
                              style={{
                                justifyContent: textAlign,
                                fontWeight: isBold ? 700 : 400,
                                fontStyle: isItalic ? 'italic' : 'normal'
                              }}
                            >
                              {rawVal}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Quick Add Row banner at bottom */}
          <button className="pjs-add-row-btn" onClick={() => handleAddRow('bottom')}>
            <Plus size={15} />
            <span>Click to add new row to this sheet</span>
          </button>
        </div>

        {/* 5. Bottom Tabs & QA Calculations Bar */}
        <div className="pjs-bottom-bar">
          {/* Sheet Tabs */}
          <div className="pjs-sheet-tabs">
            {sheets.map((sh, idx) => (
              <button
                key={sh.id || idx}
                className={`pjs-sheet-tab ${activeSheetIndex === idx ? 'active' : ''}`}
                onClick={() => {
                  setActiveSheetIndex(idx);
                  setActiveCell({ rowIndex: 0, colId: sheets[idx]?.columns?.[0]?.id || 'col_title' });
                }}
              >
                <span>{sh.sheet_name}</span>
                {sheets.length > 1 && (
                  <span className="pjs-sheet-tab-close" onClick={(e) => handleDeleteTab(idx, e)} title="Delete tab">
                    <X size={11} />
                  </span>
                )}
              </button>
            ))}

            <button className="pjs-add-tab-btn" onClick={handleAddSheetTab} title="Add new sheet tab">
              <Plus size={16} />
            </button>
          </div>

          {/* Real-Time QA Metrics Calculations Bar */}
          <div className="pjs-calc-summary-bar">
            <div>
              Total: <strong>{qaMetrics.total}</strong>
            </div>

            <div className="pjs-calc-stat pass">
              Pass: <strong>{qaMetrics.pass}</strong> ({qaMetrics.passRate}%)
            </div>

            <div className="pjs-calc-stat fail">
              Fail: <strong>{qaMetrics.fail}</strong>
            </div>

            <div className="pjs-calc-stat blocked">
              Blocked: <strong>{qaMetrics.blocked}</strong>
            </div>

            <div>
              Untested: <strong>{qaMetrics.untested}</strong>
            </div>

            {/* Visual Progress Bar */}
            <div className="pjs-progress-wrap" title={`Pass: ${qaMetrics.passRate}% | Fail: ${qaMetrics.failRate}%`}>
              <div className="pjs-progress-bar pass" style={{ width: `${qaMetrics.passRate}%` }} />
              <div className="pjs-progress-bar fail" style={{ width: `${qaMetrics.failRate}%` }} />
              <div className="pjs-progress-bar blocked" style={{ width: `${qaMetrics.blockedRate}%` }} />
            </div>
          </div>
        </div>
      </main>

      {/* Add Column Modal */}
      {showAddColModal && (
        <div className="pjs-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowAddColModal(false)}>
          <div className="pjs-modal-box">
            <div className="pjs-modal-header">
              <h3 className="pjs-modal-title">Insert New Column</h3>
              <button className="pjs-modal-close" onClick={() => setShowAddColModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddColumnSubmit}>
              <div className="pjs-form-group">
                <label>Column Header Name</label>
                <input
                  type="text"
                  placeholder="e.g. Expected Result, Jira Ticket, Build Number"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="pjs-form-group">
                <label>Column Data Type</label>
                <select value={newColType} onChange={(e) => setNewColType(e.target.value)}>
                  <option value="text">Text (General string)</option>
                  <option value="status">Status Badge (Pass, Fail, Blocked, Untested)</option>
                  <option value="priority">Priority Badge (Critical, High, Medium, Low)</option>
                  <option value="date">Date Picker (YYYY-MM-DD)</option>
                  <option value="number">Number</option>
                </select>
              </div>

              <div className="pjs-modal-actions">
                <button type="button" className="pjs-action-pill-btn" onClick={() => setShowAddColModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="pjs-action-pill-btn primary">
                  Insert Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
